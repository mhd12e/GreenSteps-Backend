from api.deps import get_current_user, rate_limit_standard, rate_limit_ai

from core.config import settings
from services.turnstile import verify_turnstile_token

router = APIRouter(prefix="/materials", tags=["materials"])

@router.post("/generate", response_model=Envelope[MaterialResponse], status_code=status.HTTP_202_ACCEPTED)
async def generate_material(
    request: Request,
    title: str = Form(...),
    image: UploadFile = File(...),
    turnstile_token: str = Form(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _ = Depends(rate_limit_ai)
):
    """
    Create a new material and start the AI generation pipeline in the background.
    Returns the initial record immediately.
    """
    verify_turnstile_token(turnstile_token, secret_key=settings.TURNSTILE_SECRET_KEY_AI_ACTIONS, remote_ip=request.client.host)
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Enforce 5MB limit
    MAX_SIZE = 5 * 1024 * 1024 # 5MB
    image.file.seek(0, 2) # Seek to end
    file_size = image.file.tell()
    image.file.seek(0) # Seek back to start
    
    if file_size > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_PAYLOAD_TOO_LARGE, 
            detail="Image size exceeds 5MB limit"
        )

    try:
        # Read file into memory
        file_bytes = await image.read()
        
        owner_uuid = uuid.UUID(user_id)
        
        # Create initial record synchronously (and upload to R2)
        material = create_initial_material(
            title=title,
            image_bytes=file_bytes,
            content_type=image.content_type,
            owner_id=owner_uuid,
            db=db
        )
        
        # Trigger background pipeline via dedicated queue
        enqueue_material(material.id)
        
        return Envelope(data=MaterialResponse.model_validate(material))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=Envelope[List[MaterialResponse]])
def list_user_materials(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _ = Depends(rate_limit_standard)
):
    """List all materials owned by the current user."""
    owner_uuid = uuid.UUID(user_id)
    materials = list_materials(db, owner_uuid, skip, limit)
    return Envelope(data=[MaterialResponse.model_validate(m) for m in materials])

@router.get("/{material_id}", response_model=Envelope[MaterialResponse])
def get_material_detail(
    material_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _ = Depends(rate_limit_standard)
):
    """Get full details of a specific material, including recycling ways."""
    owner_uuid = uuid.UUID(user_id)
    material = get_material(db, material_id, owner_uuid)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return Envelope(data=MaterialResponse.model_validate(material))

@router.patch("/{material_id}", response_model=Envelope[MaterialResponse])
def edit_material_title(
    material_id: uuid.UUID,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _ = Depends(rate_limit_standard)
):
    """Update only the title of a specific material."""
    owner_uuid = uuid.UUID(user_id)
    material = update_material(db, material_id, owner_uuid, data.title)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return Envelope(data=MaterialResponse.model_validate(material))

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_material(
    material_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _ = Depends(rate_limit_standard)
):
    """Delete a material and its associated assets from R2."""
    owner_uuid = uuid.UUID(user_id)
    success = delete_material(db, material_id, owner_uuid)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return None

@router.get("/{material_id}/status", status_code=status.HTTP_200_OK)
def get_material_status(
    material_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
    _ = Depends(rate_limit_standard)
):
    """Lightweight endpoint to poll for generation status."""
    owner_uuid = uuid.UUID(user_id)
    material = get_material(db, material_id, owner_uuid)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    return {
        "status": "ok",
        "data": {
            "id": str(material.id),
            "status": material.status,
            "error_message": material.error_message
        }
    }
