from datetime import datetime, timedelta
from jose import jwt, JWTError
from core.config import settings
from fastapi import HTTPException, status

def create_token(subject: str, expires_delta: timedelta):
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + expires_delta,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def verify_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
