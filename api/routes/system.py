from fastapi import APIRouter
from schemas.common import Envelope
from schemas.system import LimitsResponse, RateLimitInfo
from core.config import settings

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health", response_model=Envelope[None])
def health_check():
    return Envelope()


@router.get("/limits", response_model=Envelope[LimitsResponse])
def limits():
    return Envelope(
        data=LimitsResponse(
            rate_limits=RateLimitInfo(
                per_user_per_minute=settings.RATE_LIMIT_STANDARD_PER_MINUTE,
                per_ip_per_minute=settings.RATE_LIMIT_AUTH_PER_MINUTE,
            )
        )
    )