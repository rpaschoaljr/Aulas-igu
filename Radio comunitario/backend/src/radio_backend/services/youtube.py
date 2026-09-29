"""Cliente da YouTube Data API v3 (busca de músicas)."""

import html
import re
import time

import httpx

from radio_backend.config import get_settings

settings = get_settings()

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
CACHE_TTL_SECONDS = 300.0

_cache: dict[str, tuple[float, list[dict[str, object]]]] = {}


class YouTubeError(Exception):
    """Falha ao acessar a YouTube Data API (indisponível, quota ou formato)."""


def parse_duration(iso: str) -> int:
    """Converte duração ISO 8601 (PT#H#M#S) para segundos."""
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if match is None:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def clear_cache() -> None:
    """Limpa o cache em memória (usado nos testes)."""
    _cache.clear()


async def search_songs(
    query: str,
    max_results: int = 10,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, object]]:
    """Busca vídeos no YouTube e devolve id, título, duração (s) e thumbnail."""
    cache_key = query.strip().lower()
    cached = _cache.get(cache_key)
    if cached is not None and time.monotonic() - cached[0] < CACHE_TTL_SECONDS:
        return cached[1]

    owns_client = client is None
    if client is None:
        client = httpx.AsyncClient(timeout=5.0)

    try:
        search_response = await client.get(
            SEARCH_URL,
            params={
                "part": "snippet",
                "type": "video",
                "videoEmbeddable": "true",
                "maxResults": max_results,
                "q": query,
                "key": settings.youtube_api_key,
            },
        )
        search_response.raise_for_status()
        items = search_response.json().get("items", [])

        video_ids = [
            item["id"]["videoId"]
            for item in items
            if item.get("id", {}).get("videoId")
        ]
        if not video_ids:
            _cache[cache_key] = (time.monotonic(), [])
            return []

        videos_response = await client.get(
            VIDEOS_URL,
            params={
                "part": "contentDetails,status",
                "id": ",".join(video_ids),
                "key": settings.youtube_api_key,
            },
        )
        videos_response.raise_for_status()
        video_details = videos_response.json().get("items", [])
        durations = {
            item["id"]: item["contentDetails"]["duration"]
            for item in video_details
        }
        # Salvaguarda: `videoEmbeddable` da busca é indicativo, mas o status
        # real vem aqui. Vídeos explicitamente não incorporáveis são descartados
        # para evitar o erro "tente novamente mais tarde" no player embutido.
        non_embeddable_ids = {
            item["id"]
            for item in video_details
            if item.get("status", {}).get("embeddable") is False
        }

        results: list[dict[str, object]] = []
        for item in items:
            video_id = item["id"]["videoId"]
            if video_id in non_embeddable_ids:
                continue
            snippet = item.get("snippet", {})
            thumbnails = snippet.get("thumbnails", {})
            thumbnail = (
                thumbnails.get("medium", {}).get("url")
                or thumbnails.get("default", {}).get("url")
                or ""
            )
            results.append(
                {
                    "youtube_id": video_id,
                    # A YouTube API devolve o título com entidades HTML codificadas
                    # (&quot;, &amp;, &#39;...); desfazemos antes de gravar/exibir.
                    "title": html.unescape(snippet.get("title", "")),
                    "duration": parse_duration(durations.get(video_id, "PT0S")),
                    "thumbnail": thumbnail,
                }
            )

        _cache[cache_key] = (time.monotonic(), results)
        return results
    except (
        httpx.HTTPStatusError,
        httpx.RequestError,
        KeyError,
        TypeError,
        ValueError,
    ) as exc:
        raise YouTubeError("busca indisponível") from exc
    finally:
        if owns_client:
            await client.aclose()
