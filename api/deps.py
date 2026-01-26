from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from utils.tokens import verify_access_token
from core.database import get_db
from models.user import User
from core.config import settings
from core.rate_limit import InMemoryRateLimiter, RateLimitConfig

security = HTTPBearer()

# --- Rate Limiters ---
# 1. Standard (Browsing, Listing) - 60/min
limiter_standard = InMemoryRateLimiter(
    RateLimitConfig(limit=settings.RATE_LIMIT_STANDARD_PER_MINUTE, window_seconds=60)
)
# 2. Auth (Login, Register) - 5/min (Strict brute force protection)
limiter_auth = InMemoryRateLimiter(
    RateLimitConfig(limit=settings.RATE_LIMIT_AUTH_PER_MINUTE, window_seconds=60)
)
# 3. AI (Generation) - 5/hour (Very strict to prevent abuse/cost)
limiter_ai = InMemoryRateLimiter(
    RateLimitConfig(limit=settings.RATE_LIMIT_AI_PER_HOUR, window_seconds=3600)
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

# --- Rate Limit Dependencies ---

def rate_limit_standard(
    request: Request,
    user_id: str = Depends(get_current_user),
):
    """Standard rate limit for authenticated users."""
    key = f"std:{user_id}"
    limiter_standard.check(key)

def rate_limit_auth(request: Request):
    """Strict rate limit for auth endpoints by IP."""
    client = request.client
    ip = client.host if client else "unknown"
    key = f"auth:{ip}"
    limiter_auth.check(key)

def rate_limit_ai(
    request: Request,
    user_id: str = Depends(get_current_user),
):
    """Strict rate limit for AI generation by User ID."""
    key = f"ai:{user_id}"
    limiter_ai.check(key)

def get_current_active_user(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "user_not_found", "message": "User not found"},
        )
    return user
