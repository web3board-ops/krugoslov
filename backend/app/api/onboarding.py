from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pytz
from app.database import get_db
from app.models import User, LearningProfile, Dictionary, Event
from app.schemas import OnboardingRequest
from app.core.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/complete")
async def complete_onboarding(
    request: OnboardingRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user.is_onboarded:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_onboarded", "message": "Already onboarded"}
        )
    
    # Validate timezone
    try:
        pytz.timezone(request.timezone)
    except pytz.exceptions.UnknownTimeZoneError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_timezone", "message": "Invalid timezone"}
        )
    
    # Check general dictionary exists
    result = await db.execute(
        select(Dictionary).where(Dictionary.is_general == True)
    )
    general_dict = result.scalar_one_or_none()
    
    if not general_dict:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "general_dictionary_missing", "message": "General dictionary not loaded"}
        )
    
    # Update user
    user.timezone = request.timezone
    user.is_onboarded = True
    
    # Create learning profile
    profile = LearningProfile(
        user_id=user.id,
        level=request.level.value,
        dictionary_id=general_dict.id,
        daily_lesson_limit=settings.DAILY_LESSON_LIMIT_DEFAULT,
        last_lesson_number=0
    )
    db.add(profile)
    
    # Create event
    event = Event(
        user_id=user.id,
        type="onboarding_completed",
        payload={"timezone": request.timezone, "level": request.level.value}
    )
    db.add(event)
    
    await db.commit()
    
    return {"message": "Onboarding completed"}
