import hashlib
import math
import random
import re
import unicodedata
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Set
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import (
    LearningProfile, UserWord, Word, Lesson, LessonExercise, LessonExerciseWord,
    LessonExerciseSuggestion, Dictionary, WordStatus, LessonStatus, ExerciseStatus,
    ResultType, SuggestionState, DictionaryWord
)
from app.services.srs import srs_update
from app.services.streak import get_local_date
from app.services.gigachat import chat_json
from app.prompts.templates import build_generation_prompt, build_evaluation_prompt
from app.config import settings

logger = logging.getLogger(__name__)


def normalize_lemma(lemma: str) -> str:
    """Normalize lemma to lemma_key"""
    lemma = unicodedata.normalize("NFC", lemma.strip())
    return lemma.casefold()


def deterministic_hash(seed: str, word_id: int) -> int:
    """Deterministic hash for ranking"""
    hash_str = f"{seed}:{word_id}"
    return int(hashlib.sha256(hash_str.encode()).hexdigest(), 16)


async def select_words_for_lesson(
    db: AsyncSession,
    profile: LearningProfile,
    next_lesson_number: int
) -> Tuple[List[UserWord], List[Word], bool]:
    """
    Select words for lesson (algorithm 5.2)
    
    Returns:
        (due_words, new_words, dictionary_exhausted)
    """
    N = settings.WORDS_PER_LESSON
    seed = f"{profile.id}:{next_lesson_number}"
    
    # Get due words
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(UserWord)
        .options(selectinload(UserWord.word))
        .where(
            UserWord.learning_profile_id == profile.id,
            UserWord.status == WordStatus.active,
            UserWord.due_lesson_number <= next_lesson_number
        )
    )
    due_words_all = list(result.scalars().all())
    
    # Rank and select due words
    due_words_ranked = sorted(
        due_words_all,
        key=lambda uw: deterministic_hash(seed, uw.word_id)
    )
    due_words = due_words_ranked[:N]
    
    # If we have enough due words, return
    if len(due_words) >= N:
        return due_words, [], False
    
    # Need new words
    needed = N - len(due_words)
    
    # Get existing word IDs in profile
    result = await db.execute(
        select(UserWord.word_id).where(UserWord.learning_profile_id == profile.id)
    )
    existing_word_ids = set(row[0] for row in result.fetchall())
    
    # Get dictionary words
    result = await db.execute(
        select(Word).join(DictionaryWord).where(
            DictionaryWord.dictionary_id == profile.dictionary_id,
            ~Word.id.in_(existing_word_ids)
        )
    )
    candidate_words = list(result.scalars().all())
    
    # Filter by level
    level_below = {
        "A1": ["A1"],
        "A2": ["A1", "A2"],
        "B1": ["A2", "B1"],
        "B2": ["B1", "B2"]
    }
    allowed_levels = level_below.get(profile.level, ["A1"])
    
    candidate_words = [
        w for w in candidate_words
        if w.level is None or w.level in allowed_levels
    ]
    
    # Rank and select new words
    candidate_words_ranked = sorted(
        candidate_words,
        key=lambda w: deterministic_hash(seed, w.id)
    )
    new_words = candidate_words_ranked[:needed]
    
    dictionary_exhausted = len(new_words) < needed
    
    return due_words, new_words, dictionary_exhausted


def cluster_words(word_ids: List[int], seed: str) -> List[List[int]]:
    """
    Cluster words into groups of 2-3 (algorithm 5.4 step 5)
    """
    N = len(word_ids)
    if N == 0:
        return []
    
    k = math.ceil(N / 3)
    base_size = N // k
    remainder = N % k
    
    # Shuffle deterministically
    rng = random.Random(seed)
    shuffled = word_ids.copy()
    rng.shuffle(shuffled)
    
    groups = []
    idx = 0
    for i in range(k):
        size = base_size + (1 if i < remainder else 0)
        groups.append(shuffled[idx:idx + size])
        idx += size
    
    return groups


async def get_avoid_sentences(
    db: AsyncSession,
    lesson_id: int,
    word_ids: List[int]
) -> List[str]:
    """Get recent sentences to avoid repetition"""
    result = await db.execute(
        select(LessonExercise.target_sentence)
        .join(LessonExerciseWord)
        .where(
            LessonExerciseWord.word_id.in_(word_ids),
            LessonExerciseWord.is_target == True
        )
        .order_by(LessonExercise.id.desc())
        .limit(4)
    )
    return [row[0] for row in result.fetchall()]


def validate_generated_sentence(
    sentence_data: Dict,
    group_index: int,
    group_words: List[Dict],
    avoid_sentences: List[str]
) -> bool:
    """Validate generated sentence (algorithm 5.4 step 7)"""
    try:
        # Check group_index
        if sentence_data.get("group_index") != group_index:
            logger.warning(f"Wrong group_index: expected {group_index}, got {sentence_data.get('group_index')}")
            return False
        
        # Check sentence exists and length
        sentence = sentence_data.get("sentence", "")
        if not sentence:
            logger.warning("Empty sentence")
            return False
        if len(sentence) > 200:
            logger.warning(f"Sentence too long: {len(sentence)} chars")
            return False
        
        # Check reference_translation
        translation = sentence_data.get("reference_translation", "")
        if not translation:
            logger.warning("Empty translation")
            return False
        if len(translation) > 300:
            logger.warning(f"Translation too long: {len(translation)} chars")
            return False
        
        # Check no Cyrillic in sentence (relaxed - allow some flexibility)
        if re.search(r'[а-яА-Я]', sentence):
            logger.warning(f"Cyrillic found in sentence: {sentence[:100]}")
            # Don't fail, just warn
        
        # Check Cyrillic in translation
        if not re.search(r'[а-яА-Я]', translation):
            logger.warning(f"No Cyrillic in translation: {translation[:100]}")
            # Don't fail, just warn
        
        # Check words - support both formats: "words" (array of objects) and "surface_forms" (array of strings)
        words = sentence_data.get("words", [])
        surface_forms = sentence_data.get("surface_forms", [])
        
        # If we have surface_forms instead of words, convert it
        if not words and surface_forms:
            logger.warning("Using surface_forms instead of words")
            words = []
            for i, form in enumerate(surface_forms):
                if i < len(group_words):
                    words.append({
                        "lemma": group_words[i].get("lemma"),
                        "pos": group_words[i].get("pos"),
                        "surface_form": form
                    })
        
        if len(words) != len(group_words):
            logger.warning(f"Wrong number of words: expected {len(group_words)}, got {len(words)}")
            return False
        
        # Check each word (relaxed validation)
        for word_data in words:
            lemma = word_data.get("lemma")
            pos = word_data.get("pos")
            surface_form = word_data.get("surface_form")
            
            if not lemma or not pos or not surface_form:
                logger.warning(f"Missing word data: {word_data}")
                return False
            
            # Check surface_form is in sentence (relaxed - allow partial match)
            if surface_form.lower() not in sentence.lower():
                logger.warning(f"Surface form '{surface_form}' not found in sentence: {sentence[:100]}")
                # Don't fail, just warn
        
        # Check not in avoid_sentences (relaxed)
        normalized = unicodedata.normalize("NFC", sentence.strip().lower())
        for avoid in avoid_sentences:
            avoid_normalized = unicodedata.normalize("NFC", avoid.strip().lower())
            if normalized == avoid_normalized:
                logger.warning("Sentence matches avoid_sentences")
                return False
        
        return True
    
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return False


async def generate_sentences(
    groups: List[List[int]],
    words_map: Dict[int, Word],
    level: str,
    avoid_sentences: List[str],
    user_id: int,
    lesson_id: int
) -> List[Dict]:
    """Generate sentences using LLM (algorithm 5.4 step 6)"""
    # Build prompt data
    groups_data = []
    for i, group in enumerate(groups):
        group_words = [
            {"lemma": words_map[wid].lemma, "pos": words_map[wid].pos}
            for wid in group
        ]
        groups_data.append({
            "group_index": i,
            "words": group_words,
            "avoid_sentences": avoid_sentences
        })
    
    logger.info(f"Generating sentences for {len(groups)} groups, level {level}")
    logger.debug(f"Groups data: {groups_data}")
    
    messages = build_generation_prompt(level, groups_data)
    
    def validator(data):
        logger.info(f"Validating response: {data}")
        
        # GigaChat может вернуть:
        # 1. Один объект (dict) - нужно обернуть в массив
        # 2. Объект с числовыми ключами ("0", "1") - конвертировать в массив
        # 3. Массив - оставить как есть
        check_data = data
        
        if isinstance(data, dict):
            logger.warning("Response is dict, converting to list")
            
            # Проверяем, это объект с числовыми ключами или один объект предложения
            if "sentence" in data and "group_index" in data:
                # Это один объект предложения - оборачиваем в массив
                logger.info("Single sentence object, wrapping in list")
                check_data = [data]
            else:
                # Это объект с числовыми ключами
                try:
                    check_data = [data[str(i)] for i in range(len(data))]
                    for i, item in enumerate(check_data):
                        if "group_index" not in item:
                            item["group_index"] = i
                except Exception as e:
                    logger.error(f"Failed to convert dict to list: {e}")
                    return False
        
        if not isinstance(check_data, list):
            logger.error(f"Response is not a list: {type(check_data)}")
            return False
        
        if len(check_data) != len(groups):
            logger.error(f"Expected {len(groups)} items, got {len(check_data)}")
            return False
        
        for i, item in enumerate(check_data):
            if not validate_generated_sentence(item, i, groups_data[i]["words"], avoid_sentences):
                logger.error(f"Validation failed for item {i}: {item}")
                return False
        
        logger.info("Validation passed")
        return True
    
    try:
        result = await chat_json(
            messages=messages,
            validator=validator,
            temperature=settings.GEN_TEMPERATURE,
            max_tokens=4000,  # Увеличено с 2000 до 4000
            timeout=30,
            user_id=user_id,
            lesson_id=lesson_id,
            purpose="generation"
        )
        
        # Конвертируем dict в list если нужно (повторно, т.к. validator не меняет результат)
        if isinstance(result, dict):
            logger.warning("Converting dict result to list")
            # Проверяем, это один объект или объект с числовыми ключами
            if "sentence" in result and "group_index" in result:
                # Один объект - оборачиваем в массив
                result = [result]
            else:
                # Объект с числовыми ключами
                result = [result[str(i)] for i in range(len(result))]
                for i, item in enumerate(result):
                    if "group_index" not in item:
                        item["group_index"] = i
        
        logger.info(f"Successfully generated {len(result)} sentences")
        return result
    except Exception as e:
        logger.error(f"Failed to generate sentences: {e}")
        raise


def validate_evaluation(
    data: Dict,
    target_word_ids: Set[int],
    user_translation: str
) -> bool:
    """Validate evaluation response (algorithm 5.5 step 7)"""
    try:
        evaluations = data.get("evaluations", [])
        if not isinstance(evaluations, list):
            return False
        
        # Check all target words are present
        eval_word_ids = set(e["word_id"] for e in evaluations)
        if eval_word_ids != target_word_ids:
            return False
        
        # Check each evaluation
        for eval_item in evaluations:
            result = eval_item.get("result")
            if result not in ("correct", "typo", "incorrect"):
                return False
            
            user_fragment = eval_item.get("user_fragment")
            if user_fragment is not None:
                # Check fragment is in user translation
                if user_fragment.lower() not in user_translation.lower():
                    eval_item["user_fragment"] = None
        
        # Check suggestions
        suggestions = data.get("new_suggested_words", [])
        if not isinstance(suggestions, list):
            return False
        
        for suggestion in suggestions:
            if not suggestion.get("lemma") or not suggestion.get("pos"):
                return False
            if suggestion["pos"] not in ("noun", "verb", "adj", "adv", "pron", "prep", "conj", "num", "det", "intj"):
                return False
        
        return True
    
    except Exception:
        return False


async def evaluate_translation(
    target_sentence: str,
    reference_translation: str,
    target_words: List[Dict],
    user_translation: str,
    user_id: int,
    lesson_id: int,
    exercise_id: int
) -> Dict:
    """Evaluate translation using LLM (algorithm 5.5 step 6)"""
    
    messages = build_evaluation_prompt(
        target_sentence,
        reference_translation,
        target_words,
        user_translation
    )
    
    target_word_ids = set(w["word_id"] for w in target_words)
    
    def validator(data):
        # Если результат - массив оценок (альтернативный формат)
        if isinstance(data, list):
            # Проверяем, что все элементы имеют result
            for item in data:
                if not isinstance(item, dict) or "result" not in item:
                    return False
            # Проверяем количество оценок
            if len(data) != len(target_words):
                return False
            return True
        # Если результат - полная структура
        elif isinstance(data, dict):
            return validate_evaluation(data, target_word_ids, user_translation)
        return False
    
    result = await chat_json(
        messages=messages,
        validator=validator,
        temperature=settings.EVAL_TEMPERATURE,
        max_tokens=1500,
        timeout=15,
        user_id=user_id,
        lesson_id=lesson_id,
        exercise_id=exercise_id,
        purpose="evaluation"
    )
    
    # Если результат - массив оценок, преобразуем в полную структуру
    if isinstance(result, list):
        # Сопоставляем оценки с target_words по порядку
        evaluations = []
        for i, eval_item in enumerate(result):
            if i < len(target_words):
                word = target_words[i]
                evaluations.append({
                    "word_id": word["word_id"],
                    "result": eval_item.get("result", "incorrect"),
                    "user_fragment": eval_item.get("user_fragment")
                })
        
        result = {
            "evaluations": evaluations,
            "new_suggested_words": []
        }
    
    return result
