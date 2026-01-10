from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models import User


def append_user_data(db: Session, user: User, item):
    data = list(user.user_data or [])
    data.append(item)
    user.user_data = data
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.user_data


def remove_user_data(db: Session, user: User, item):
    data = list(user.user_data or [])
    try:
        data.remove(item)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "user_data_item_not_found", "message": "User data item not found"},
        ) from exc
    user.user_data = data
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.user_data
