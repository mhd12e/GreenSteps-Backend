from datetime import datetime, timedelta
import hashlib
from jose import jwt, JWTError
from core.config import settings
from fastapi import HTTPException, status

import uuid

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def create_token(subject: str, expires_delta: timedelta, token_type: str):
    now = datetime.utcnow()
    payload = {
        "sub": subject,
        "exp": now + expires_delta,
        "iat": now,
        "nbf": now,
        "jti": uuid.uuid4().hex,
        "typ": token_type,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, expires_delta: timedelta):
    return create_token(subject, expires_delta, TOKEN_TYPE_ACCESS)


def create_refresh_token(subject: str, expires_delta: timedelta):
    return create_token(subject, expires_delta, TOKEN_TYPE_REFRESH)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def verify_token(token: str, expected_type: str | None = None):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if expected_type and payload.get("typ") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "invalid_token", "message": "Invalid token"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_token", "message": "Invalid token"},
        )


def verify_access_token(token: str):
    return verify_token(token, TOKEN_TYPE_ACCESS)


def verify_refresh_token(token: str):
    return verify_token(token, TOKEN_TYPE_REFRESH)
