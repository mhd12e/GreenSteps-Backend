from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
import asyncio
import os

router = APIRouter(prefix="/voice")


# --- Live API config ---
# Using the specific preview model that is compatible with the Live API.
MODEL = "gemini-2.5-flash-native-audio-preview-12-2025" 
CONFIG = {
    "response_modalities": ["AUDIO"], 
    "system_instruction": "You are a helpful and friendly AI assistant. Always speak English. Your name is Testing AI API. Intruduce your self on start.",
}

# --- Module-level client instance ---
# This creates a single, reusable client instance when the module is loaded.
# It helps avoid issues with client lifecycle and context within async functions.
# It will automatically use the GOOGLE_API_KEY environment variable.
try:
    client = genai.Client()
except Exception as e:
    print(f"CRITICAL: Failed to create Google GenAI client: {e}")
    client = None

# This is a simplified connection manager for the example.
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
    """Sends audio from an asyncio.Queue to the Gemini session."""
    while True:
        audio_chunk = await audio_queue.get()
        # The Gemini API expects audio data in a specific dictionary format.
        await session.send_realtime_input(audio={"data": audio_chunk, "mime_type": "audio/pcm"})

async def receive_audio_from_gemini(session, websocket: WebSocket):
    """Receives audio from Gemini and sends it to the client via WebSocket."""
    while True:
        try:
            turn = session.receive() 
            async for response in turn:
                if response.server_content and response.server_content.model_turn:
                    for part in response.server_content.model_turn.parts:
                        if part.inline_data and isinstance(part.inline_data.data, bytes):
                            await manager.send_audio_to_client(part.inline_data.data, websocket)
        except Exception as e:
            print(f"Error receiving from Gemini: {e}")
            break

@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    await manager.connect(websocket)
    
    if client is None:
        print("Closing connection: Google GenAI client is not available.")
        await websocket.close(code=1011, reason="Server configuration error for AI client")
        return

    try:
        async with client.aio.live.connect(model=MODEL, config=CONFIG) as live_session:
            print("Gemini Live session started.")
            audio_queue_from_client = asyncio.Queue()
            
            async with asyncio.TaskGroup() as tg:
                # Task to stream audio from our queue to Gemini
                tg.create_task(send_audio_to_gemini(live_session, audio_queue_from_client))
                
                # Task to stream audio from Gemini to the client
                tg.create_task(receive_audio_from_gemini(live_session, websocket))

                # Loop to receive audio from the client and put it in the queue
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