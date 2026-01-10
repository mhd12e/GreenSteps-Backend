from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from utils.tokens import verify_access_token
from core.database import get_db
from models.user import User
from core.config import settings
from core.rate_limit import InMemoryRateLimiter, RateLimitConfig

security = HTTPBearer()
rate_limiter = InMemoryRateLimiter(
    RateLimitConfig(limit=settings.RATE_LIMIT_PER_MINUTE, window_seconds=60)
)
ip_rate_limiter = InMemoryRateLimiter(
    RateLimitConfig(limit=settings.RATE_LIMIT_IP_PER_MINUTE, window_seconds=60)
)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = verify_access_token(credentials.credentials)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "not_authenticated", "message": "Not authenticated"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "not_authenticated", "message": "Not authenticated"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id

def rate_limit_user(
    request: Request,
    user_id: str = Depends(get_current_user),
):
    key = f"{user_id}:{request.method}:{request.url.path}"
    rate_limiter.check(key)


def rate_limit_ip(request: Request):
    client = request.client
    ip = client.host if client else "unknown"
    key = f"{ip}:{request.method}:{request.url.path}"
    ip_rate_limiter.check(key)

def get_current_active_user(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "user_not_found", "message": "User not found"},
        )
    return user
