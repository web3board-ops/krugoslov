from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import LearningProfile, UserWord, Lesson, LessonStatus, Dictionary, WordStatus
from app.schemas import DashboardResponse
from app.core.deps import get_learning_profile
from app.services.streak import get_local_date, get_resets_at, get_user_streak

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardResponse)
async def get_dashboard_summary(
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    user_id = profile.user_id
    
    # Get dictionary name
    result = await db.execute(select(Dictionary).where(Dictionary.id == profile.dictionary_id))
    dictionary = result.scalar_one()
    
    # Get today's date in user's timezone
    result = await db.execute(select(LearningProfile.user_id).where(LearningProfile.id == profile.id))
    # We need user's timezone - get from profile's user
    from app.models import User
    result = await db.execute(select(User.timezone).where(User.id == user_id))
    timezone = result.scalar_one()
    
    today = get_local_date(timezone)
    
    # Count lessons today
    result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.started_local_date == today
        )
    )
    lessons_today = result.scalar()
    
    # Count words by status
    result = await db.execute(
        select(UserWord.status, func.count(UserWord.id))
        .where(UserWord.learning_profile_id == profile.id)
        .group_by(UserWord.status)
    )
    word_counts = {status.value: count for status, count in result.fetchall()}
    
    words_active = word_counts.get("active", 0)
    words_mastered = word_counts.get("mastered", 0)
    words_ignored = word_counts.get("ignored", 0)
    
    # Get streak
    streak = await get_user_streak(db, profile.id, timezone)
    
    # Determine CTA
    result = await db.execute(
        select(Lesson).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.status == LessonStatus.in_progress
        )
    )
    in_progress_lesson = result.scalar_one_or_none()
    
    cta = "start"
    resume = None
    
    if in_progress_lesson:
        cta = "resume"
        # Count completed exercises
        result = await db.execute(
            select(func.count()).select_from(Lesson).where(
                Lesson.id == in_progress_lesson.id
            )
        )
        from app.models import LessonExercise, ExerciseStatus
        result = await db.execute(
            select(
                func.count(LessonExercise.id).filter(LessonExercise.status == ExerciseStatus.evaluated),
                func.count(LessonExercise.id)
            ).where(LessonExercise.lesson_id == in_progress_lesson.id)
        )
        exercises_done, exercises_total = result.one()
        resume = {
            "lesson_id": in_progress_lesson.id,
            "exercises_done": exercises_done,
            "exercises_total": exercises_total
        }
    elif lessons_today >= profile.daily_lesson_limit:
        cta = "limit_reached"
    
    return DashboardResponse(
        level=profile.level,
        dictionary_name=dictionary.name,
        today=today,
        lessons_today=lessons_today,
        daily_lesson_limit=profile.daily_lesson_limit,
        resets_at=get_resets_at(timezone),
        cta=cta,
        resume=resume,
        words={
            "active": words_active,
            "mastered": words_mastered,
            "ignored": words_ignored
        },
        streak=streak
    )
