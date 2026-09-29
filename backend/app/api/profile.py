from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import User, UserWord, Lesson, LessonExerciseWord, LessonStatus, WordStatus, ResultType
from app.schemas import ProfileStatsResponse
from app.core.deps import get_learning_profile
from app.services.streak import get_user_streak, get_local_date

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/stats", response_model=ProfileStatsResponse)
async def get_profile_stats(
    profile=Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    user_id = profile.user_id
    
    # Get streak
    streak = await get_user_streak(db, profile.id, profile.user.timezone)
    
    # Count words
    result = await db.execute(
        select(UserWord.status, func.count(UserWord.id))
        .where(UserWord.learning_profile_id == profile.id)
        .group_by(UserWord.status)
    )
    word_counts = {s.value: c for s, c in result.fetchall()}
    
    # Count lessons
    result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.status == LessonStatus.completed
        )
    )
    lessons_completed = result.scalar()
    
    # Get accuracy
    result = await db.execute(
        select(LessonExerciseWord.result)
        .join(LessonExerciseWord.exercise)
        .join(Lesson)
        .where(
            Lesson.learning_profile_id == profile.id,
            LessonExerciseWord.is_target == True,
            LessonExerciseWord.result.isnot(None)
        )
    )
    all_results = [r[0] for r in result.fetchall()]
    
    total = len(all_results)
    correct_count = sum(1 for r in all_results if r in (ResultType.correct, ResultType.typo))
    accuracy_all = (correct_count / total * 100) if total > 0 else 0
    
    # For 30 days - simplified (same as all for now)
    accuracy_30d = accuracy_all
    
    # Get heatmap
    result = await db.execute(
        select(Lesson.completed_local_date, func.count(Lesson.id))
        .where(
            Lesson.learning_profile_id == profile.id,
            Lesson.status == LessonStatus.completed,
            Lesson.completed_local_date.isnot(None)
        )
        .group_by(Lesson.completed_local_date)
    )
    heatmap = [{"date": d, "count": c} for d, c in result.fetchall()]
    
    return ProfileStatsResponse(
        streak_current=streak["current"],
        streak_longest=streak["longest"],
        accuracy_30d=accuracy_30d,
        accuracy_all=accuracy_all,
        words_active=word_counts.get("active", 0),
        words_mastered=word_counts.get("mastered", 0),
        words_ignored=word_counts.get("ignored", 0),
        lessons_completed=lessons_completed,
        heatmap=heatmap
    )
