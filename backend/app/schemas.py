from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


# === Enums ===
class Level(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"


class WordStatus(str, Enum):
    active = "active"
    mastered = "mastered"
    ignored = "ignored"


class ResultType(str, Enum):
    correct = "correct"
    typo = "typo"
    incorrect = "incorrect"


class CTAState(str, Enum):
    start = "start"
    resume = "resume"
    limit_reached = "limit_reached"


class ReportReason(str, Enum):
    bad_sentence = "bad_sentence"
    wrong_translation = "wrong_translation"
    grammar_error = "grammar_error"
    other = "other"


# === Auth ===
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    
    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    timezone: Optional[str]
    is_onboarded: bool
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# === Onboarding ===
class OnboardingRequest(BaseModel):
    timezone: str
    level: Level


# === Dashboard ===
class StreakInfo(BaseModel):
    current: int
    longest: int
    today_done: bool


class ResumeInfo(BaseModel):
    lesson_id: int
    exercises_done: int
    exercises_total: int


class WordsSummary(BaseModel):
    active: int
    mastered: int
    ignored: int


class DashboardResponse(BaseModel):
    level: Level
    dictionary_name: str
    today: str
    lessons_today: int
    daily_lesson_limit: int
    resets_at: str
    cta: CTAState
    resume: Optional[ResumeInfo]
    words: WordsSummary
    streak: StreakInfo


# === Lesson ===
class PreviewWord(BaseModel):
    word_id: int
    lemma: str
    pos: str


class PreviewNewWord(PreviewWord):
    translations: List[str]


class PreviewResponse(BaseModel):
    state: str  # ready, resume, limit_reached, no_words
    lesson_number: Optional[int] = None
    due_words: Optional[List[PreviewWord]] = None
    new_words: Optional[List[PreviewNewWord]] = None
    dictionary_exhausted: Optional[bool] = None
    lesson_id: Optional[int] = None
    exercises_done: Optional[int] = None
    exercises_total: Optional[int] = None
    resets_at: Optional[str] = None


class DeclineWordRequest(BaseModel):
    word_id: int


class StartLessonRequest(BaseModel):
    word_ids: List[int]


class ExerciseWordResponse(BaseModel):
    word_id: int
    lemma: str
    pos: str
    surface_form: str
    result: ResultType
    user_fragment: Optional[str]
    translations: List[str]


class SuggestionResponse(BaseModel):
    word_id: int
    lemma: str
    pos: str
    translations: List[str]


class EvaluateRequest(BaseModel):
    exercise_id: int
    user_translation: Optional[str] = None
    dont_know: bool = False


class EvaluateResponse(BaseModel):
    exercise_id: int
    target_sentence: str
    reference_translation: str
    user_translation: Optional[str]
    words: List[ExerciseWordResponse]
    suggestions: List[SuggestionResponse]
    lesson_completed: bool


class LessonExerciseResponse(BaseModel):
    exercise_id: int
    order_index: int
    sentence: str


class LessonStartResponse(BaseModel):
    lesson_id: int
    lesson_number: int
    exercises_total: int
    current_exercise: LessonExerciseResponse


class LessonSummaryResponse(BaseModel):
    lesson_number: int
    words_total: int
    reviewed: int
    new_words: int
    correct: int
    typo: int
    incorrect: int
    without_errors: int
    suggestions_added: int
    streak: dict


class LessonCurrentResponse(BaseModel):
    exercise_id: int
    order_index: int
    sentence: str


# === Vocabulary ===
class VocabularyWordResponse(BaseModel):
    id: int
    lemma: str
    pos: str
    translations: List[str]
    status: WordStatus
    stage: int
    due: Optional[int]


class VocabularyListResponse(BaseModel):
    words: List[VocabularyWordResponse]
    total: int


class WordCardResponse(BaseModel):
    id: int
    lemma: str
    pos: str
    translations: List[str]
    status: WordStatus
    stage: int
    due: Optional[int]
    history: List[dict]


class ChangeWordStatusRequest(BaseModel):
    status: WordStatus


# === Profile ===
class ProfileStatsResponse(BaseModel):
    streak_current: int
    streak_longest: int
    accuracy_30d: float
    accuracy_all: float
    words_active: int
    words_mastered: int
    words_ignored: int
    lessons_completed: int
    heatmap: List[dict]


# === Settings ===
class TimezoneRequest(BaseModel):
    timezone: str


class TimezoneResponse(BaseModel):
    today: str
    lessons_today: int
    resets_at: str
    streak: StreakInfo


class LearningProfileResponse(BaseModel):
    level: Level
    dictionary_id: int
    dictionary_name: str
    daily_lesson_limit: int
    daily_lesson_limit_max: int
    words_per_lesson: int
    words_per_lesson_max: int


class UpdateLearningProfileRequest(BaseModel):
    level: Optional[Level] = None
    dictionary_id: Optional[int] = None
    daily_lesson_limit: Optional[int] = Field(None, ge=1)
    words_per_lesson: Optional[int] = Field(None, ge=1)


class DictionaryResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    is_general: bool
    words_total: int


# === Suggestions ===
class SuggestionActionRequest(BaseModel):
    action: str  # add or ignore


# === Reports ===
class ReportRequest(BaseModel):
    reason: ReportReason
    comment: Optional[str] = Field(None, max_length=500)


class AdminReportResponse(BaseModel):
    id: int
    user_id: int
    exercise_id: int
    reason: str
    comment: Optional[str]
    status: str
    admin_note: Optional[str]
    created_at: datetime


class AdminUpdateReportRequest(BaseModel):
    status: str
    admin_note: Optional[str] = None


# === Admin ===
class AdminResetPasswordResponse(BaseModel):
    temp_password: str


class AdminUserResponse(BaseModel):
    id: int
    email: str
    is_onboarded: bool
    is_admin: bool
    created_at: datetime


# === Errors ===
class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
