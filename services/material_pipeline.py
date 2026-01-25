import uuid
import logging
from sqlalchemy.orm import Session
from models.material import Material
from models.material_way import MaterialWay
from services.ai.gemini_material import gemini_material
from services.storage import r2_storage
from core.database import SessionLocal

logger = logging.getLogger(__name__)

import uuid
import logging
from sqlalchemy.orm import Session
from models.material import Material
from models.material_way import MaterialWay
from services.ai.gemini_material import gemini_material
from services.storage import r2_storage
from core.database import SessionLocal
from schemas.materials import MaterialResponse, MaterialWayResponse
from PIL import Image
import io

logger = logging.getLogger(__name__)

async def run_material_pipeline(title: str, image_bytes: bytes, content_type: str, owner_id: uuid.UUID, db: Session) -> MaterialResponse:
    try:
        # Convert input image to PNG to ensure consistency and valid bitmap
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB to ensure compatibility (stripping alpha if needed, or keep RGBA for png)
            # Keeping RGBA is fine for PNG.
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            image_bytes = buf.getvalue()
            content_type = "image/png"
        except Exception as e:
            logger.error(f"Failed to convert image to PNG: {e}")
            raise e

        # 1. Create Material Record (Initial)
        material_id = uuid.uuid4()
        material = Material(
            id=material_id,
            title=title,
            owner_id=owner_id
        )
        db.add(material)
        db.commit()
        db.refresh(material)

        # 2. Upload Original Image
        # Always PNG now
        original_key = f"materials/{material_id}/original.png"
        r2_storage.upload_bytes(original_key, image_bytes, content_type)

        # 3. Analyze Image (Description)
        description = gemini_material.describe_material(image_bytes, content_type)
        material.description = description
        db.commit()

        # 4. Generate Ways JSON
        ways_data = gemini_material.generate_ways_json(image_bytes, content_type, description)

        # 5. Generate Material Cover Image
        cover_prompt = f"A creative, cartoonish cover image representing: {title}. Context: {description[:200]}"
        material_cover_bytes = gemini_material.generate_image(cover_prompt, image_bytes, content_type)
        
        cover_key = f"materials/{material_id}/cover.png"
        r2_storage.upload_bytes(cover_key, material_cover_bytes, "image/png")

        # 6. Process Ways
        for way_item in ways_data:
            way_id = uuid.uuid4()
            way_title = way_item.get("title", "Untitled")
            way_desc = way_item.get("description", "")
            way_img_prompt = way_item.get("img_prompt", "")

            # Generate Way Cover
            way_cover_bytes = gemini_material.generate_image(way_img_prompt, image_bytes, content_type)
            
            way_cover_key = f"materials/{material_id}/{way_id}/cover.png"
            r2_storage.upload_bytes(way_cover_key, way_cover_bytes, "image/png")

            # Generate Guide (Markdown)
            guide_md = gemini_material.generate_step_guide(
                image_bytes, content_type, title, description, way_title, way_desc
            )

            way = MaterialWay(
                id=way_id,
                material_id=material_id,
                owner_id=owner_id,
                title=way_title,
                description=way_desc,
                md=guide_md
            )
            db.add(way)
        
        db.commit()
        db.refresh(material) # Refresh to get ways relation populated
        
        # Manually map to Pydantic to ensure field mapping
        return MaterialResponse(
            id=material.id,
            title=material.title,
            owner_id=material.owner_id,
            description=material.description,
            created_at=material.created_at,
            ways=[
                MaterialWayResponse(
                    id=w.id,
                    title=w.title,
                    description=w.description,
                    md=w.md,
                    created_at=w.created_at
                ) for w in material.ways
            ]
        )

    except Exception as e:
        logger.error(f"Material pipeline failed: {e}")
        raise e
