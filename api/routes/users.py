from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.deps import get_current_active_user
from core.database import get_db
from schemas.user import UserDataItemRequest, UserDataResponse
from schemas.error import ErrorResponse
from services import user_data as user_data_service

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/me/user-data",
    response_model=UserDataResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "User not found"},
    },
)
def append_user_data(
    payload: UserDataItemRequest,
    user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    updated = user_data_service.append_user_data(db, user, payload.item)
    return UserDataResponse(user_data=updated)


@router.delete(
    "/me/user-data",
    response_model=UserDataResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "User not found or item not found"},
    },
)
def delete_user_data(
    payload: UserDataItemRequest,
    user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    updated = user_data_service.remove_user_data(db, user, payload.item)
    return UserDataResponse(user_data=updated)
