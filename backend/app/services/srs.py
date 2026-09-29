from typing import Tuple
from app.models import WordStatus, ResultType


INTERVALS = [1, 2, 3, 7, 11, 30]
MAX_STAGE = 6


def srs_update(stage: int, result: ResultType, lesson_number: int) -> Tuple[int, int | None, WordStatus]:
    """
    SRS update function (algorithm 5.1)
    
    Args:
        stage: Current stage (0-6)
        result: Exercise result (correct, typo, incorrect)
        lesson_number: Current lesson number
    
    Returns:
        Tuple of (new_stage, due_lesson_number, new_status)
    """
    success = result in (ResultType.correct, ResultType.typo)
    
    if success:
        if stage == MAX_STAGE:
            return (MAX_STAGE, None, WordStatus.mastered)
        new_stage = stage + 1
    else:
        new_stage = max(stage - 1, 0)
    
    interval = INTERVALS[max(new_stage - 1, 0)]
    due_lesson_number = lesson_number + interval
    
    return (new_stage, due_lesson_number, WordStatus.active)
