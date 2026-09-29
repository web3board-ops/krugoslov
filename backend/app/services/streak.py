from datetime import datetime, timedelta
from typing import List, Set, Tuple
import pytz
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Lesson, LessonStatus


def get_local_date(timezone: str) -> str:
    """Get current date in user's timezone as YYYY-MM-DD"""
    tz = pytz.timezone(timezone)
    now = datetime.now(tz)
    return now.strftime("%Y-%m-%d")


def get_resets_at(timezone: str) -> str:
    """Get next midnight in user's timezone"""
    tz = pytz.timezone(timezone)
    now = datetime.now(tz)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return tomorrow.isoformat()


def calculate_streak(completed_dates: List[str], timezone: str) -> dict:
    """
    Calculate streak (algorithm 5.6)
    
    Args:
        completed_dates: List of completed_local_date strings (YYYY-MM-DD)
        timezone: User's timezone
    
    Returns:
        Dict with current, longest, today_done
    """
    if not completed_dates:
        return {"current": 0, "longest": 0, "today_done": False}
    
    tz = pytz.timezone(timezone)
    today = datetime.now(tz).strftime("%Y-%m-%d")
    
    # Get unique dates
    unique_dates: Set[str] = set(completed_dates)
    
    # Check if today is done
    today_done = today in unique_dates
    
    # Find anchor
    anchor = None
    if today_done:
        anchor = today
    else:
        yesterday = (datetime.now(tz) - timedelta(days=1)).strftime("%Y-%m-%d")
        if yesterday in unique_dates:
            anchor = yesterday
    
    if not anchor:
        return {"current": 0, "longest": max(len(unique_dates), 0), "today_done": False}
    
    # Calculate current streak
    current = 0
    check_date = datetime.strptime(anchor, "%Y-%m-%d")
    while check_date.strftime("%Y-%m-%d") in unique_dates:
        current += 1
        check_date -= timedelta(days=1)
    
    # Calculate longest streak
    sorted_dates = sorted(unique_dates)
    longest = 1
    streak = 1
    
    for i in range(1, len(sorted_dates)):
        prev_date = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d")
        curr_date = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
        diff_days = (curr_date - prev_date).days
        
        if diff_days == 1:
            streak += 1
            longest = max(longest, streak)
        else:
            streak = 1
    
    return {
        "current": current,
        "longest": max(longest, current),
        "today_done": today_done
    }


async def get_user_streak(db: AsyncSession, profile_id: int, timezone: str) -> dict:
    """Get streak for user from database"""
    result = await db.execute(
        select(Lesson.completed_local_date).where(
            Lesson.learning_profile_id == profile_id,
            Lesson.status == LessonStatus.completed,
            Lesson.completed_local_date.isnot(None)
        )
    )
    completed_dates = [row[0] for row in result.fetchall()]
    return calculate_streak(completed_dates, timezone)
