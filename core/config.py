from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:pass@localhost:5432/app"
    SERVICE_NAME: str = "greensteps-api"
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_IP_PER_MINUTE: int = 30
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    MAX_REFRESH_TOKENS_PER_USER: int = 5
    IMPACT_GENERATION_MODEL: str = "gemini-2.5-flash"
    MATERIAL_TEXT_GENERATION_MODEL: str = "gemini-2.5-flash"
    MATERIAL_IMG_GENERATION_MODEL: str = "gemini-2.5-flash-image"

settings = Settings()
