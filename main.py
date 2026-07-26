"""FlowForge entrypoint.

Usage::

    python main.py

Equivalent to running ``uvicorn src.api.app:app`` directly, just with the
host/port coming from FlowForge's own settings (which also respects the
platform-assigned ``PORT`` env var, for Railway/Render/Heroku-style
deploys).
"""
from __future__ import annotations

import uvicorn

from src.config.settings import settings


def main() -> None:
    uvicorn.run("src.api.app:app", host=settings.host, port=settings.port, reload=False)


if __name__ == "__main__":
    main()
