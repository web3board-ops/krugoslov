from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text,
    UniqueConstraint, Index, CheckConstraint, func, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# === Enums ===
class WordStatus(str, enum.Enum):
    active = "active"
    mastered = "mastered"
    ignored = "ignored"


class LessonStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class ExerciseStatus(str, enum.Enum):
    pending = "pending"
    evaluated = "evaluated"


class ResultType(str, enum.Enum):
    correct = "correct"
    typo = "typo"
    incorrect = "incorrect"


class SuggestionState(str, enum.Enum):
    suggested = "suggested"
    added = "added"
    ignored = "ignored"


class ReportStatus(str, enum.Enum):
    new = "new"
    processed = "processed"


# === Models ===
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    timezone = Column(String(100), nullable=True)
    timezone_changed_at = Column(DateTime(timezone=True), nullable=True)
    is_onboarded = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    learning_profile = relationship("LearningProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    family_id = Column(String(100), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    replaced_by = Column(Integer, ForeignKey("refresh_tokens.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


class Dictionary(Base):
    __tablename__ = "dictionaries"
    
    id = Column(Integer, primary_key=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_general = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    words = relationship("DictionaryWord", back_populates="dictionary", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_dictionaries_is_general", "is_general", unique=True, postgresql_where=Column("is_general") == True),
    )


class Word(Base):
    __tablename__ = "words"
    
    id = Column(Integer, primary_key=True)
    lemma = Column(String(64), nullable=False)
    lemma_key = Column(String(64), nullable=False)
    pos = Column(String(10), nullable=False)
    level = Column(String(2), nullable=True)
    translations = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    dictionaries = relationship("DictionaryWord", back_populates="word", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("lemma_key", "pos", name="uq_words_lemma_pos"),
        CheckConstraint("pos IN ('noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'det', 'intj')", name="ck_words_pos"),
    )


class DictionaryWord(Base):
    __tablename__ = "dictionary_words"
    
    dictionary_id = Column(Integer, ForeignKey("dictionaries.id", ondelete="CASCADE"), primary_key=True)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), primary_key=True)
    
    # Relationships
    dictionary = relationship("Dictionary", back_populates="words")
    word = relationship("Word", back_populates="dictionaries")


class LearningProfile(Base):
    __tablename__ = "learning_profiles"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    level = Column(String(2), nullable=False)
    dictionary_id = Column(Integer, ForeignKey("dictionaries.id"), nullable=False)
    daily_lesson_limit = Column(Integer, nullable=False)
    words_per_lesson = Column(Integer, nullable=False, default=5)
    last_lesson_number = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="learning_profile")
    dictionary = relationship("Dictionary")
    user_words = relationship("UserWord", back_populates="profile", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="profile", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("level IN ('A1', 'A2', 'B1', 'B2')", name="ck_learning_profiles_level"),
    )


class UserWord(Base):
    __tablename__ = "user_words"
    
    id = Column(Integer, primary_key=True)
    learning_profile_id = Column(Integer, ForeignKey("learning_profiles.id", ondelete="CASCADE"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(WordStatus), nullable=False, default=WordStatus.active)
    stage = Column(Integer, nullable=False, default=0)
    due_lesson_number = Column(Integer, nullable=True)
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    profile = relationship("LearningProfile", back_populates="user_words")
    word = relationship("Word")
    
    __table_args__ = (
        UniqueConstraint("learning_profile_id", "word_id", name="uq_user_words_profile_word"),
        Index("ix_user_words_profile_status_due", "learning_profile_id", "status", "due_lesson_number"),
        CheckConstraint("stage >= 0 AND stage <= 6", name="ck_user_words_stage"),
        CheckConstraint("(status = 'active' AND due_lesson_number IS NOT NULL) OR (status != 'active' AND due_lesson_number IS NULL)", name="ck_user_words_due"),
    )


class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True)
    learning_profile_id = Column(Integer, ForeignKey("learning_profiles.id", ondelete="CASCADE"), nullable=False)
    lesson_number = Column(Integer, nullable=False)
    status = Column(SAEnum(LessonStatus), nullable=False, default=LessonStatus.in_progress)
    words_per_lesson = Column(Integer, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    started_local_date = Column(String(10), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_local_date = Column(String(10), nullable=True)
    abandoned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    profile = relationship("LearningProfile", back_populates="lessons")
    exercises = relationship("LessonExercise", back_populates="lesson", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("learning_profile_id", "lesson_number", name="uq_lessons_profile_number"),
        Index("ix_lessons_profile_status", "learning_profile_id", "status", postgresql_where=Column("status") == "in_progress", unique=True),
        Index("ix_lessons_profile_started_date", "learning_profile_id", "started_local_date"),
        Index("ix_lessons_completed_date", "completed_local_date"),
    )


class LessonExercise(Base):
    __tablename__ = "lesson_exercises"
    
    id = Column(Integer, primary_key=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, nullable=False)
    target_sentence = Column(Text, nullable=False)
    reference_translation = Column(Text, nullable=False)
    user_translation = Column(Text, nullable=True)
    dont_know = Column(Boolean, default=False, nullable=False)
    status = Column(SAEnum(ExerciseStatus), nullable=False, default=ExerciseStatus.pending)
    evaluated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    lesson = relationship("Lesson", back_populates="exercises")
    words = relationship("LessonExerciseWord", back_populates="exercise", cascade="all, delete-orphan")
    suggestions = relationship("LessonExerciseSuggestion", back_populates="exercise", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("ix_lesson_exercises_lesson_order", "lesson_id", "order_index"),
    )


class LessonExerciseWord(Base):
    __tablename__ = "lesson_exercise_words"
    
    id = Column(Integer, primary_key=True)
    exercise_id = Column(Integer, ForeignKey("lesson_exercises.id", ondelete="CASCADE"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    is_target = Column(Boolean, nullable=False, default=True)
    is_new = Column(Boolean, nullable=False, default=False)
    surface_form = Column(String(100), nullable=True)
    result = Column(SAEnum(ResultType), nullable=True)
    user_fragment = Column(Text, nullable=True)
    stage_before = Column(Integer, nullable=True)
    stage_after = Column(Integer, nullable=True)
    
    # Relationships
    exercise = relationship("LessonExercise", back_populates="words")
    word = relationship("Word")
    
    __table_args__ = (
        Index("ix_lesson_exercise_words_exercise", "exercise_id"),
        Index("ix_lesson_exercise_words_word", "word_id"),
    )


class LessonExerciseSuggestion(Base):
    __tablename__ = "lesson_exercise_suggestions"
    
    id = Column(Integer, primary_key=True)
    exercise_id = Column(Integer, ForeignKey("lesson_exercises.id", ondelete="CASCADE"), nullable=False)
    word_id = Column(Integer, ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    state = Column(SAEnum(SuggestionState), nullable=False, default=SuggestionState.suggested)
    
    # Relationships
    exercise = relationship("LessonExercise", back_populates="suggestions")
    word = relationship("Word")
    
    __table_args__ = (
        UniqueConstraint("exercise_id", "word_id", name="uq_suggestions_exercise_word"),
    )


class SentenceReport(Base):
    __tablename__ = "sentence_reports"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("lesson_exercises.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String(50), nullable=False)
    comment = Column(Text, nullable=True)
    status = Column(SAEnum(ReportStatus), nullable=False, default=ReportStatus.new)
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    exercise = relationship("LessonExercise")
    
    __table_args__ = (
        UniqueConstraint("user_id", "exercise_id", name="uq_reports_user_exercise"),
    )


class LLMCall(Base):
    __tablename__ = "llm_calls"
    
    id = Column(Integer, primary_key=True)
    purpose = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)
    exercise_id = Column(Integer, ForeignKey("lesson_exercises.id", ondelete="SET NULL"), nullable=True)
    attempt = Column(Integer, nullable=False, default=1)
    request = Column(JSON, nullable=False)
    response = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False)
    http_status = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("ix_llm_calls_created", "created_at"),
    )


class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="events")
    
    __table_args__ = (
        Index("ix_events_user_type", "user_id", "type"),
        Index("ix_events_created", "created_at"),
    )


class DictionaryImport(Base):
    __tablename__ = "dictionary_imports"
    
    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    file_name = Column(String(255), nullable=False)
    sha256 = Column(String(64), nullable=False)
    dictionary_id = Column(Integer, ForeignKey("dictionaries.id", ondelete="SET NULL"), nullable=True)
    added_count = Column(Integer, default=0)
    linked_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    error_details = Column(JSON, nullable=True)
    dry_run = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    admin = relationship("User")
    dictionary = relationship("Dictionary")


class PromptTemplate(Base):
    __tablename__ = "prompt_templates"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    template = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
