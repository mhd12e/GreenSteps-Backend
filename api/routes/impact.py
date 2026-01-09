from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.impact import ImpactGenerateRequest, ImpactResponse, ImpactStepResponse
from schemas.error import ErrorResponse
from services import impact as impact_service
from core.database import get_db
from api.deps import get_current_active_user

router = APIRouter(prefix="/impact")


@router.post(
    "/generate",
    response_model=ImpactResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        422: {"model": ErrorResponse, "description": "Invalid AI output"},
        503: {"model": ErrorResponse, "description": "AI client unavailable"},
    },
)
def generate_impact(
    data: ImpactGenerateRequest,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    impact, steps = impact_service.create_impact_from_prompt(db, current_user.id, data.topic)
    return ImpactResponse(
        id=str(impact.id),
        title=impact.title,
        description=impact.description,
        steps=[
            ImpactStepResponse(order=step.order, title=step.title, description=step.description)
            for step in steps
        ],
    )
