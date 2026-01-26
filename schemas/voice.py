from pydantic import BaseModel, Field


class VoiceTokenRequest(BaseModel):
    step_id: str = Field(min_length=1)
    turnstile_token: str


class VoiceTokenResponse(BaseModel):
    token: str
    expire_time: str
    new_session_expire_time: str
    model: str
