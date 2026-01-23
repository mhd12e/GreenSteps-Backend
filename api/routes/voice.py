from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.deps import get_current_active_user, rate_limit_user
from core.database import get_db
from schemas.common import Envelope
from schemas.error import ErrorResponse
from schemas.voice import VoiceTokenRequest, VoiceTokenResponse
from services.voice_tokens import create_ephemeral_token

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post(
    "/token",
    response_model=Envelope[VoiceTokenResponse],
    dependencies=[Depends(rate_limit_user)],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Step not found"},
        503: {"model": ErrorResponse, "description": "AI token unavailable"},
    },
)
def create_voice_token(
    payload: VoiceTokenRequest,
    user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    token_data = create_ephemeral_token(db, user, payload.step_id)
    return Envelope(data=VoiceTokenResponse(**token_data))
