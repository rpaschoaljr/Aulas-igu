"""create radio tables (songs, queue_items, votes, history, playback_state)

Revision ID: a4f9c2e71b5d
Revises: 3874d0a179b9
Create Date: 2026-09-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4f9c2e71b5d'
down_revision: Union[str, Sequence[str], None] = '3874d0a179b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'songs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('youtube_id', sa.String(length=32), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('thumbnail', sa.String(length=512), nullable=False),
        sa.Column('added_by', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_songs_youtube_id'), 'songs', ['youtube_id'], unique=True)

    op.create_table(
        'queue_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('song_id', sa.Uuid(), nullable=False),
        sa.Column('added_by', sa.Uuid(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['song_id'], ['songs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_queue_items_added_by'), 'queue_items', ['added_by'], unique=False)
    op.create_index(op.f('ix_queue_items_song_id'), 'queue_items', ['song_id'], unique=False)

    op.create_table(
        'votes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('queue_item_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['queue_item_id'], ['queue_items.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'queue_item_id'),
    )
    op.create_index(op.f('ix_votes_queue_item_id'), 'votes', ['queue_item_id'], unique=False)
    op.create_index(op.f('ix_votes_user_id'), 'votes', ['user_id'], unique=False)

    op.create_table(
        'history',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('song_id', sa.Uuid(), nullable=False),
        sa.Column('played_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('added_by', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['added_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['song_id'], ['songs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_history_song_id'), 'history', ['song_id'], unique=False)

    op.create_table(
        'playback_state',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('current_song_id', sa.Uuid(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['current_song_id'], ['songs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('playback_state')
    op.drop_index(op.f('ix_history_song_id'), table_name='history')
    op.drop_table('history')
    op.drop_index(op.f('ix_votes_user_id'), table_name='votes')
    op.drop_index(op.f('ix_votes_queue_item_id'), table_name='votes')
    op.drop_table('votes')
    op.drop_index(op.f('ix_queue_items_song_id'), table_name='queue_items')
    op.drop_index(op.f('ix_queue_items_added_by'), table_name='queue_items')
    op.drop_table('queue_items')
    op.drop_index(op.f('ix_songs_youtube_id'), table_name='songs')
    op.drop_table('songs')
