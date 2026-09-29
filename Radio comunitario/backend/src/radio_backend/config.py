from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Radio Comunitaria"
    database_url: str = "postgresql+asyncpg://radio:radio@localhost:5432/radio"
    cors_origins: list[str] = ["http://localhost:5173"]
    frontend_url: str = "http://localhost:5173"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60 * 24
    verification_token_expire_hours: int = 24
    youtube_api_key: str = ""
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "radio@example.com"
    skip_percentage: float = 0.5
    queue_limit: int = 3
    repetition_window: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()
