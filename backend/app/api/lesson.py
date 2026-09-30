from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
from typing import Optional
import unicodedata
import re
from datetime import datetime
from app.database import get_db
from app.models import (
    User, LearningProfile, UserWord, Word, Lesson, LessonExercise,
    LessonExerciseWord, LessonExerciseSuggestion, Dictionary, Event,
    WordStatus, LessonStatus, ExerciseStatus, ResultType, SuggestionState,
    DictionaryWord
)
from app.schemas import (
    PreviewResponse, StartLessonRequest, LessonStartResponse,
    EvaluateRequest, EvaluateResponse, DeclineWordRequest,
    SuggestionActionRequest, LessonCurrentResponse, LessonSummaryResponse
)
from app.core.deps import get_current_user_onboarded, get_learning_profile
from app.services.lesson import (
    select_words_for_lesson, cluster_words, get_avoid_sentences,
    generate_sentences, evaluate_translation, normalize_lemma
)
from app.services.srs import srs_update
from app.services.streak import get_local_date, get_resets_at, get_user_streak
from app.config import settings

router = APIRouter(prefix="/lesson", tags=["lesson"])


@router.post("/preview", response_model=PreviewResponse)
async def preview_lesson(
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    # Check for in-progress lesson
    result = await db.execute(
        select(Lesson).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.status == LessonStatus.in_progress
        )
    )
    in_progress = result.scalar_one_or_none()
    
    if in_progress:
        result = await db.execute(
            select(
                func.count(LessonExercise.id).filter(LessonExercise.status == ExerciseStatus.evaluated),
                func.count(LessonExercise.id)
            ).where(LessonExercise.lesson_id == in_progress.id)
        )
        done, total = result.one()
        return PreviewResponse(
            state="resume",
            lesson_id=in_progress.id,
            exercises_done=done,
            exercises_total=total
        )
    
    # Check limit
    user_timezone = profile.user.timezone
    today = get_local_date(user_timezone)
    result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.started_local_date == today
        )
    )
    lessons_today = result.scalar()
    
    if lessons_today >= profile.daily_lesson_limit:
        return PreviewResponse(
            state="limit_reached",
            resets_at=get_resets_at(user_timezone)
        )
    
    # Select words
    next_lesson_number = profile.last_lesson_number + 1
    due_words, new_words, dict_exhausted = await select_words_for_lesson(
        db, profile, next_lesson_number
    )
    
    if not due_words and not new_words:
        return PreviewResponse(state="no_words")
    
    return PreviewResponse(
        state="ready",
        lesson_number=next_lesson_number,
        due_words=[
            {"word_id": uw.word_id, "lemma": uw.word.lemma, "pos": uw.word.pos}
            for uw in due_words
        ],
        new_words=[
            {"word_id": w.id, "lemma": w.lemma, "pos": w.pos, "translations": w.translations}
            for w in new_words
        ],
        dictionary_exhausted=dict_exhausted
    )


@router.post("/new-word/decline", response_model=PreviewResponse)
async def decline_new_word(
    request: DeclineWordRequest,
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    # Check no in-progress lesson
    result = await db.execute(
        select(Lesson).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.status == LessonStatus.in_progress
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "lesson_in_progress", "message": "Lesson in progress"}
        )
    
    # Check word is in dictionary
    result = await db.execute(
        select(DictionaryWord).where(
            DictionaryWord.dictionary_id == profile.dictionary_id,
            DictionaryWord.word_id == request.word_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    # Check existing user_word
    result = await db.execute(
        select(UserWord).where(
            UserWord.learning_profile_id == profile.id,
            UserWord.word_id == request.word_id
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        if existing.status == WordStatus.ignored:
            pass  # Idempotent
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT)
    else:
        # Create ignored user_word
        user_word = UserWord(
            learning_profile_id=profile.id,
            word_id=request.word_id,
            status=WordStatus.ignored,
            stage=0,
            due_lesson_number=None
        )
        db.add(user_word)
    
    # Return updated preview
    return await preview_lesson(profile, db)


@router.post("/start", response_model=LessonStartResponse)
async def start_lesson(
    request: StartLessonRequest,
    profile: LearningProfile = Depends(get_learning_profile),
    db: AsyncSession = Depends(get_db)
):
    user_id = profile.user_id
    
    # Check no in-progress lesson
    result = await db.execute(
        select(Lesson).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.status == LessonStatus.in_progress
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "resume_available", "message": "Lesson already in progress"}
        )
    
    # Check limit
    today = get_local_date(profile.user.timezone)
    result = await db.execute(
        select(func.count(Lesson.id)).where(
            Lesson.learning_profile_id == profile.id,
            Lesson.started_local_date == today
        )
    )
    if result.scalar() >= profile.daily_lesson_limit:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "limit_reached", "message": "Daily limit reached"}
        )
    
    next_lesson_number = profile.last_lesson_number + 1
    
    # Get words
    word_ids = request.word_ids
    result = await db.execute(select(Word).where(Word.id.in_(word_ids)))
    words_map = {w.id: w for w in result.scalars().all()}
    
    if len(words_map) != len(word_ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    # Cluster words
    seed = f"{profile.id}:{next_lesson_number}"
    groups = cluster_words(word_ids, seed)
    
    # Get avoid sentences
    avoid = await get_avoid_sentences(db, profile.id, word_ids)
    
    # Generate sentences
    try:
        generated = await generate_sentences(
            groups, words_map, profile.level, avoid, user_id, 0
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "llm_unavailable", "message": str(e)}
        )
    
    # Create lesson
    lesson = Lesson(
        learning_profile_id=profile.id,
        lesson_number=next_lesson_number,
        status=LessonStatus.in_progress,
        words_per_lesson=len(word_ids),
        started_local_date=today
    )
    db.add(lesson)
    await db.flush()
    
    # Create exercises
    for i, (group, gen_data) in enumerate(zip(groups, generated)):
        exercise = LessonExercise(
            lesson_id=lesson.id,
            order_index=i,
            target_sentence=gen_data["sentence"],
            reference_translation=gen_data["reference_translation"],
            status=ExerciseStatus.pending
        )
        db.add(exercise)
        await db.flush()
        
        # Create exercise words
        for word_data in gen_data["words"]:
            word_id = next(wid for wid, w in words_map.items() if w.lemma == word_data["lemma"] and w.pos == word_data["pos"])
            
            # Check if new
            result = await db.execute(
                select(UserWord).where(
                    UserWord.learning_profile_id == profile.id,
                    UserWord.word_id == word_id
                )
            )
            existing_uw = result.scalar_one_or_none()
            is_new = existing_uw is None
            
            exercise_word = LessonExerciseWord(
                exercise_id=exercise.id,
                word_id=word_id,
                is_target=True,
                is_new=is_new,
                surface_form=word_data["surface_form"]
            )
            db.add(exercise_word)
            
            # Create user_word if new
            if is_new:
                user_word = UserWord(
                    learning_profile_id=profile.id,
                    word_id=word_id,
                    status=WordStatus.active,
                    stage=0,
                    due_lesson_number=next_lesson_number
                )
                db.add(user_word)
    
    # Update profile
    profile.last_lesson_number = next_lesson_number
    
    # Create event
    event = Event(user_id=user_id, type="lesson_started", payload={"lesson_id": lesson.id})
    db.add(event)
    
    # Get first exercise explicitly (can't use lazy loading in async)
    result = await db.execute(
        select(LessonExercise)
        .where(LessonExercise.lesson_id == lesson.id)
        .order_by(LessonExercise.order_index)
        .limit(1)
    )
    first_exercise = result.scalar_one_or_none()
    
    first_exercise_id = first_exercise.id if first_exercise else None
    first_exercise_order = first_exercise.order_index if first_exercise else None
    first_exercise_sentence = first_exercise.target_sentence if first_exercise else None
    
    await db.commit()
    
    return LessonStartResponse(
        lesson_id=lesson.id,
        lesson_number=next_lesson_number,
        exercises_total=len(groups),
        current_exercise={
            "exercise_id": first_exercise_id,
            "order_index": first_exercise_order,
            "sentence": first_exercise_sentence
        }
    )


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_exercise(
    request: EvaluateRequest,
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
):
    # Get exercise
    result = await db.execute(
        select(LessonExercise)
        .join(Lesson)
        .where(LessonExercise.id == request.exercise_id)
    )
    exercise = result.scalar_one_or_none()
    
    if not exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    lesson = exercise.lesson
    
    # Check lesson is in progress
    if lesson.status != LessonStatus.in_progress:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "lesson_not_active", "message": "Lesson not active"}
        )
    
    # Check ownership
    if lesson.learning_profile_id != user.learning_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    # Check if already evaluated (idempotent)
    if exercise.status == ExerciseStatus.evaluated:
        # Return saved result
        return await _build_evaluate_response(db, exercise)
    
    # Check this is the current exercise
    result = await db.execute(
        select(LessonExercise).where(
            LessonExercise.lesson_id == lesson.id,
            LessonExercise.status == ExerciseStatus.pending
        ).order_by(LessonExercise.order_index)
    )
    current = result.scalars().first()
    
    if current.id != exercise.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "not_current_exercise", "message": "Not current exercise"}
        )
    
    # Validate input
    if not request.dont_know:
        if not request.user_translation:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
        
        # Normalize
        translation = unicodedata.normalize("NFC", request.user_translation.strip())
        translation = re.sub(r'\s+', ' ', translation)
        translation = translation.replace("<<<", "").replace(">>>", "")
        
        if len(translation) < 1 or len(translation) > 500:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    # Get target words
    result = await db.execute(
        select(LessonExerciseWord).where(
            LessonExerciseWord.exercise_id == exercise.id,
            LessonExerciseWord.is_target == True
        )
    )
    target_words = list(result.scalars().all())
    
    # Evaluate
    if request.dont_know:
        # Don't call LLM
        evaluations = [
            {"word_id": tw.word_id, "result": "incorrect", "user_fragment": None}
            for tw in target_words
        ]
        suggestions = []
    else:
        # Call LLM
        target_words_data = []
        for tw in target_words:
            word = tw.word
            target_words_data.append({
                "word_id": tw.word_id,
                "lemma": word.lemma,
                "pos": word.pos,
                "surface_form": tw.surface_form,
                "correct_translations": word.translations
            })
        
        try:
            llm_result = await evaluate_translation(
                exercise.target_sentence,
                exercise.reference_translation,
                target_words_data,
                request.user_translation,
                user.id,
                lesson.id,
                exercise.id
            )
            evaluations = llm_result["evaluations"]
            suggestions = llm_result.get("new_suggested_words", [])
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "llm_unavailable", "message": str(e)}
            )
    
    # Update exercise words
    for eval_item in evaluations:
        word_id = eval_item["word_id"]
        result_type = ResultType(eval_item["result"])
        
        # Get user_word
        result = await db.execute(
            select(UserWord).where(
                UserWord.learning_profile_id == lesson.learning_profile_id,
                UserWord.word_id == word_id
            )
        )
        user_word = result.scalar_one_or_none()
        
        if user_word and user_word.status == WordStatus.active:
            stage_before = user_word.stage
            new_stage, new_due, new_status = srs_update(
                stage_before, result_type, lesson.lesson_number
            )
            
            user_word.stage = new_stage
            user_word.due_lesson_number = new_due
            user_word.status = new_status
            user_word.last_reviewed_at = datetime.utcnow()
            
            # Update exercise word
            for tw in target_words:
                if tw.word_id == word_id:
                    tw.result = result_type
                    tw.user_fragment = eval_item.get("user_fragment")
                    tw.stage_before = stage_before
                    tw.stage_after = new_stage
                    break
    
    # Update exercise
    exercise.user_translation = request.user_translation if not request.dont_know else None
    exercise.dont_know = request.dont_know
    exercise.status = ExerciseStatus.evaluated
    exercise.evaluated_at = datetime.utcnow()
    
    # Add suggestions
    for sugg in suggestions[:3]:
        lemma_key = normalize_lemma(sugg["lemma"])
        result = await db.execute(
            select(Word).where(
                Word.lemma_key == lemma_key,
                Word.pos == sugg["pos"]
            )
        )
        word = result.scalar_one_or_none()
        
        if word:
            # Check not already in user_words
            result = await db.execute(
                select(UserWord).where(
                    UserWord.learning_profile_id == lesson.learning_profile_id,
                    UserWord.word_id == word.id
                )
            )
            if not result.scalar_one_or_none():
                suggestion = LessonExerciseSuggestion(
                    exercise_id=exercise.id,
                    word_id=word.id,
                    state=SuggestionState.suggested
                )
                db.add(suggestion)
    
    # Check if lesson is complete
    result = await db.execute(
        select(func.count(LessonExercise.id)).where(
            LessonExercise.lesson_id == lesson.id,
            LessonExercise.status == ExerciseStatus.pending
        )
    )
    pending_count = result.scalar()
    
    if pending_count == 0:
        lesson.status = LessonStatus.completed
        lesson.completed_at = datetime.utcnow()
        lesson.completed_local_date = get_local_date(user.timezone)
        
        event = Event(user_id=user.id, type="lesson_completed", payload={"lesson_id": lesson.id})
        db.add(event)
    
    # Create event
    event = Event(
        user_id=user.id,
        type="exercise_evaluated",
        payload={"exercise_id": exercise.id, "lesson_id": lesson.id}
    )
    db.add(event)
    
    await db.commit()
    
    return await _build_evaluate_response(db, exercise)


async def _build_evaluate_response(db: AsyncSession, exercise: LessonExercise) -> EvaluateResponse:
    """Build evaluate response from exercise"""
    from sqlalchemy.orm import selectinload
    
    # Get target words with related word data
    result = await db.execute(
        select(LessonExerciseWord)
        .options(selectinload(LessonExerciseWord.word))
        .where(
            LessonExerciseWord.exercise_id == exercise.id,
            LessonExerciseWord.is_target == True
        )
    )
    target_words = list(result.scalars().all())
    
    words_response = []
    for tw in target_words:
        word = tw.word
        words_response.append({
            "word_id": word.id,
            "lemma": word.lemma,
            "pos": word.pos,
            "surface_form": tw.surface_form,
            "result": tw.result,
            "user_fragment": tw.user_fragment,
            "translations": word.translations
        })
    
    # Get suggestions with related word data
    result = await db.execute(
        select(LessonExerciseSuggestion)
        .options(selectinload(LessonExerciseSuggestion.word))
        .where(
            LessonExerciseSuggestion.exercise_id == exercise.id
        )
    )
    suggestions_db = list(result.scalars().all())
    
    suggestions_response = []
    for sugg in suggestions_db:
        word = sugg.word
        suggestions_response.append({
            "word_id": word.id,
            "lemma": word.lemma,
            "pos": word.pos,
            "translations": word.translations
        })
    
    # Check if lesson completed - reload lesson to get current status
    result = await db.execute(
        select(Lesson).where(Lesson.id == exercise.lesson_id)
    )
    lesson = result.scalar_one_or_none()
    lesson_completed = lesson.status == LessonStatus.completed if lesson else False
    
    return EvaluateResponse(
        exercise_id=exercise.id,
        target_sentence=exercise.target_sentence,
        reference_translation=exercise.reference_translation,
        user_translation=exercise.user_translation,
        words=words_response,
        suggestions=suggestions_response,
        lesson_completed=lesson_completed
    )


@router.get("/{lesson_id}/current", response_model=LessonCurrentResponse)
async def get_current_exercise(
    lesson_id: int,
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson or lesson.learning_profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if lesson.status != LessonStatus.in_progress:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "lesson_not_active", "message": "Lesson not active"}
        )
    
    result = await db.execute(
        select(LessonExercise).where(
            LessonExercise.lesson_id == lesson_id,
            LessonExercise.status == ExerciseStatus.pending
        ).order_by(LessonExercise.order_index)
    )
    exercise = result.scalars().first()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "lesson_not_active", "message": "No pending exercises"}
        )
    
    return LessonCurrentResponse(
        exercise_id=exercise.id,
        order_index=exercise.order_index,
        sentence=exercise.target_sentence
    )


@router.post("/{lesson_id}/abandon")
async def abandon_lesson(
    lesson_id: int,
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson or lesson.learning_profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if lesson.status == LessonStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "lesson_not_active", "message": "Lesson already completed"}
        )
    
    if lesson.status == LessonStatus.abandoned:
        return {"message": "Already abandoned"}
    
    lesson.status = LessonStatus.abandoned
    lesson.abandoned_at = datetime.utcnow()
    
    event = Event(user_id=user.id, type="lesson_abandoned", payload={"lesson_id": lesson_id})
    db.add(event)
    
    await db.commit()
    
    return {"message": "Lesson abandoned"}


@router.get("/{lesson_id}/summary", response_model=LessonSummaryResponse)
async def get_lesson_summary(
    lesson_id: int,
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    
    if not lesson or lesson.learning_profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if lesson.status != LessonStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "lesson_not_completed", "message": "Lesson not completed"}
        )
    
    # Get all exercise words
    result = await db.execute(
        select(LessonExerciseWord).join(LessonExercise).where(
            LessonExercise.lesson_id == lesson_id,
            LessonExerciseWord.is_target == True
        )
    )
    all_words = list(result.scalars().all())
    
    words_total = len(all_words)
    new_words = sum(1 for w in all_words if w.is_new)
    reviewed = words_total - new_words
    correct = sum(1 for w in all_words if w.result == ResultType.correct)
    typo = sum(1 for w in all_words if w.result == ResultType.typo)
    incorrect = sum(1 for w in all_words if w.result == ResultType.incorrect)
    
    # Count exercises without errors
    result = await db.execute(
        select(LessonExercise).where(LessonExercise.lesson_id == lesson_id)
    )
    exercises = list(result.scalars().all())
    without_errors = sum(
        1 for ex in exercises
        if all(w.result in (ResultType.correct, ResultType.typo) for w in ex.words if w.is_target)
    )
    
    # Count suggestions added
    result = await db.execute(
        select(func.count(LessonExerciseSuggestion.id)).join(LessonExercise).where(
            LessonExercise.lesson_id == lesson_id,
            LessonExerciseSuggestion.state == SuggestionState.added
        )
    )
    suggestions_added = result.scalar()
    
    # Get streak
    streak = await get_user_streak(db, lesson.learning_profile_id, user.timezone)
    
    # Check if extended today
    extended_today = lesson.completed_local_date == get_local_date(user.timezone)
    
    return LessonSummaryResponse(
        lesson_number=lesson.lesson_number,
        words_total=words_total,
        reviewed=reviewed,
        new_words=new_words,
        correct=correct,
        typo=typo,
        incorrect=incorrect,
        without_errors=without_errors,
        suggestions_added=suggestions_added,
        streak={**streak, "extended_today": extended_today}
    )


@router.post("/exercises/{exercise_id}/suggestions/{word_id}")
async def handle_suggestion(
    exercise_id: int,
    word_id: int,
    request: SuggestionActionRequest,
    user: User = Depends(get_current_user_onboarded),
    db: AsyncSession = Depends(get_db)
):
    # Get suggestion
    result = await db.execute(
        select(LessonExerciseSuggestion)
        .join(LessonExercise)
        .join(Lesson)
        .where(
            LessonExerciseSuggestion.exercise_id == exercise_id,
            LessonExerciseSuggestion.word_id == word_id,
            Lesson.learning_profile_id == user.learning_profile.id
        )
    )
    suggestion = result.scalar_one_or_none()
    
    if not suggestion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if request.action == "add":
        if suggestion.state == SuggestionState.added:
            return {"message": "Already added"}
        
        # Add to user_words
        result = await db.execute(
            select(UserWord).where(
                UserWord.learning_profile_id == user.learning_profile.id,
                UserWord.word_id == word_id
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "already_in_vocabulary", "message": "Word already in vocabulary"}
            )
        
        lesson = suggestion.exercise.lesson
        user_word = UserWord(
            learning_profile_id=user.learning_profile.id,
            word_id=word_id,
            status=WordStatus.active,
            stage=0,
            due_lesson_number=lesson.lesson_number + 1
        )
        db.add(user_word)
        
        suggestion.state = SuggestionState.added
        
        event = Event(
            user_id=user.id,
            type="new_word_accepted",
            payload={"word_id": word_id, "source": "suggestion"}
        )
        db.add(event)
    
    elif request.action == "ignore":
        if suggestion.state == SuggestionState.ignored:
            return {"message": "Already ignored"}
        
        # Add as ignored
        result = await db.execute(
            select(UserWord).where(
                UserWord.learning_profile_id == user.learning_profile.id,
                UserWord.word_id == word_id
            )
        )
        if not result.scalar_one_or_none():
            user_word = UserWord(
                learning_profile_id=user.learning_profile.id,
                word_id=word_id,
                status=WordStatus.ignored,
                stage=0,
                due_lesson_number=None
            )
            db.add(user_word)
        
        suggestion.state = SuggestionState.ignored
        
        event = Event(
            user_id=user.id,
            type="new_word_declined",
            payload={"word_id": word_id, "source": "suggestion"}
        )
        db.add(event)
    
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    await db.commit()
    
    return {"message": f"Suggestion {request.action}"}
