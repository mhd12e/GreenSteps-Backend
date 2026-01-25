from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from api.deps import get_current_user
from services.material_pipeline import run_material_pipeline
from schemas.materials import MaterialResponse
from schemas.common import Envelope
import uuid

router = APIRouter(prefix="/materials", tags=["materials"])

@router.post("/generate", response_model=Envelope[MaterialResponse], status_code=status.HTTP_201_CREATED)
async def generate_material(
    title: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read file into memory (assuming reasonable size, lambda limits apply)
        file_bytes = await image.read()
        
        owner_uuid = uuid.UUID(user_id)
        
        material_response = await run_material_pipeline(
            title=title,
            image_bytes=file_bytes,
            content_type=image.content_type,
            owner_id=owner_uuid,
            db=db
        )
        
        return Envelope(data=material_response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
