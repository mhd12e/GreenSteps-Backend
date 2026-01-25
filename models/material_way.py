import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class MaterialWay(Base):
    __tablename__ = "material_ways"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    material_id = Column(UUID(as_uuid=True), ForeignKey("materials.id", ondelete="CASCADE"), nullable=False, index=True)

    # Optional: keep owner_id for access control checks (same pattern as Step/Impact)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # From Gemini JSON "ways"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    # Full guide output (markdown) for this way
    md = Column(Text, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    material = relationship("Material", back_populates="ways")