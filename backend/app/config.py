from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Core GCP Configuration
    project_id: Optional[str] = None
    google_application_credentials: Optional[str] = None
    
    # Firebase/Firestore Configuration
    firestore_emulator_host: Optional[str] = None
    firebase_auth_emulator_host: Optional[str] = None
    
    # Application Configuration
    environment: str = "development"
    debug: bool = False
    cors_origins: list[str] = ["*"]
    
    # Google Calendar Integration
    google_calendar_enabled: bool = True
    
    # Notification Configuration
    notification_enabled: bool = True
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    class Config:
        env_prefix = ""
        env_file = ".env"
        
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"

settings = Settings()