from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from app.database import get_db
from app.models import User, UserWord, Word, LessonExerciseWord, LessonExercise, Lesson, WordStatus
from app.schemas import VocabularyListResponse, VocabularyWordResponse, WordCardResponse, ChangeWordStatusRequest
from app.core.deps import get_learning_profile

router = APIRouter(prefix="/vocabulary", tags=["vocabulary"])


@router.get("/list", response_model=VocabularyListResponse)
async def get_vocabulary_list(
    status_filter: Optional[str] = Query(None, alias="status"),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    profile=Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    query = select(UserWord, Word).join(Word).where(
        UserWord.learning_profile_id == profile.id
    )
    
    if status_filter:
        try:
            ws = WordStatus(status_filter)
            query = query.where(UserWord.status == ws)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                Word.lemma.ilike(search),
                func.cast(Word.translations, str).ilike(search)
            )
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # Paginate
    query = query.order_by(Word.lemma).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()
    
    words = []
    for uw, word in rows:
        words.append(VocabularyWordResponse(
            id=word.id,
            lemma=word.lemma,
            pos=word.pos,
            translations=word.translations,
            status=uw.status,
            stage=uw.stage,
            due=uw.due_lesson_number
        ))
    
    return VocabularyListResponse(words=words, total=total)


@router.get("/word/{word_id}", response_model=WordCardResponse)
async def get_word_card(
    word_id: int,
    profile=Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserWord, Word).join(Word).where(
            UserWord.learning_profile_id == profile.id,
            UserWord.word_id == word_id
        )
    )
    row = result.one_or_none()
    
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    uw, word = row
    
    # Get history
    result = await db.execute(
        select(LessonExerciseWord, LessonExercise, Lesson)
        .join(LessonExercise)
        .join(Lesson)
        .where(
            Lesson.learning_profile_id == profile.id,
            LessonExerciseWord.word_id == word_id,
            LessonExerciseWord.is_target == True
        )
        .order_by(Lesson.started_at.desc())
        .limit(20)
    )
    
    history = []
    for ew, ex, lesson in result.fetchall():
        history.append({
            "sentence": ex.target_sentence,
            "translation": ex.reference_translation,
            "surface_form": ew.surface_form,
            "result": ew.result.value if ew.result else None,
            "date": lesson.completed_at or lesson.started_at
        })
    
    return WordCardResponse(
        id=word.id,
        lemma=word.lemma,
        pos=word.pos,
        translations=word.translations,
        status=uw.status,
        stage=uw.stage,
        due=uw.due_lesson_number,
        history=history
    )


@router.patch("/word/{word_id}/status")
async def change_word_status(
    word_id: int,
    request: ChangeWordStatusRequest,
    profile=Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserWord).where(
            UserWord.learning_profile_id == profile.id,
            UserWord.word_id == word_id
        )
    )
    uw = result.scalar_one_or_none()
    
    if not uw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    current = uw.status
    target = request.status
    
    if current == target:
        return {"message": "Status unchanged"}
    
    valid_transitions = {
        (WordStatus.active, WordStatus.ignored),
        (WordStatus.ignored, WordStatus.active),
        (WordStatus.mastered, WordStatus.active),
    }
    
    if (current, target) not in valid_transitions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "invalid_transition", "message": f"Cannot transition from {current} to {target}"}
        )
    
    uw.status = target
    
    if target == WordStatus.ignored:
        uw.due_lesson_number = None
    elif target == WordStatus.active:
        uw.stage = 0
        uw.due_lesson_number = profile.last_lesson_number + 1
    
    await db.commit()
    
    return {"message": "Status updated"}
