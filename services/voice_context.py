from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Step, Impact, User


def load_step_context(db: Session, user: User, step_id: str) -> dict:
    step = (
        db.query(Step)
        .filter(Step.id == step_id, Step.owner_id == user.id)
        .first()
    )
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "step_not_found", "message": "Step not found"},
        )

    impact = (
        db.query(Impact)
        .filter(Impact.id == step.impact_id, Impact.owner_id == user.id)
        .first()
    )
    if not impact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "impact_not_found", "message": "Impact not found"},
        )

    prev_step = (
        db.query(Step)
        .filter(
            Step.impact_id == impact.id,
            Step.owner_id == user.id,
            Step.order == step.order - 1,
        )
        .first()
    )
    next_step = (
        db.query(Step)
        .filter(
            Step.impact_id == impact.id,
            Step.owner_id == user.id,
            Step.order == step.order + 1,
        )
        .first()
    )
    total_steps = (
        db.query(Step)
        .filter(Step.impact_id == impact.id, Step.owner_id == user.id)
        .count()
    )

    return {
        "impact": impact,
        "step": step,
        "prev_step": prev_step,
        "next_step": next_step,
        "total_steps": total_steps,
    }


def build_context_payload(user: User, context: dict) -> dict:
    impact = context["impact"]
    step = context["step"]
    prev_step = context["prev_step"]
    next_step = context["next_step"]
    total_steps = context["total_steps"]

    return {
        "user": {
            "full_name": user.full_name,
            "age": user.age,
            "interests": user.interests or [],
        },
        "impact": {
            "title": impact.title,
            "description": impact.description,
        },
        "current_step": {
            "order": step.order,
            "title": step.title,
            "description": step.description,
            "icon": step.icon or "",
        },
        "previous_step": (
            {
                "order": prev_step.order,
                "title": prev_step.title,
                "description": prev_step.description,
                "icon": prev_step.icon or "",
            }
            if prev_step
            else None
        ),
        "next_step": (
            {
                "order": next_step.order,
                "title": next_step.title,
                "description": next_step.description,
                "icon": next_step.icon or "",
            }
            if next_step
            else None
        ),
        "progress": {
            "current_order": step.order,
            "total_steps": total_steps,
        },
    }
