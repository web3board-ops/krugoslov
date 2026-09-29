"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('timezone', sa.String(100), nullable=True),
        sa.Column('timezone_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_onboarded', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_admin', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    
    # Refresh tokens
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('family_id', sa.String(100), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('replaced_by', sa.Integer(), sa.ForeignKey('refresh_tokens.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    
    # Dictionaries
    op.create_table(
        'dictionaries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(64), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_general', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index('ix_dictionaries_is_general', 'dictionaries', ['is_general'], unique=True, postgresql_where=sa.text('is_general = true'))
    
    # Words
    op.create_table(
        'words',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lemma', sa.String(64), nullable=False),
        sa.Column('lemma_key', sa.String(64), nullable=False),
        sa.Column('pos', sa.String(10), nullable=False),
        sa.Column('level', sa.String(2), nullable=True),
        sa.Column('translations', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('lemma_key', 'pos', name='uq_words_lemma_pos'),
        sa.CheckConstraint("pos IN ('noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'num', 'det', 'intj')", name='ck_words_pos')
    )
    
    # Dictionary words
    op.create_table(
        'dictionary_words',
        sa.Column('dictionary_id', sa.Integer(), sa.ForeignKey('dictionaries.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('word_id', sa.Integer(), sa.ForeignKey('words.id', ondelete='CASCADE'), primary_key=True)
    )
    
    # Learning profiles
    op.create_table(
        'learning_profiles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('level', sa.String(2), nullable=False),
        sa.Column('dictionary_id', sa.Integer(), sa.ForeignKey('dictionaries.id'), nullable=False),
        sa.Column('daily_lesson_limit', sa.Integer(), nullable=False),
        sa.Column('last_lesson_number', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("level IN ('A1', 'A2', 'B1', 'B2')", name='ck_learning_profiles_level')
    )
    
    # User words
    op.create_table(
        'user_words',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('learning_profile_id', sa.Integer(), sa.ForeignKey('learning_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('word_id', sa.Integer(), sa.ForeignKey('words.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.Enum('active', 'mastered', 'ignored', name='wordstatus'), nullable=False, server_default='active'),
        sa.Column('stage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('due_lesson_number', sa.Integer(), nullable=True),
        sa.Column('last_reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('learning_profile_id', 'word_id', name='uq_user_words_profile_word'),
        sa.CheckConstraint('stage >= 0 AND stage <= 6', name='ck_user_words_stage')
    )
    op.create_index('ix_user_words_profile_status_due', 'user_words', ['learning_profile_id', 'status', 'due_lesson_number'])
    
    # Lessons
    op.create_table(
        'lessons',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('learning_profile_id', sa.Integer(), sa.ForeignKey('learning_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('in_progress', 'completed', 'abandoned', name='lessonstatus'), nullable=False, server_default='in_progress'),
        sa.Column('words_per_lesson', sa.Integer(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('started_local_date', sa.String(10), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_local_date', sa.String(10), nullable=True),
        sa.Column('abandoned_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('learning_profile_id', 'lesson_number', name='uq_lessons_profile_number')
    )
    op.create_index('ix_lessons_profile_status', 'lessons', ['learning_profile_id', 'status'], unique=True, postgresql_where=sa.text("status = 'in_progress'"))
    op.create_index('ix_lessons_profile_started_date', 'lessons', ['learning_profile_id', 'started_local_date'])
    op.create_index('ix_lessons_completed_date', 'lessons', ['completed_local_date'])
    
    # Lesson exercises
    op.create_table(
        'lesson_exercises',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('target_sentence', sa.Text(), nullable=False),
        sa.Column('reference_translation', sa.Text(), nullable=False),
        sa.Column('user_translation', sa.Text(), nullable=True),
        sa.Column('dont_know', sa.Boolean(), default=False, nullable=False),
        sa.Column('status', sa.Enum('pending', 'evaluated', name='exercisestatus'), nullable=False, server_default='pending'),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_lesson_exercises_lesson_order', 'lesson_exercises', ['lesson_id', 'order_index'])
    
    # Lesson exercise words
    op.create_table(
        'lesson_exercise_words',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('exercise_id', sa.Integer(), sa.ForeignKey('lesson_exercises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('word_id', sa.Integer(), sa.ForeignKey('words.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_target', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_new', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('surface_form', sa.String(100), nullable=True),
        sa.Column('result', sa.Enum('correct', 'typo', 'incorrect', name='resulttype'), nullable=True),
        sa.Column('user_fragment', sa.Text(), nullable=True),
        sa.Column('stage_before', sa.Integer(), nullable=True),
        sa.Column('stage_after', sa.Integer(), nullable=True)
    )
    op.create_index('ix_lesson_exercise_words_exercise', 'lesson_exercise_words', ['exercise_id'])
    op.create_index('ix_lesson_exercise_words_word', 'lesson_exercise_words', ['word_id'])
    
    # Lesson exercise suggestions
    op.create_table(
        'lesson_exercise_suggestions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('exercise_id', sa.Integer(), sa.ForeignKey('lesson_exercises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('word_id', sa.Integer(), sa.ForeignKey('words.id', ondelete='CASCADE'), nullable=False),
        sa.Column('state', sa.Enum('suggested', 'added', 'ignored', name='suggestionstate'), nullable=False, server_default='suggested'),
        sa.UniqueConstraint('exercise_id', 'word_id', name='uq_suggestions_exercise_word')
    )
    
    # Sentence reports
    op.create_table(
        'sentence_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('exercise_id', sa.Integer(), sa.ForeignKey('lesson_exercises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.String(50), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('new', 'processed', name='reportstatus'), nullable=False, server_default='new'),
        sa.Column('admin_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('user_id', 'exercise_id', name='uq_reports_user_exercise')
    )
    
    # LLM calls
    op.create_table(
        'llm_calls',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('purpose', sa.String(50), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lessons.id', ondelete='SET NULL'), nullable=True),
        sa.Column('exercise_id', sa.Integer(), sa.ForeignKey('lesson_exercises.id', ondelete='SET NULL'), nullable=True),
        sa.Column('attempt', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('request', sa.JSON(), nullable=False),
        sa.Column('response', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index('ix_llm_calls_created', 'llm_calls', ['created_at'])
    
    # Events
    op.create_table(
        'events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('payload', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    op.create_index('ix_events_user_type', 'events', ['user_id', 'type'])
    op.create_index('ix_events_created', 'events', ['created_at'])
    
    # Dictionary imports
    op.create_table(
        'dictionary_imports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('admin_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('dictionary_id', sa.Integer(), sa.ForeignKey('dictionaries.id', ondelete='SET NULL'), nullable=True),
        sa.Column('added_count', sa.Integer(), default=0),
        sa.Column('linked_count', sa.Integer(), default=0),
        sa.Column('skipped_count', sa.Integer(), default=0),
        sa.Column('error_count', sa.Integer(), default=0),
        sa.Column('error_details', sa.JSON(), nullable=True),
        sa.Column('dry_run', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )


def downgrade() -> None:
    op.drop_table('dictionary_imports')
    op.drop_table('events')
    op.drop_table('llm_calls')
    op.drop_table('sentence_reports')
    op.drop_table('lesson_exercise_suggestions')
    op.drop_table('lesson_exercise_words')
    op.drop_table('lesson_exercises')
    op.drop_table('lessons')
    op.drop_table('user_words')
    op.drop_table('learning_profiles')
    op.drop_table('dictionary_words')
    op.drop_table('words')
    op.drop_table('dictionaries')
    op.drop_table('refresh_tokens')
    op.drop_table('users')
