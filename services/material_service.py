import logging
import io
import uuid
from typing import List, Optional
from PIL import Image
from sqlalchemy.orm import Session

from models.material import Material
from models.material_way import MaterialWay
from services.ai.gemini_material import gemini_material
from services.storage import r2_storage
from core.database import SessionLocal

logger = logging.getLogger(__name__)

# --- CRUD Operations ---

def get_material(db: Session, material_id: uuid.UUID, owner_id: uuid.UUID) -> Optional[Material]:
    """Fetch a specific material by ID and owner."""
    return db.query(Material).filter(Material.id == material_id, Material.owner_id == owner_id).first()

def list_materials(db: Session, owner_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[Material]:
    """List materials for an owner, ordered by creation date."""
    return (
        db.query(Material)
        .filter(Material.owner_id == owner_id)
        .order_by(Material.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def update_material(db: Session, material_id: uuid.UUID, owner_id: uuid.UUID, title: str) -> Optional[Material]:
    """Update material title."""
    material = get_material(db, material_id, owner_id)
    if not material:
        return None
    material.title = title
    db.commit()
    db.refresh(material)
    return material

def delete_material(db: Session, material_id: uuid.UUID, owner_id: uuid.UUID) -> bool:
    """Delete material from DB and associated assets from R2."""
    material = get_material(db, material_id, owner_id)
    if not material:
        return False
    
    # Cascade delete R2 folder
    try:
        r2_storage.delete_folder(f"materials/{material_id}/")
    except Exception as e:
        logger.error(f"Failed to cleanup R2 storage for material {material_id}: {e}")
    
    db.delete(material)
    db.commit()
    return True

# --- Pipeline Operations ---

def create_initial_material(title: str, image_bytes: bytes, content_type: str, owner_id: uuid.UUID, db: Session) -> Material:
    """Create the initial material record and upload the original image."""
    try:
        # Standardize input image to PNG
        try:
            img = Image.open(io.BytesIO(image_bytes))
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            image_bytes = buf.getvalue()
            content_type = "image/png"
        except Exception as e:
            logger.error(f"Image conversion to PNG failed: {e}")
            raise ValueError("Invalid image format")

        material_id = uuid.uuid4()
        
        # Upload original image to R2
        original_key = f"materials/{material_id}/original.png"
        original_url = r2_storage.upload_bytes(original_key, image_bytes, content_type)
        
        material = Material(
            id=material_id,
            title=title,
            owner_id=owner_id,
            status="queued",
            original_image_uri=original_url
        )
        
        db.add(material)
        db.commit()
        db.refresh(material)
        return material
    except Exception as e:
        logger.error(f"Initial material creation failed: {e}")
        raise

def process_material_background(material_id: uuid.UUID):
    """
    Background worker task to orchestrate the AI pipeline.
    Decoupled from request-response cycle.
    """
    owner_id = None
    try:
        logger.info(f"Starting background processing for material {material_id}")
        
        # 1. Update status to 'processing' and fetch metadata
        with SessionLocal() as db:
            material = db.query(Material).filter(Material.id == material_id).first()
            if not material:
                logger.error(f"Material {material_id} not found in background task")
                return
            
            material.status = "processing"
            db.commit()
            owner_id = material.owner_id
            title = material.title

        # 2. Download original image for AI context
        original_key = f"materials/{material_id}/original.png"
        image_bytes = r2_storage.download_file_bytes(original_key)
        if not image_bytes:
             raise Exception("Original image missing in R2")
        
        content_type = "image/png" 

        # 3. Step: Description
        description = gemini_material.describe_material(image_bytes, content_type)
        with SessionLocal() as db:
            m = db.query(Material).filter(Material.id == material_id).first()
            if m:
                m.description = description
                db.commit()

        # 4. Step: Generate Upcycling Projects (Ways)
        ways_data = gemini_material.generate_ways_json(image_bytes, content_type, description)

        # 5. Step: Generate Material Cover Photo
        cover_prompt = (
            f"A high-quality, realistic, and professional cover photo representing: {title}. "
            f"The image should look like a product showcase or an editorial photo. "
            f"Please include the word '{title}' as clean, modern typography in the center or bottom of the image. "
            f"Context: {description[:200]}"
        )
        material_cover_bytes = gemini_material.generate_image(cover_prompt, image_bytes, content_type)
        
        cover_key = f"materials/{material_id}/cover.png"
        cover_url = r2_storage.upload_bytes(cover_key, material_cover_bytes, "image/png")
        
        with SessionLocal() as db:
            m = db.query(Material).filter(Material.id == material_id).first()
            if m:
                m.image_uri = cover_url
                db.commit()

        # 6. Step: Process each recycling way
        for way_item in ways_data:
            way_id = uuid.uuid4()
            way_title = way_item.get("title", "Untitled Project")
            way_desc = way_item.get("description", "")
            way_img_prompt = way_item.get("img_prompt", "")

            # Generate project cover
            way_cover_bytes = gemini_material.generate_image(way_img_prompt, image_bytes, content_type)
            way_cover_key = f"materials/{material_id}/{way_id}/cover.png"
            way_cover_url = r2_storage.upload_bytes(way_cover_key, way_cover_bytes, "image/png")

            # Generate project guide
            guide_md = gemini_material.generate_step_guide(
                image_bytes, content_type, title, description, way_title, way_desc
            )

            with SessionLocal() as db:
                way = MaterialWay(
                    id=way_id,
                    material_id=material_id,
                    owner_id=owner_id,
                    title=way_title,
                    description=way_desc,
                    image_uri=way_cover_url,
                    md=guide_md
                )
                db.add(way)
                db.commit()
        
        # 7. Success
        with SessionLocal() as db:
            m = db.query(Material).filter(Material.id == material_id).first()
            if m:
                m.status = "ready"
                db.commit()
            
        logger.info(f"Successfully processed material {material_id}")

    except Exception as e:
        logger.error(f"Material pipeline failed for {material_id}: {e}")
        # Cleanup broken state to avoid leaving junk records
        if owner_id:
            with SessionLocal() as db:
                delete_material(db, material_id, owner_id)
                logger.info(f"Cleaned up failed material {material_id}")
        else:
            logger.error(f"Cannot cleanup material {material_id} - metadata missing")
