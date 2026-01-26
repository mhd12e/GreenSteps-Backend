from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models import Impact, Step, User
from core.logging import logger
from services.ai.gemini_impact import gemini_impact

MAX_STEPS = 12
MAX_TITLE_LEN = 120
MAX_DESC_LEN = 400

def _validate_ai_payload(payload: dict) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("Payload must be an object")
    title = payload.get("title")
    description = payload.get("descreption") or payload.get("description")
    steps = payload.get("steps")
    
    if not isinstance(title, str) or not title.strip():
        raise ValueError("Missing title")
    if not isinstance(description, str) or not description.strip():
        raise ValueError("Missing descreption")
    if not steps:
        raise ValueError("Missing steps")

    title = title.strip()[:MAX_TITLE_LEN]
    description = description.strip()[:MAX_DESC_LEN]

    parsed_steps = []
    seen_orders = set()
    
    if isinstance(steps, list):
        step_items = list(enumerate(steps, start=1))
    elif isinstance(steps, dict):
        step_items = list(steps.items())
    else:
        raise ValueError("Steps must be a list or object")

    for key, step in step_items:
        try:
            order = int(str(key).strip())
        except ValueError:
            raise ValueError("Step keys must be numeric")
        
        if order in seen_orders:
            raise ValueError("Duplicate step order")
        seen_orders.add(order)
        
        if not isinstance(step, dict):
            raise ValueError("Step must be an object")
            
        step_title = step.get("title")
        step_description = step.get("descreption") or step.get("description")
        step_icon = step.get("icon")
        
        if not isinstance(step_title, str) or not step_title.strip():
            raise ValueError("Step title missing")
        if not isinstance(step_description, str) or not step_description.strip():
            raise ValueError("Step descreption missing")
        if not isinstance(step_icon, str) or not step_icon.strip():
            raise ValueError("Step icon missing")
            
        parsed_steps.append(
            {
                "order": order,
                "title": step_title.strip()[:MAX_TITLE_LEN],
                "description": step_description.strip()[:MAX_DESC_LEN],
                "icon": step_icon.strip()[:MAX_TITLE_LEN],
            }
        )

    parsed_steps.sort(key=lambda item: item["order"])
    if len(parsed_steps) > MAX_STEPS:
        raise ValueError("Too many steps")
    if not parsed_steps:
        raise ValueError("No steps generated")
    if parsed_steps[0]["order"] != 1:
        raise ValueError("Step order must start at 1")
        
    expected = list(range(1, len(parsed_steps) + 1))
    if [step["order"] for step in parsed_steps] != expected:
        raise ValueError("Step order must be sequential")
        
    return {"title": title, "description": description, "steps": parsed_steps}

def create_impact_from_prompt(db: Session, user: User, topic: str):
    raw_text = ""
    try:
        try:
            payload, raw_text = gemini_impact.generate_impact_payload(topic, user)
            parsed = _validate_ai_payload(payload)
        except Exception as exc:
            logger.warning(f"First AI attempt failed: {exc}. Retrying...")
            payload, raw_text = gemini_impact.generate_impact_payload(topic, user)
            parsed = _validate_ai_payload(payload)
    except HTTPException:
        raise
    except Exception as exc:
        preview = (raw_text or "").strip()
        if len(preview) > 1200:
            preview = preview[:1200] + "...(truncated)"
        
        logger.error(f"AI impact generation failed: {exc}. Raw: {preview}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "invalid_ai_output",
                "message": "AI output invalid or parsing failed",
                "details": {"ai_output_preview": preview},
            },
        ) from exc

    impact = Impact(
        title=parsed["title"],
        description=parsed["description"],
        owner_id=user.id,
    )
    db.add(impact)
    db.flush()

    steps = []
    for step_data in parsed["steps"]:
        steps.append(
            Step(
                title=step_data["title"],
                description=step_data["description"],
                icon=step_data["icon"],
                order=step_data["order"],
                unlocked=step_data["order"] == 1,
                owner_id=user.id,
                impact_id=impact.id,
            )
        )
    db.add_all(steps)
    db.commit()
    db.refresh(impact)
    return impact, steps

def get_impact_with_steps(db: Session, user_id: str, impact_id: str):
    impact = (
        db.query(Impact)
        .filter(Impact.id == impact_id, Impact.owner_id == user_id)
        .first()
    )
    if not impact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "impact_not_found", "message": "Impact not found"},
        )
    steps = (
        db.query(Step)
        .filter(Step.impact_id == impact.id, Step.owner_id == user_id)
        .order_by(Step.order)
        .all()
    )
    return impact, steps

def delete_impact(db: Session, user_id: str, impact_id: str) -> str:
    impact = (
        db.query(Impact)
        .filter(Impact.id == impact_id, Impact.owner_id == user_id)
        .first()
    )
    if not impact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "impact_not_found", "message": "Impact not found"},
        )
    
    # Steps are also deleted via database cascading if configured, but let's be explicit
    db.query(Step).filter(Step.impact_id == impact.id, Step.owner_id == user_id).delete(
        synchronize_session=False
    )
    db.delete(impact)
    db.commit()
    return str(impact.id)

def list_impacts(db: Session, user_id: str) -> list[str]:
    impact_ids = (
        db.query(Impact.id)
        .filter(Impact.owner_id == user_id)
        .order_by(Impact.created_at.desc())
        .all()
    )
    return [str(item[0]) for item in impact_ids]