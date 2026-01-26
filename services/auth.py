from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from models import User, RefreshToken, Impact, Step, Material
from services.material_service import delete_material
from core.security import hash_password, verify_password
from utils.tokens import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    hash_token,
)
from core.config import settings
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

def _normalize_email(email: str) -> str:
    return email.strip().lower()

def _prune_refresh_tokens(db: Session, user_id):
    """
    Remove expired tokens and ensure the user doesn't exceed MAX_REFRESH_TOKENS_PER_USER.
    """
    now = datetime.utcnow()
    # 1. Delete all expired tokens for this user
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.expires_at < now,
    ).delete(synchronize_session=False)
    
    # 2. Enforce limit on active tokens (FIFO)
    active_tokens = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at == None,
            RefreshToken.is_used == False
        )
        .order_by(RefreshToken.created_at.asc())
        .all()
    )
    
    overflow = len(active_tokens) - settings.MAX_REFRESH_TOKENS_PER_USER
    if overflow > 0:
        for token in active_tokens[:overflow]:
            db.delete(token)
    
    db.commit()

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

def login(db: Session, email: str, password: str, user_agent: str = None, ip_address: str = None):
    normalized_email = _normalize_email(email)
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(password, user.password_hash):
        return None

    access = create_access_token(
        str(user.id),
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh = create_refresh_token(
        str(user.id),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    _prune_refresh_tokens(db, user.id)
    
    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
        ip_address=ip_address
    )
    db.add(refresh_record)
    db.commit()

    return access, refresh

def refresh(db: Session, refresh_token: str, user_agent: str = None, ip_address: str = None):
    try:
        payload = verify_refresh_token(refresh_token)
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
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )

    # 1. SECURITY: Token Reuse Detection
    if token_record and token_record.is_used:
        # This token has already been used! Potential theft.
        # Revoke ALL active tokens for this user.
        logger.warning(f"Refresh token reuse detected for user {user_id}! Revoking all sessions.")
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete(synchronize_session=False)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "security_breach", "message": "Security alert: session compromised. Please login again."},
        )

    # 2. Standard validation
    if not token_record or token_record.expires_at < datetime.utcnow() or token_record.revoked_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid or expired refresh token"},
        )

    # 3. ROTATION: Mark current token as used
    token_record.is_used = True
    
    # 4. Issue new tokens
    new_access = create_access_token(
        str(user.id),
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh = create_refresh_token(
        str(user.id),
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    _prune_refresh_tokens(db, user.id)
    
    new_refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_refresh),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
        ip_address=ip_address
    )
    db.add(new_refresh_record)
    db.commit()
    
    return new_access, new_refresh

def logout(db: Session, refresh_token: str):
    token_hash = hash_token(refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )
    if token_record:
        # Instead of deleting, we can revoke or just delete to keep DB clean. 
        # I'll delete to minimize DB size as requested.
        db.delete(token_record)
        db.commit()

def delete_account(db: Session, user: User):
    # Delete Materials and their R2 assets
    user_materials = db.query(Material).filter(Material.owner_id == user.id).all()
    for material in user_materials:
        delete_material(db, material.id, user.id)

    db.query(Step).filter(Step.owner_id == user.id).delete(synchronize_session=False)
    db.query(Impact).filter(Impact.owner_id == user.id).delete(synchronize_session=False)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()