import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SentriDose"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Mode
    DEMO_MODE: bool = True
    
    # Security
    JWT_SECRET: str = "sentridose_super_secret_jwt_key_2026_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days for dev
    
    # Environment & CORS
    ENVIRONMENT: str = "production"
    CORS_ORIGINS: str = "*"

    # Database
    DATABASE_URL: str = "sqlite:///./sentridose.db"
    
    # Storage
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    MODEL_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.MODEL_DIR, exist_ok=True)
