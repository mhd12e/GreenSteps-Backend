import uuid
from sqlalchemy import Column, String, DateTime, Integer, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)

    password_hash = Column(String, nullable=False)

    interests = Column(JSON, nullable=False, default=list)
    
    is_verified = Column(Boolean, nullable=False, default=False, server_default="false")

    created_at = Column(DateTime, server_default=func.now())
