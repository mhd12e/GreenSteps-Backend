from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.deps import get_current_active_user, rate_limit_standard
from core.database import get_db
from schemas.user import UserProfileUpdateRequest, UserProfileResponse
from schemas.error import ErrorResponse
from schemas.common import Envelope
from services import profile as profile_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me/profile",
    response_model=Envelope[UserProfileResponse],
    dependencies=[Depends(rate_limit_standard)],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "User not found"},
    },
)
def get_profile(user=Depends(get_current_active_user)):
    profile = profile_service.get_profile(user)
    return Envelope(data=UserProfileResponse(**profile))


@router.patch(
    "/me/profile",
    response_model=Envelope[UserProfileResponse],
    dependencies=[Depends(rate_limit_standard)],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid profile data"},
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "User not found"},
    },
)
def update_profile(
    payload: UserProfileUpdateRequest,
    user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    profile = profile_service.update_profile(db, user, payload)
    return Envelope(data=UserProfileResponse(**profile))