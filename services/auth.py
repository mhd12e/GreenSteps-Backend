from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from models import User, RefreshToken
from core.security import hash_password, verify_password
from utils.tokens import create_token, verify_token, hash_token
from core.config import settings
from fastapi import HTTPException, status

def _normalize_email(email: str) -> str:
    return email.strip().lower()

def _prune_refresh_tokens(db: Session, user_id):
    now = datetime.utcnow()
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.expires_at < now,
    ).delete(synchronize_session=False)
    db.flush()

    active_tokens = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.expires_at >= now,
        )
        .order_by(RefreshToken.created_at.asc())
        .all()
    )
    overflow = len(active_tokens) - settings.MAX_REFRESH_TOKENS_PER_USER + 1
    if overflow > 0:
        for token in active_tokens[:overflow]:
            db.delete(token)
        db.flush()

def register(db: Session, email: str, full_name: str, age: int, interests: list, password: str):
    normalized_email = _normalize_email(email)
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "email_taken", "message": "Email already registered"},
        )
    user = User(
        email=normalized_email,
        full_name=full_name,
        age=age,
        interests=interests,
        password_hash=hash_password(password)
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "email_taken", "message": "Email already registered"},
        )
    db.refresh(user)
    return user

def login(db: Session, email: str, password: str):
    normalized_email = _normalize_email(email)
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(password, user.password_hash):
        return None

    access = create_token(
        str(user.id),
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh = create_token(
        str(user.id),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    _prune_refresh_tokens(db, user.id)
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_record)
    db.commit()

    return access, refresh

def refresh(db: Session, refresh_token: str):
    try:
        payload = verify_token(refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )

    token_hash = hash_token(refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user.id,
            RefreshToken.token_hash == token_hash,
        )
        .first()
    )
    if not token_record or token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )

    db.delete(token_record)
    _prune_refresh_tokens(db, user.id)

    new_access_token = create_token(
        str(user.id),
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_token(
        str(user.id),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_refresh_token),
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    db.commit()
    return new_access_token, new_refresh_token

def logout(db: Session, refresh_token: str):
    try:
        payload = verify_token(refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )
    token_hash = hash_token(refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash,
        )
        .first()
    )
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid refresh token"},
        )
    db.delete(token_record)
    db.commit()
