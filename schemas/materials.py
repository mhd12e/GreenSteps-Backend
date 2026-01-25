from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class MaterialBase(BaseModel):
    title: str

class MaterialCreate(MaterialBase):
    pass # Image is handled via UploadFile/Form in the controller, so this is just for docs/internal use if needed

class MaterialWayResponse(BaseModel):
    id: UUID
    title: str
    description: str
    md: str
    owner_id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class MaterialResponse(MaterialBase):
    id: UUID
    description: Optional[str] = None
    owner_id: UUID
    created_at: datetime
    ways: List[MaterialWayResponse] = []

    model_config = ConfigDict(from_attributes=True)
