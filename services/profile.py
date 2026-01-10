from sqlalchemy.orm import Session
from models import User


def _normalize_interests(interests: list[str]) -> list[str]:
    cleaned = []
    seen = set()
    for interest in interests:
        value = (interest or "").strip()
        if not value:
            continue
        if value in seen:
            continue
        seen.add(value)
        cleaned.append(value)
    return cleaned


def get_profile(user: User) -> dict:
    return {
        "full_name": user.full_name,
        "age": user.age,
        "interests": list(user.interests or []),
    }


def update_profile(db: Session, user: User, payload) -> dict:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.age is not None:
        user.age = payload.age
    if payload.interests is not None:
        user.interests = _normalize_interests(payload.interests)
    db.add(user)
    db.commit()
    db.refresh(user)
    return get_profile(user)
