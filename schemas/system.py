from pydantic import BaseModel


class RateLimitInfo(BaseModel):
    per_user_per_minute: int
    per_ip_per_minute: int


class LimitsResponse(BaseModel):
    rate_limits: RateLimitInfo
