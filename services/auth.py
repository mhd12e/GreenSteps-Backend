from sqlalchemy.orm import Session
from models.user import User
from core.security import hash_password, verify_password
from utils.tokens import create_token, verify_token
from datetime import timedelta
from core.config import settings
from fastapi import HTTPException, status

def register(db: Session, email: str, password: str):
    user = User(email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def login(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
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

    return access, refresh

def refresh(db: Session, refresh_token: str):
    payload = verify_token(refresh_token)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_access_token = create_token(
        str(user.id),
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return new_access_token
