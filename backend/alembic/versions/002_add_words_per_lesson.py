"""Add words_per_lesson to learning_profiles

Revision ID: 002
Revises: 001
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('learning_profiles', sa.Column('words_per_lesson', sa.Integer(), nullable=False, server_default='5'))


def downgrade() -> None:
    op.drop_column('learning_profiles', 'words_per_lesson')
