import json
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from google import genai
from google.genai.errors import ClientError
from models import Impact, Step
from core.config import settings
from core.logging import logger

MODEL = settings.IMPACT_MODEL
MAX_STEPS = 12
MAX_TITLE_LEN = 120
MAX_DESC_LEN = 400

try:
    client = genai.Client()
except Exception:
    logger.exception("Failed to create Google GenAI client")
    client = None


def _extract_json(text: str) -> dict:
    if not text:
        raise ValueError("Empty AI response")
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")
    snippet = cleaned[start : end + 1]
    return json.loads(snippet)


def _response_to_text(response) -> str:
    if response is None:
        return ""
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, dict):
        return json.dumps(parsed)
    if getattr(response, "text", None):
        return response.text
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return ""
    parts = getattr(candidates[0].content, "parts", None) or []
    texts = []
    for part in parts:
        if getattr(part, "text", None):
            texts.append(part.text)
    return "\n".join(texts)


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
    if parsed_steps[0]["order"] != 1:
        raise ValueError("Step order must start at 1")
    expected = list(range(1, len(parsed_steps) + 1))
    if [step["order"] for step in parsed_steps] != expected:
        raise ValueError("Step order must be sequential")
    return {"title": title, "description": description, "steps": parsed_steps}


def _generate_impact_payload(topic: str) -> tuple[dict, str]:
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "ai_unavailable", "message": "AI client not available"},
        )
    prompt = f"""
You are a sustainability expert, totur, you will help the user optimize and make there setup sustainable and safe on the environment.
You are generating a structured plan in JSON. Output ONLY valid JSON with this exact shape:
{{
  "title": "impact title",
  "descreption": "impact short descreption",
  "steps": {{
    "1": {{
      "title": "step title",
      "descreption": "step full blown descreption",
      "icon": "fa-solid fa-recycle"
    }}
  }}
}}

User input Topic: {topic}
Rules:
- Use 3 to 8 steps.
- Steps must be actionable and ordered.
- Keep descriptions concise but clear.
- Provide a unique Font Awesome CSS class string for each step icon.
"""
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
    except ClientError as exc:
        logger.warning("AI model unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "ai_unavailable", "message": "AI model unavailable"},
        ) from exc
    text = _response_to_text(response)
    return _extract_json(text), text


def create_impact_from_prompt(db: Session, user_id: str, topic: str):
    raw_text = ""
    try:
        payload, raw_text = _generate_impact_payload(topic)
        parsed = _validate_ai_payload(payload)
    except HTTPException:
        raise
    except Exception as exc:
        try:
            payload, raw_text = _generate_impact_payload(topic)
            parsed = _validate_ai_payload(payload)
        except Exception as retry_exc:
            preview = (raw_text or "").strip()
            if len(preview) > 1200:
                preview = preview[:1200] + "...(truncated)"
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "invalid_ai_output",
                    "message": "AI output invalid",
                    "details": {"ai_output_preview": preview},
                },
            ) from retry_exc

    impact = Impact(
        title=parsed["title"],
        description=parsed["description"],
        owner_id=user_id,
    )
    db.add(impact)
    db.flush()

    steps = []
    for idx, step in enumerate(parsed["steps"], start=1):
        steps.append(
            Step(
                title=step["title"],
                description=step["description"],
                icon=step["icon"],
                order=step["order"],
                unlocked=step["order"] == 1,
                owner_id=user_id,
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
    db.query(Step).filter(Step.impact_id == impact.id, Step.owner_id == user_id).delete(
        synchronize_session=False
    )
    db.delete(impact)
    db.commit()
    return str(impact.id)
