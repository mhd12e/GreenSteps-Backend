from pydantic import BaseModel, field_validator


class ImpactGenerateRequest(BaseModel):
    topic: str

    @field_validator("topic")
    @classmethod
    def normalize_topic(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("topic must be at least 3 characters")
        if len(value) > 200:
            raise ValueError("topic must be at most 200 characters")
        return value


class ImpactStepResponse(BaseModel):
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
    title: str
    descreption: str
    icon: str


class ImpactPayloadResponse(BaseModel):
    title: str
    descreption: str
    steps: dict[int, ImpactStepPayloadResponse]


class ImpactDeleteResponse(BaseModel):
    status: str
    impact_id: str
