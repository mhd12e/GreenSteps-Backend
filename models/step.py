import uuid
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from core.database import Base


class Step(Base):
    __tablename__ = "steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True, default="")

    # Manual ordering, starts from 1, YOU set it
    order = Column(Integer, nullable=False)

    # Controls whether user can access this step
    unlocked = Column(Boolean, nullable=False, default=False)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    impact_id = Column(UUID(as_uuid=True), ForeignKey("impacts.id"), nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    impact = relationship("Impact", back_populates="steps")
