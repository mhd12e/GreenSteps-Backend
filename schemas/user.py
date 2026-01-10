from typing import Optional
from pydantic import BaseModel, Field, field_validator


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1)
    age: Optional[int] = Field(default=None, ge=3, le=120)
    interests: Optional[list[str]] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = " ".join(value.strip().split())
        parts = [part for part in cleaned.split(" ") if part]
        if len(parts) < 2:
            raise ValueError("Full name must include at least two words")
        return cleaned

    @field_validator("interests")
    @classmethod
    def normalize_interests(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        cleaned = []
        seen = set()
        for item in value:
            normalized = (item or "").strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            cleaned.append(normalized)
        return cleaned


class UserProfileResponse(BaseModel):
    full_name: str
    age: Optional[int]
    interests: list[str]
