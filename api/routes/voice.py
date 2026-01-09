from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from google import genai
import asyncio
from sqlalchemy.orm import Session
from models.user import User
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


@router.websocket("/stream")
async def voice_stream(
    websocket: WebSocket,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    await manager.connect(websocket)

    CONFIG = {
        "response_modalities": ["AUDIO"],
        "system_instruction": f"""
You are a voice-based AI tutor. Your user's name is {current_user.full_name}.
Speak naturally and casually to the user.
"""
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
