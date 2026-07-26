"""FastAPI application factory."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routers import ai, events, executions, plugins, simulation, webhooks, workflows
from src.config.settings import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="FlowForge",
        description="An explainable, AI-ready, event-driven workflow orchestration platform.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin] if settings.cors_origin != "*" else ["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(workflows.router)
    app.include_router(executions.router)
    app.include_router(simulation.router)
    app.include_router(plugins.router)
    app.include_router(ai.router)
    app.include_router(events.router)
    app.include_router(webhooks.router)

    @app.get("/", tags=["health"])
    def health():
        return {
            "service": "FlowForge",
            "status": "ok",
            "tagline": "An explainable AI-ready event-driven workflow orchestration platform",
        }

    return app


app = create_app()
