import httpx
import pytest

from radio_backend.services.youtube import (
    YouTubeError,
    clear_cache,
    parse_duration,
    search_songs,
)


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    clear_cache()
    yield


@pytest.mark.parametrize(
    ("iso", "expected"),
    [
        ("PT4M13S", 253),
        ("PT45S", 45),
        ("PT1H2M3S", 3723),
        ("PT0S", 0),
        ("PT1M", 60),
        ("PT1H", 3600),
    ],
)
def test_parse_duration(iso: str, expected: int) -> None:
    assert parse_duration(iso) == expected


@pytest.mark.parametrize("iso", ["", "not-a-duration", "PT", "4M13S"])
def test_parse_duration_invalid_returns_zero(iso: str) -> None:
    assert parse_duration(iso) == 0


def _client(search_payload: object, videos_payload: object) -> httpx.AsyncClient:
    def handler(request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        if "/search" in url:
            return httpx.Response(200, json=search_payload)
        if "/videos" in url:
            return httpx.Response(200, json=videos_payload)
        return httpx.Response(404, json={})

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def test_search_songs_parses_duration_and_thumbnail() -> None:
    client = _client(
        {
            "items": [
                {
                    "id": {"videoId": "abc123"},
                    "snippet": {
                        "title": "Música A",
                        "thumbnails": {"default": {"url": "http://img/a.jpg"}},
                    },
                }
            ]
        },
        {"items": [{"id": "abc123", "contentDetails": {"duration": "PT4M13S"}}]},
    )
    async with client:
        results = await search_songs("teste unitario", client=client)

    assert results == [
        {
            "youtube_id": "abc123",
            "title": "Música A",
            "duration": 253,
            "thumbnail": "http://img/a.jpg",
        }
    ]


async def test_search_songs_unescapes_title_html_entities() -> None:
    client = _client(
        {
            "items": [
                {
                    "id": {"videoId": "abc123"},
                    "snippet": {
                        "title": 'Skillet - &quot;The Resistance&quot; &amp; mais',
                        "thumbnails": {},
                    },
                }
            ]
        },
        {"items": [{"id": "abc123", "contentDetails": {"duration": "PT3M7S"}}]},
    )
    async with client:
        results = await search_songs("resistance", client=client)

    assert results[0]["title"] == 'Skillet - "The Resistance" & mais'


async def test_search_songs_prefers_medium_thumbnail() -> None:
    client = _client(
        {
            "items": [
                {
                    "id": {"videoId": "abc123"},
                    "snippet": {
                        "title": "T",
                        "thumbnails": {
                            "default": {"url": "http://img/d.jpg"},
                            "medium": {"url": "http://img/m.jpg"},
                        },
                    },
                }
            ]
        },
        {"items": [{"id": "abc123", "contentDetails": {"duration": "PT10S"}}]},
    )
    async with client:
        results = await search_songs("thumb", client=client)

    assert results[0]["thumbnail"] == "http://img/m.jpg"


async def test_search_songs_no_results() -> None:
    client = _client({"items": []}, {"items": []})
    async with client:
        results = await search_songs("sem resultados", client=client)

    assert results == []


async def test_search_songs_http_error_raises_youtube_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(403, json={"error": {"code": 403}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    async with client:
        with pytest.raises(YouTubeError):
            await search_songs("erro", client=client)


async def test_search_songs_missing_duration_defaults_to_zero() -> None:
    client = _client(
        {
            "items": [
                {
                    "id": {"videoId": "abc123"},
                    "snippet": {"title": "T", "thumbnails": {}},
                }
            ]
        },
        {"items": []},
    )
    async with client:
        results = await search_songs("sem duracao", client=client)

    assert results[0]["duration"] == 0


async def test_search_songs_requests_embeddable_only() -> None:
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if "/search" in str(request.url):
            captured.append(str(request.url))
            return httpx.Response(200, json={"items": []})
        if "/videos" in str(request.url):
            return httpx.Response(200, json={"items": []})
        return httpx.Response(404, json={})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    async with client:
        await search_songs("embutivel", client=client)

    assert captured, "a busca deveria chamar a YouTube API"
    assert "videoEmbeddable=true" in captured[0]


async def test_search_songs_filters_non_embeddable() -> None:
    search_payload = {
        "items": [
            {
                "id": {"videoId": "good1"},
                "snippet": {"title": "Embutível", "thumbnails": {}},
            },
            {
                "id": {"videoId": "bad1"},
                "snippet": {"title": "Não embutível", "thumbnails": {}},
            },
        ]
    }
    videos_payload = {
        "items": [
            {
                "id": "good1",
                "contentDetails": {"duration": "PT1M"},
                "status": {"embeddable": True},
            },
            {
                "id": "bad1",
                "contentDetails": {"duration": "PT2M"},
                "status": {"embeddable": False},
            },
        ]
    }
    client = _client(search_payload, videos_payload)
    async with client:
        results = await search_songs("filtro", client=client)

    assert [r["youtube_id"] for r in results] == ["good1"]
