import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from google import genai
import asyncio
from sqlalchemy.orm import Session
from models import User, Step, Impact
from core.database import get_db
from core.logging import logger
from utils.tokens import verify_token
from fastapi import HTTPException

router = APIRouter(prefix="/voice", tags=["voice"])

# --- Module-level Google GenAI client ---
try:
    client = genai.Client()
except Exception:
    logger.exception("Failed to create Google GenAI client")
    client = None

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

# --- Connection manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_audio_to_client(self, audio: bytes, websocket: WebSocket):
        await websocket.send_bytes(audio)

manager = ConnectionManager()


async def send_audio_to_gemini(session, audio_queue: asyncio.Queue):
    """Send audio from the client to Gemini in real time."""
    while True:
        audio_chunk = await audio_queue.get()
        await session.send_realtime_input(audio={"data": audio_chunk, "mime_type": "audio/pcm"})


async def receive_audio_from_gemini(session, websocket: WebSocket):
    """Send audio from Gemini back to the client."""
    while True:
        try:
            turn = session.receive()
            async for response in turn:
                if not response.server_content:
                    continue

                model_turn = response.server_content.model_turn
                if not model_turn:
                    continue

                for part in model_turn.parts:
                    if part.inline_data and isinstance(part.inline_data.data, bytes):
                        await manager.send_audio_to_client(part.inline_data.data, websocket)
        except Exception as e:
            logger.exception("Error receiving from Gemini")
            break


def _get_bearer_token(websocket: WebSocket) -> str | None:
    auth_header = websocket.headers.get("authorization")
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


@router.websocket("/stream/{step_id}")
async def voice_stream(
    step_id: str,
    websocket: WebSocket,
    db: Session = Depends(get_db),
):
    token = websocket.query_params.get("token") or _get_bearer_token(websocket)
    if not token:
        await websocket.accept()
        await websocket.close(code=1008, reason="Not authenticated")
        return
    try:
        payload = verify_token(token)
    except HTTPException:
        await websocket.accept()
        await websocket.close(code=1008, reason="Not authenticated")
        return
    user_id = payload.get("sub")
    if not user_id:
        await websocket.accept()
        await websocket.close(code=1008, reason="Not authenticated")
        return

    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        await websocket.accept()
        await websocket.close(code=1008, reason="User not found")
        return

    step = (
        db.query(Step)
        .filter(Step.id == step_id, Step.owner_id == current_user.id)
        .first()
    )
    if not step:
        await websocket.accept()
        await websocket.close(code=1008, reason="Step not found")
        return

    impact = (
        db.query(Impact)
        .filter(Impact.id == step.impact_id, Impact.owner_id == current_user.id)
        .first()
    )
    if not impact:
        await websocket.accept()
        await websocket.close(code=1008, reason="Impact not found")
        return

    prev_step = (
        db.query(Step)
        .filter(
            Step.impact_id == impact.id,
            Step.owner_id == current_user.id,
            Step.order == step.order - 1,
        )
        .first()
    )
    next_step = (
        db.query(Step)
        .filter(
            Step.impact_id == impact.id,
            Step.owner_id == current_user.id,
            Step.order == step.order + 1,
        )
        .first()
    )
    total_steps = (
        db.query(Step)
        .filter(Step.impact_id == impact.id, Step.owner_id == current_user.id)
        .count()
    )

    await manager.connect(websocket)

    # Structured context keeps the model grounded in the current step.
    context_payload = {
        "user": {
            "full_name": current_user.full_name,
            "user_data": current_user.user_data or [],
        },
        "impact": {
            "title": impact.title,
            "description": impact.description,
        },
        "current_step": {
            "order": step.order,
            "title": step.title,
            "description": step.description,
            "icon": step.icon or "",
        },
        "previous_step": (
            {
                "order": prev_step.order,
                "title": prev_step.title,
                "description": prev_step.description,
                "icon": prev_step.icon or "",
            }
            if prev_step
            else None
        ),
        "next_step": (
            {
                "order": next_step.order,
                "title": next_step.title,
                "description": next_step.description,
                "icon": next_step.icon or "",
            }
            if next_step
            else None
        ),
        "progress": {
            "current_order": step.order,
            "total_steps": total_steps,
        },
    }

    context_json = json.dumps(context_payload, ensure_ascii=True)
    CONFIG = {
        "response_modalities": ["AUDIO"],
        "system_instruction": (
            "You are GreenSteps Voice Coach, a precise, high-signal tutor guiding the user "
            "through sustainability steps. Keep responses concise, practical, and friendly. "
            "Use the context JSON strictly; do not invent missing data. "
            "Confirm understanding, suggest the next concrete action, and tie advice back to the "
            "current step. If the user asks about other steps, anchor to previous/next only. "
            "Avoid long preambles and avoid listing the entire plan. "
            "Context JSON:\n"
            f"{context_json}"
        ),
    }

    if client is None:
        logger.error("Closing connection: Google GenAI client is not available")
        await websocket.close(code=1011, reason="Server configuration error for AI client")
        return

    try:
        async with client.aio.live.connect(model=MODEL, config=CONFIG) as live_session:
            logger.info("Gemini Live session started")
            audio_queue_from_client = asyncio.Queue()

            async with asyncio.TaskGroup() as tg:
                tg.create_task(send_audio_to_gemini(live_session, audio_queue_from_client))
                tg.create_task(receive_audio_from_gemini(live_session, websocket))

                # Receive audio from client and queue it
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    await audio_queue_from_client.put(audio_chunk)

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception:
        logger.exception("An error occurred in the voice stream")
    finally:
        manager.disconnect(websocket)
        logger.info("Connection closed and cleaned up")
