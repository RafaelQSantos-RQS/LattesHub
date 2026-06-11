import os
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.api_router import api_router
from app.core.errors import INTERNAL_SERVER_ERROR_DETAIL

logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

PRODUCTION_ENV_NAMES = {"prod", "production"}


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("BACKEND_CORS_ORIGINS")
    origins = (
        [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
        if configured_origins
        else DEFAULT_CORS_ORIGINS
    )

    app_env = os.getenv("APP_ENV", "development").strip().lower()
    if app_env in PRODUCTION_ENV_NAMES and "*" in origins:
        raise RuntimeError("BACKEND_CORS_ORIGINS cannot include '*' in production.")

    return origins


def create_app(cors_origins: list[str] | None = None) -> FastAPI:
    app = FastAPI(
        title="LattesHub API",
        version="1.0",
        description="API publica de dados abertos e descoberta cientifica apoiada por Inteligencia Artificial.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if exc.status_code >= 500:
            logger.error(
                "Erro HTTP interno em %s %s: %s",
                request.method,
                request.url.path,
                exc.detail,
            )
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": INTERNAL_SERVER_ERROR_DETAIL},
                headers=exc.headers,
            )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Erro interno nao tratado em %s %s",
            request.method,
            request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": INTERNAL_SERVER_ERROR_DETAIL},
        )

    @app.get("/health-check")
    def health_check():
        """Endpoint de Health Check para validacao do status da API."""
        return {"message": "LattesHub API e AI Worker operacionais!"}

    return app


app = create_app()
