import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from google import genai
import asyncio
from sqlalchemy.orm import Session
from models import User, Step, Impact
from api.deps import get_current_active_user
from core.database import get_db

router = APIRouter(prefix="/voice")

# --- Module-level Google GenAI client ---
try:
    client = genai.Client()
except Exception as e:
    print(f"CRITICAL: Failed to create Google GenAI client: {e}")
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
            print(f"Error receiving from Gemini: {e}")
            break


@router.websocket("/stream/{step_id}")
async def voice_stream(
    step_id: str,
    websocket: WebSocket,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
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
        print("Closing connection: Google GenAI client is not available.")
        await websocket.close(code=1011, reason="Server configuration error for AI client")
        return

    try:
        async with client.aio.live.connect(model=MODEL, config=CONFIG) as live_session:
            print("Gemini Live session started.")
            audio_queue_from_client = asyncio.Queue()

            async with asyncio.TaskGroup() as tg:
                tg.create_task(send_audio_to_gemini(live_session, audio_queue_from_client))
                tg.create_task(receive_audio_from_gemini(live_session, websocket))

                # Receive audio from client and queue it
                while True:
                    audio_chunk = await websocket.receive_bytes()
                    await audio_queue_from_client.put(audio_chunk)

    except WebSocketDisconnect:
        print("Client disconnected.")
    except Exception as e:
        print(f"An error occurred in the voice stream: {e}")
    finally:
        manager.disconnect(websocket)
        print("Connection closed and cleaned up.")
