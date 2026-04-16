"""Configuration management for the application."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database configuration
    DATABASE_URL: str = "mysql+aiomysql://robotaxi:password@127.0.0.1:3306/robotaxi"

    # AI API Configuration - Kimi
    KIMI_API_KEY: Optional[str] = None
    KIMI_BASE_URL: str = "https://api.moonshot.cn/v1"

    # AI API Configuration - MiniMax
    MINIMAX_API_KEY: Optional[str] = None
    MINIMAX_BASE_URL: str = "https://api.minimax.chat/v1"

    # AI Configuration
    AI_MODEL: str = "moonshot-v1-8k"
    AI_TIMEOUT: int = 60

    # Server Configuration
    DEBUG: bool = False
    LOG_LEVEL: str = "info"
    CORS_ORIGINS: str = "*"

    # Application
    APP_NAME: str = "Robotaxi Feedback Platform"
    API_PREFIX: str = "/api"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
