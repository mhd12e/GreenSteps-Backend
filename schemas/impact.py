from typing import Annotated
from pydantic import BaseModel, StringConstraints


class ImpactGenerateRequest(BaseModel):
    topic: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=3, max_length=200),
    ]


class ImpactStepResponse(BaseModel):
    id: str
    order: int
    title: str
    description: str
    icon: str


class ImpactResponse(BaseModel):
    id: str
    title: str
    description: str
    steps: list[ImpactStepResponse]


class ImpactStepPayloadResponse(BaseModel):
    id: str
    title: str
    descreption: str
    icon: str


class ImpactPayloadResponse(BaseModel):
    id: str
    title: str
    descreption: str
    steps: dict[int, ImpactStepPayloadResponse]


class ImpactDeleteData(BaseModel):
    impact_id: str


class ImpactListResponse(BaseModel):
    impact_ids: list[str]
