from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:pass@localhost:5432/app"
    SERVICE_NAME: str = "greensteps-api"
    
    # Rate Limits
    RATE_LIMIT_STANDARD_PER_MINUTE: int = 60
    RATE_LIMIT_AUTH_PER_MINUTE: int = 5
    RATE_LIMIT_AI_PER_HOUR: int = 5

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    MAX_REFRESH_TOKENS_PER_USER: int = 5

    IMPACT_GENERATION_MODEL: str = "gemini-2.5-flash"
    MATERIAL_TEXT_GENERATION_MODEL: str = "gemini-2.5-flash"
    MATERIAL_IMG_GENERATION_MODEL: str = "gemini-2.5-flash-image"

    GOOGLE_API_KEY: str

    # Cloudflare R2 Configuration
    R2_ENDPOINT_URL: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str
    R2_BUCKET: str

    TURNSTILE_SECRET_KEY_AUTH: str
    TURNSTILE_SECRET_KEY_AI_ACTIONS: str

settings = Settings()