import re

from pydantic import BaseModel, Field, field_validator

YOUTUBE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")


class SongResult(BaseModel):
    youtube_id: str
    title: str
    duration: int
    thumbnail: str


class SearchResponse(BaseModel):
    results: list[SongResult]


class QueueAddRequest(BaseModel):
    youtube_id: str = Field(min_length=1, max_length=32)

    @field_validator("youtube_id")
    @classmethod
    def youtube_id_format(cls, value: str) -> str:
        value = value.strip()
        if not YOUTUBE_ID_RE.fullmatch(value):
            raise ValueError("youtube_id inválido")
        return value


class QueueItemOut(BaseModel):
    id: str
    position: int
    added_by: str | None
    song: SongResult


class QueueAddResponse(BaseModel):
    id: str
    position: int


class VoteResponse(BaseModel):
    status: str


class HistoryEntryOut(BaseModel):
    id: str
    played_at: str
    added_by: str | None
    song: SongResult


class PlaybackStateOut(BaseModel):
    current_song_id: str | None
    started_at: str | None
    duration: int
