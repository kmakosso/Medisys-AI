from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # Database
    database_url: str = "postgresql+asyncpg://medisys:secret@localhost:5432/medisys_db"

    # JWT
    jwt_secret_key: str = "change_me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Encryption at rest (Fernet / AES-128-CBC)
    field_encryption_key: str = "change_me_generate_a_fernet_key"

    # CORS
    cors_origins: str = "http://localhost:3000"

    # App
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = False

    # Rate limiting
    rate_limit_login: str = "5/minute"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
