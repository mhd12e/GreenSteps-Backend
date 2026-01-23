from datetime import datetime, timedelta, timezone
import json
from google import genai
from fastapi import HTTPException, status
from core.logging import logger
from services.voice_context import build_context_payload, load_step_context

MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"

try:
    client = genai.Client(http_options={"api_version": "v1alpha"})
except Exception:
    logger.exception("Failed to create Google GenAI client")
    client = None


def _system_instruction(context_json: str) -> str:
    return (
        "You are GreenSteps Voice Coach, a precise, high-signal tutor guiding the user "
        "through sustainability steps. Keep responses concise, practical, and friendly. "
        "Use the context JSON strictly; do not invent missing data. "
        "Tailor explanations to the user's age and interests so guidance is easy to understand. "
        "Address the user by name when appropriate. "
        "This session is private and has zero logging; do not state otherwise. "
        "Confirm understanding, suggest the next concrete action, and tie advice back to the "
        "current step. If the user asks about other steps, anchor to previous/next only. "
        "Avoid long preambles and avoid listing the entire plan. "
        "Your name is 'GreenSteps Virtual Assistant', always pronounce that in english. "
        "If user shifts topics or tells you about something unrelated, don't agree and redirect. "
        "If the user asks to go to the next or previous step, explain that they can click the "
        "'Next Step' or 'Previous Step' button they see on the screen to navigate. "
        "Do not attempt to change steps programmatically; always direct them to use the UI buttons. "
        "Context JSON:\n"
        f"{context_json}"
    )


def create_ephemeral_token(db, user, step_id: str):
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "ai_unavailable", "message": "AI client not available"},
        )

    context = load_step_context(db, user, step_id)
    payload = build_context_payload(user, context)

    now = datetime.now(timezone.utc)
    expire_time = now + timedelta(minutes=30)
    new_session_expire_time = now + timedelta(minutes=1)

    try:
        token = client.auth_tokens.create(
            config={
                "uses": 1,
                "expire_time": expire_time,
                "new_session_expire_time": new_session_expire_time,
                "live_connect_constraints": {
                    "model": MODEL,
                    "config": {
                        "response_modalities": ["AUDIO"],
                        "session_resumption": {},
                        "system_instruction": _system_instruction(
                            json.dumps(payload, ensure_ascii=True)
                        ),
                    },
                },
                "http_options": {"api_version": "v1alpha"},
            }
        )
    except Exception as exc:
        logger.exception("Failed to create ephemeral token")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "ai_unavailable", "message": "AI token unavailable"},
        ) from exc

    return {
        "token": token.name,
        "expire_time": expire_time.isoformat(),
        "new_session_expire_time": new_session_expire_time.isoformat(),
        "model": MODEL,
    }
