from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class MaterialBase(BaseModel):
    title: str

class MaterialCreate(MaterialBase):
    pass # Image is handled via UploadFile/Form in the controller, so this is just for docs/internal use if needed

class MaterialUpdate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)

class MaterialWayResponse(BaseModel):
    id: UUID
    title: str
    description: str
    md: str
    image_uri: Optional[str] = Field(None, description="Public URL of the generated cover image")
    owner_id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class MaterialResponse(MaterialBase):
    id: UUID
    description: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    image_uri: Optional[str] = Field(None, description="Public URL of the generated cover image")
    original_image_uri: Optional[str] = Field(None, description="Public URL of the original upload")
    owner_id: UUID
    created_at: datetime
    ways: List[MaterialWayResponse] = []

    model_config = ConfigDict(from_attributes=True)
