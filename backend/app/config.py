from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # JWT
    JWT_SECRET: str
    ACCESS_TOKEN_TTL_MIN: int = 30
    REFRESH_TOKEN_TTL_DAYS: int = 30
    
    # Lessons
    WORDS_PER_LESSON: int = 5
    DAILY_LESSON_LIMIT_DEFAULT: int = 3
    DAILY_LESSON_LIMIT_MAX: int = 5
    
    # GigaChat
    GIGACHAT_AUTH_KEY: str
    GIGACHAT_SCOPE: str = "GIGACHAT_API_PERS"
    GIGACHAT_MODEL: str = "GigaChat"
    GIGACHAT_CA_CERT_PATH: str | None = None
    GIGACHAT_MAX_CONCURRENCY: int = 5
    
    # LLM
    GEN_TEMPERATURE: float = 0.7
    EVAL_TEMPERATURE: float = 0.2
    LLM_LOG_RETENTION_DAYS: int = 90
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
