import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from core.config import settings
from core.security import hash_password, verify_password
from models import Impact, Material, RefreshToken, Step, User
from services.email_blocklist import email_blocklist
from services.email_service import email_service
from services.material_service import delete_material
from utils.tokens import (
    create_access_token,
    create_email_verification_token,
    create_refresh_token,
    hash_token,
    verify_email_verification_token,
    verify_refresh_token,
)

logger = logging.getLogger(__name__)

def _normalize_email(email: str) -> str:
    return email.strip().lower()

def _prune_refresh_tokens(db: Session, user_id):
    now = datetime.utcnow()
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.expires_at < now,
    ).delete(synchronize_session=False)
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

def _prune_unverified_users(db: Session):
    """
    Delete users who haven't verified their email within the expiration window.
    """
    expiry_limit = datetime.utcnow() - timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
    unverified_expired = (
        db.query(User)
        .filter(User.is_verified == False, User.created_at < expiry_limit)
        .all()
    )
    for user in unverified_expired:
        logger.info(f"Pruning unverified expired user: {user.email}")
        db.delete(user)
    db.commit()

def register(db: Session, email: str, full_name: str, age: int, interests: list, password: str) -> User:
    normalized_email = _normalize_email(email)
    _prune_unverified_users(db)
    if email_blocklist.is_blocked(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "disposable_email", "message": "Disposable email addresses are not allowed. Please use a permanent email."},
        )
    existing = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing:
        if existing.is_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "email_taken", "message": "Email already registered and verified. Please login."},
            )
        else:
            # User exists but not verified; prune to allow re-registration
            db.delete(existing)
            db.commit()
    
    user = User(
        email=normalized_email,
        full_name=full_name,
        age=age,
        interests=interests,
        password_hash=hash_password(password),
        is_verified=False
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
    try:
        token = create_email_verification_token(
            str(user.id), 
            timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
        )
        email_service.send_verification_email(user.email, user.full_name, token)
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {e}")
    return user

def login(db: Session, email: str, password: str, user_agent: str = None, ip_address: str = None) -> tuple[str, str] | None:
    normalized_email = _normalize_email(email)
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "unverified_email", "message": "Please verify your email address. Check your inbox and spam folder."}
        )
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

def verify_email(db: Session, token: str) -> str:
    try:
        payload = verify_email_verification_token(token)
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.is_verified:
            return "already_verified"
        user.is_verified = True
        db.commit()
        return "verified"
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "invalid_token", "message": "Verification link is invalid or expired."}
        )

def refresh(db: Session, refresh_token: str, user_agent: str = None, ip_address: str = None) -> tuple[str, str]:
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
    if token_record and token_record.is_used:
        logger.warning(f"Refresh token reuse detected for user {user_id}! Revoking all sessions.")
        db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete(synchronize_session=False)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "security_breach", "message": "Security alert: session compromised. Please login again."},
        )
    if not token_record or token_record.expires_at < datetime.utcnow() or token_record.revoked_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "invalid_refresh_token", "message": "Invalid or expired refresh token"},
        )
    token_record.is_used = True
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

def logout(db: Session, refresh_token: str) -> None:
    token_hash = hash_token(refresh_token)
    token_record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )
    if token_record:
        db.delete(token_record)
        db.commit()

def delete_account(db: Session, user: User) -> None:
    user_materials = db.query(Material).filter(Material.owner_id == user.id).all()
    for material in user_materials:
        delete_material(db, material.id, user.id)
    db.query(Step).filter(Step.owner_id == user.id).delete(synchronize_session=False)
    db.query(Impact).filter(Impact.owner_id == user.id).delete(synchronize_session=False)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete(synchronize_session=False)
    db.delete(user)
    db.commit()