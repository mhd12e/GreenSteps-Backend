from typing import Any
from pydantic import BaseModel


class UserDataItemRequest(BaseModel):
    item: Any


class UserDataResponse(BaseModel):
    user_data: list[Any]
