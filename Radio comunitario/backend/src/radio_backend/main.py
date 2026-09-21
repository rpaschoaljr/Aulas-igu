import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from radio_backend.config import get_settings
from radio_backend.routers import auth, health, history, queue, songs, state

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from radio_backend.services.playback import run_engine

    task = asyncio.create_task(run_engine())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/api")
app.include_router(songs.router, prefix="/api")
app.include_router(queue.router, prefix="/api")
app.include_router(state.router, prefix="/api")
app.include_router(history.router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        {"loc": ".".join(str(p) for p in e["loc"]), "msg": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=400, content={"detail": errors})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("erro não tratado")
    return JSONResponse(status_code=500, content={"detail": "erro interno"})


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Radio Comunitaria API"}
