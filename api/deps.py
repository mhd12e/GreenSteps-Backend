from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from utils.tokens import verify_token

security = HTTPBearer()

def get_current_user(token=Depends(security)):
    payload = verify_token(token.credentials)
    return payload.get("sub")
