FROM python:3.14-slim

ENV UV_LINK_MODE=copy
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock README.md ./
COPY src ./src
COPY alembic.ini ./
COPY alembic ./alembic

RUN uv sync --frozen --no-dev --no-install-project
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["sh", "-c", "uv run --no-sync alembic upgrade head && uv run --no-sync uvicorn radio_backend.main:app --host 0.0.0.0 --port 8000 --reload"]
