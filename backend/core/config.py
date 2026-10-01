"""Central configuration. All secrets/config come from environment variables only
so the project stays portable (Emergent -> GitHub -> own server) with no vendor lock-in."""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")


class Settings:
    MONGO_URL: str = os.environ["MONGO_URL"]
    DB_NAME: str = os.environ["DB_NAME"]
    JWT_SECRET: str = os.environ["JWT_SECRET"]
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 60 * 12
    REFRESH_TOKEN_DAYS: int = 7
    ADMIN_EMAIL: str = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    ADMIN_PASSWORD: str = os.environ.get("ADMIN_PASSWORD", "admin123")
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    EMERGENT_AUTH_SESSION_URL: str = os.environ.get(
        "EMERGENT_AUTH_SESSION_URL",
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
    )


settings = Settings()

# RBAC roles
ROLES = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE", "SECRETARY", "PATIENT"]
STAFF_ROLES = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE", "SECRETARY"]
CLINICAL_WRITE = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "NURSE"]
MEDICAL_WRITE = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR"]
