from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshTokenRequest, AccessTokenResponse, StatusResponse
from schemas.error import ErrorResponse
from services import auth as auth_service
from core.database import get_db
from api.deps import get_current_user

router = APIRouter(prefix="/auth")

@router.post("/register", response_model=StatusResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    auth_service.register(db, data.email, data.password)
    return StatusResponse(status="ok")

@router.post(
    "/login", 
    response_model=TokenResponse,
    responses={401: {"model": ErrorResponse, "description": "Incorrect email or password"}}
)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    tokens = auth_service.login(db, data.email, data.password)
    if not tokens:
        raise HTTPException(401, detail="Incorrect email or password")
    return TokenResponse(access_token=tokens[0], refresh_token=tokens[1])

@router.get(
    "/protected",
    responses={401: {"model": ErrorResponse, "description": "Not authenticated"}}
)
def protected(user_id=Depends(get_current_user)):
    return {"user_id": user_id}

@router.post(
    "/refresh", 
    response_model=AccessTokenResponse,
    responses={401: {"model": ErrorResponse, "description": "Invalid refresh token or not authenticated"}}
)
def refresh_token_endpoint(refresh_token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        new_access_token = auth_service.refresh(db, refresh_token_data.refresh_token)
        return AccessTokenResponse(access_token=new_access_token)
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")