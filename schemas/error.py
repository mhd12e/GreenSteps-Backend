from pydantic import BaseModel

class ErrorResponse(BaseModel):
    error_text: str
