from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.config import settings
from app.api import auth, onboarding, dashboard, lesson, vocabulary, profile, settings as settings_api, admin

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="WordFlow API",
    description="Интервальное повторение иностранных слов в контексте",
    version="1.0.0"
)

# CORS
logger.info(f"CORS origins: {settings.cors_origins_list}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(dashboard.router)
app.include_router(lesson.router)
app.include_router(vocabulary.router)
app.include_router(profile.router)
app.include_router(settings_api.router)
app.include_router(settings_api.router_lp)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"message": "WordFlow API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
