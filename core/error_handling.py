from fastapi import Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from schemas.error import ErrorResponse
from core.logging import logger

def _normalize_error_detail(detail):
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        return detail
    return {"code": "error", "message": str(detail)}

async def http_exception_handler(request: Request, exc: HTTPException):
    error_detail = _normalize_error_detail(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error=error_detail).model_dump(),
        headers=exc.headers,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error: %s", exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error={
                "code": "validation_error",
                "message": "Validation error",
                "details": jsonable_encoder(exc.errors()),
            }
        ).model_dump(),
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error={
                "code": "internal_error",
                "message": "Internal server error",
            }
        ).model_dump(),
    )
