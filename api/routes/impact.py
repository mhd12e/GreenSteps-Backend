from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from schemas.impact import (
    ImpactGenerateRequest,
    ImpactDeleteResponse,
    ImpactResponse,
    ImpactStepPayloadResponse,
    ImpactStepResponse,
    ImpactPayloadResponse,
)
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
            ImpactStepResponse(
                order=step.order,
                title=step.title,
                description=step.description,
                icon=step.icon or "",
            )
            for step in steps
        ],
    )


@router.get(
    "/{impact_id}",
    response_model=ImpactPayloadResponse,
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
            title=step.title,
            descreption=step.description,
            icon=step.icon or "",
        )
        for step in steps
    }
    return ImpactPayloadResponse(
        title=impact.title,
        descreption=impact.description,
        steps=payload_steps,
    )


@router.delete(
    "/{impact_id}",
    response_model=ImpactDeleteResponse,
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
    return ImpactDeleteResponse(status="deleted", impact_id=deleted_id)
