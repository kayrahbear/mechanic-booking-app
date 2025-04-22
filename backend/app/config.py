from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    project_id: str | None = None           # GCP project; can be blank on Cloud Run
    google_application_credentials: str | None = None
    firestore_emulator_host: str | None = None

    class Config:
        env_prefix = ""                     # read vars as‑is
        env_file = ".env"                   # dev convenience

settings = Settings()
