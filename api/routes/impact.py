from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.impact import (
    ImpactGenerateRequest,
    ImpactDeleteData,
    ImpactResponse,
    ImpactStepPayloadResponse,
    ImpactStepResponse,
    ImpactPayloadResponse,
    ImpactListResponse,
)
from schemas.error import ErrorResponse
from schemas.common import Envelope
from services import impact as impact_service
from core.database import get_db
from api.deps import get_current_active_user, rate_limit_user

router = APIRouter(prefix="/impact", tags=["impact"])


@router.get(
    "",
    response_model=Envelope[ImpactListResponse],
    dependencies=[Depends(rate_limit_user)],
    responses={401: {"model": ErrorResponse, "description": "Not authenticated"}},
)
def list_impacts(
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    impact_ids = impact_service.list_impacts(db, current_user.id)
    return Envelope(data=ImpactListResponse(impact_ids=impact_ids))


@router.post(
    "/generate",
    response_model=Envelope[ImpactResponse],
    dependencies=[Depends(rate_limit_user)],
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
    return Envelope(
        data=ImpactResponse(
            id=str(impact.id),
            title=impact.title,
            description=impact.description,
            steps=[
                ImpactStepResponse(
                    id=str(step.id),
                    order=step.order,
                    title=step.title,
                    description=step.description,
                    icon=step.icon or "",
                )
                for step in steps
            ],
        )
    )


@router.get(
    "/{impact_id}",
    response_model=Envelope[ImpactPayloadResponse],
    dependencies=[Depends(rate_limit_user)],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Impact not found"},
    },
)
def get_impact_payload(
    impact_id: str,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    impact, steps = impact_service.get_impact_with_steps(db, current_user.id, impact_id)
    payload_steps = {
        step.order: ImpactStepPayloadResponse(
            id=str(step.id),
            title=step.title,
            descreption=step.description,
            icon=step.icon or "",
        )
        for step in steps
    }
    return Envelope(
        data=ImpactPayloadResponse(
            id=str(impact.id),
            title=impact.title,
            descreption=impact.description,
            steps=payload_steps,
        )
    )


@router.delete(
    "/{impact_id}",
    response_model=Envelope[ImpactDeleteData],
    dependencies=[Depends(rate_limit_user)],
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
        404: {"model": ErrorResponse, "description": "Impact not found"},
    },
)
def delete_impact(
    impact_id: str,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    deleted_id = impact_service.delete_impact(db, current_user.id, impact_id)
    return Envelope(data=ImpactDeleteData(impact_id=deleted_id))
