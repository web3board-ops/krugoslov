from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import pytz
from app.database import get_db
from app.models import User, LearningProfile, Dictionary, Lesson
from app.schemas import (
    TimezoneRequest, TimezoneResponse, LearningProfileResponse,
    UpdateLearningProfileRequest, DictionaryResponse
)
from app.core.deps import get_current_user_onboarded, get_learning_profile
from app.services.streak import get_local_date, get_resets_at, get_user_streak
from app.config import settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.patch("/timezone", response_model=TimezoneResponse)
async def update_timezone(
    request: TimezoneRequest,
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
):
    # Validate timezone
    try:
        pytz.timezone(request.timezone)
    except pytz.exceptions.UnknownTimeZoneError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_timezone", "message": "Invalid timezone format"}
        )
    
    # Idempotent
    if user.timezone == request.timezone:
        today = get_local_date(request.timezone)
        result = await db.execute(
            select(func.count(Lesson.id)).where(
                Lesson.learning_profile_id == user.learning_profile.id,
                Lesson.started_local_date == today
            )
        )
        lessons_today = result.scalar()
        streak = await get_user_streak(db, user.learning_profile.id, request.timezone)
        return TimezoneResponse(
            today=today,
            lessons_today=lessons_today,
            resets_at=get_resets_at(request.timezone),
            streak=streak
        )
    
    # Check 7-day limit
    if user.timezone_changed_at:
        days_since = (datetime.utcnow() - user.timezone_changed_at).days
        if days_since < 7:
            available_at = user.timezone_changed_at + timedelta(days=7)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "timezone_change_too_soon",
                    "message": "Timezone change too soon",
                    "available_at": available_at.isoformat()
                }
            )
    
    user.timezone = request.timezone
    user.timezone_changed_at = datetime.utcnow()
    
    await db.commit()
    
    # Return updated info
    today = get_local_date(request.timezone)
    result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.learning_profile_id == user.learning_profile.id,
            Lesson.started_local_date == today
        )
    )
    lessons_today = result.scalar()
    streak = await get_user_streak(db, user.learning_profile.id, request.timezone)
    
    return TimezoneResponse(
        today=today,
        lessons_today=lessons_today,
        resets_at=get_resets_at(request.timezone),
        streak=streak
    )


# Learning profile endpoints
router_lp = APIRouter(tags=["learning-profile"])


@router_lp.get("/learning-profile", response_model=LearningProfileResponse)
async def get_learning_profile_info(
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Dictionary).where(Dictionary.id == profile.dictionary_id)
    )
    dictionary = result.scalar_one()
    
    return LearningProfileResponse(
        level=profile.level,
        dictionary_id=profile.dictionary_id,
        dictionary_name=dictionary.name,
        daily_lesson_limit=profile.daily_lesson_limit,
        daily_lesson_limit_max=settings.DAILY_LESSON_LIMIT_MAX
    )


@router_lp.patch("/learning-profile")
async def update_learning_profile(
    request: UpdateLearningProfileRequest,
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    if request.level is not None:
        profile.level = request.level.value
    
    if request.dictionary_id is not None:
        result = await db.execute(
            select(Dictionary).where(Dictionary.id == request.dictionary_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        profile.dictionary_id = request.dictionary_id
    
    if request.daily_lesson_limit is not None:
        if request.daily_lesson_limit > settings.DAILY_LESSON_LIMIT_MAX:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
        profile.daily_lesson_limit = request.daily_lesson_limit
    
    await db.commit()
    
    return {"message": "Profile updated"}


@router_lp.get("/dictionaries", response_model=list[DictionaryResponse])
async def get_dictionaries(
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    from app.models import DictionaryWord
    result = await db.execute(
        select(Dictionary, func.count(DictionaryWord.word_id))
        .outerjoin(DictionaryWord)
        .group_by(Dictionary.id)
    )
    
    dicts = []
    for dict_obj, words_count in result.fetchall():
        dicts.append(DictionaryResponse(
            id=dict_obj.id,
            code=dict_obj.code,
            name=dict_obj.name,
            description=dict_obj.description,
            is_general=dict_obj.is_general,
            words_total=words_count
        ))
    
    return dicts
