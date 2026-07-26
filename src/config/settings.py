"""Application configuration, sourced from environment variables.

Nothing here is required to be set for the platform to run: every AI
provider key is optional, and storage defaults to a local SQLite file, so
`uvicorn src.api.app:app` works immediately after `pip install -r
requirements.txt` with zero configuration.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    host: str = os.environ.get("FLOWFORGE_HOST", "0.0.0.0")
    port: int = int(os.environ.get("FLOWFORGE_PORT") or os.environ.get("PORT", "8000"))
    database_path: str = os.environ.get("FLOWFORGE_DB_PATH", str(ROOT_DIR / "data" / "flowforge.db"))
    checkpoint_dir: str = os.environ.get("FLOWFORGE_CHECKPOINT_DIR", str(ROOT_DIR / "data" / "checkpoints"))
    log_level: str = os.environ.get("FLOWFORGE_LOG_LEVEL", "INFO")
    cors_origin: str = os.environ.get("FLOWFORGE_CORS_ORIGIN", "*")
    max_parallel_nodes: int = int(os.environ.get("FLOWFORGE_MAX_PARALLEL_NODES", "8"))

    # AI providers -- every key is optional; ai_service reports which
    # providers are usable at runtime rather than failing at import time.
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    openai_model: str = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    anthropic_model: str = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
    google_api_key: str = os.environ.get("GOOGLE_API_KEY", "")
    google_model: str = os.environ.get("GOOGLE_MODEL", "gemini-2.0-flash")
    # Empty by default, deliberately -- unlike an API key, a base URL always
    # "looks" set if it defaults to localhost, which would make Ollama
    # appear configured even with no server actually running. Requiring an
    # explicit OLLAMA_BASE_URL keeps "configured" meaning the same thing
    # (opt-in) across every provider.
    ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "")
    ollama_model: str = os.environ.get("OLLAMA_MODEL", "llama3.1")

    # Plugin-specific, also optional
    slack_webhook_url: str = os.environ.get("SLACK_WEBHOOK_URL", "")
    smtp_host: str = os.environ.get("SMTP_HOST", "")
    smtp_port: int = int(os.environ.get("SMTP_PORT", "587"))
    smtp_username: str = os.environ.get("SMTP_USERNAME", "")
    smtp_password: str = os.environ.get("SMTP_PASSWORD", "")


def load_settings() -> Settings:
    return Settings()


settings = load_settings()
