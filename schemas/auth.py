from pydantic import BaseModel, EmailStr, Field, field_validator

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    age: int = Field(ge=3, le=120)
    interests: list[str]

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = " ".join(value.strip().split())
        parts = [part for part in cleaned.split(" ") if part]
        if len(parts) < 2:
            raise ValueError("Full name must include at least two words")
        return cleaned

    @field_validator("interests")
    @classmethod
    def normalize_interests(cls, value: list[str]) -> list[str]:
        cleaned = []
        seen = set()
        for item in value:
            normalized = (item or "").strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            cleaned.append(normalized)
        if not cleaned:
            raise ValueError("At least one interest is required")
        return cleaned

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: str

class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class StatusResponse(BaseModel):
    status: str


class ProtectedResponse(BaseModel):
    user_id: str
