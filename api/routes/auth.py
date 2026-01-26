from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    LogoutRequest,
    ProtectedResponse,
)
from schemas.error import ErrorResponse
from schemas.common import Envelope
from services import auth as auth_service
from services.turnstile import verify_turnstile_token
from core.database import get_db
from api.deps import get_current_user, get_current_active_user, rate_limit_auth, rate_limit_standard

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post(
    "/register",
    response_model=Envelope[None],
    dependencies=[Depends(rate_limit_auth)],
    responses={409: {"model": ErrorResponse, "description": "Email already registered"}},
)
def register(request: Request, data: RegisterRequest, db: Session = Depends(get_db)):
    verify_turnstile_token(data.turnstile_token, secret_key=settings.TURNSTILE_SECRET_KEY_AUTH, remote_ip=request.client.host)
    auth_service.register(db, data.email, data.full_name, data.age, data.interests, data.password)
    return Envelope()

@router.post(
    "/login", 
    response_model=Envelope[TokenResponse],
    dependencies=[Depends(rate_limit_auth)],
    responses={401: {"model": ErrorResponse, "description": "Incorrect email or password"}}
)
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    verify_turnstile_token(data.turnstile_token, secret_key=settings.TURNSTILE_SECRET_KEY_AUTH, remote_ip=request.client.host)
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host
    tokens = auth_service.login(db, data.email, data.password, user_agent=user_agent, ip_address=ip_address)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_credentials", "message": "Incorrect email or password"},
        )
    return Envelope(
        data=TokenResponse(access_token=tokens[0], refresh_token=tokens[1])
    )

@router.get(
    "/protected",
    response_model=Envelope[ProtectedResponse],
    dependencies=[Depends(rate_limit_standard)],
    responses={401: {"model": ErrorResponse, "description": "Not authenticated"}},
)
def protected(user_id=Depends(get_current_user)):
    return Envelope(data=ProtectedResponse(user_id=str(user_id)))

@router.post(
    "/refresh",
    response_model=Envelope[TokenResponse],
    dependencies=[Depends(rate_limit_auth)],
    responses={401: {"model": ErrorResponse, "description": "Invalid refresh token"}},
)
def refresh_token_endpoint(request: Request, refresh_token_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host
    new_access_token, new_refresh_token = auth_service.refresh(
        db, refresh_token_data.refresh_token, user_agent=user_agent, ip_address=ip_address
    )
    return Envelope(
        data=TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)
    )

@router.post(
    "/logout",
    response_model=Envelope[None],
    dependencies=[Depends(rate_limit_auth)],
    responses={401: {"model": ErrorResponse, "description": "Invalid refresh token"}},
)
def logout(logout_data: LogoutRequest, db: Session = Depends(get_db)):
    auth_service.logout(db, logout_data.refresh_token)
    return Envelope()

@router.delete(
    "/account",
    response_model=Envelope[None],
    dependencies=[Depends(rate_limit_standard)],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "User not found"},
    },
)
def delete_account(user=Depends(get_current_active_user), db: Session = Depends(get_db)):
    auth_service.delete_account(db, user)
    return Envelope()
