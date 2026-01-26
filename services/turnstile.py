import httpx
import logging
from core.config import settings
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

def verify_turnstile_token(token: str, remote_ip: str | None = None) -> bool:
    """
    Verifies a Cloudflare Turnstile token.
    Throws HTTPException if verification fails.
    """
    if not settings.TURNSTILE_SECRET_KEY:
        logger.warning("TURNSTILE_SECRET_KEY not set. Skipping verification (DEV MODE).")
        return True

    try:
        data = {
            "secret": settings.TURNSTILE_SECRET_KEY,
            "response": token,
        }
        if remote_ip:
            data["remoteip"] = remote_ip

        # Use sync client since the calling routes are currently sync 'def'
        with httpx.Client() as client:
            response = client.post(TURNSTILE_VERIFY_URL, data=data)
            response.raise_for_status()
            result = response.json()

        if not result.get("success"):
            logger.warning(f"Turnstile verification failed: {result.get('error-codes')}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "captcha_failed", "message": "Security verification failed. Please try again."}
            )
        
        return True

    except httpx.HTTPError as e:
        logger.error(f"Turnstile API communication error: {e}")
        # In case of API failure, we might want to fail-open or fail-closed. 
        # For security, fail-closed is better but might block users if CF is down.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "captcha_service_unavailable", "message": "Verification service unavailable. Please try again later."}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error during Turnstile verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "internal_error", "message": "An unexpected error occurred during security check."}
        )
