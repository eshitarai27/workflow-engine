"""Persists enough state after each completed layer to resume a run that
was paused, cancelled, or interrupted, without redoing finished work."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from src.config.settings import settings
from src.models.enums import EventType


class CheckpointStore:
    def __init__(self, checkpoint_dir: Optional[str] = None) -> None:
        self.checkpoint_dir = Path(checkpoint_dir or settings.checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, execution_id: str) -> Path:
        return self.checkpoint_dir / f"{execution_id}.json"

    def save(self, execution_id: str, data: Dict[str, Any]) -> None:
        self._path(execution_id).write_text(json.dumps(data, default=str, indent=2), encoding="utf-8")

    def load(self, execution_id: str) -> Optional[Dict[str, Any]]:
        path = self._path(execution_id)
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))

    def delete(self, execution_id: str) -> None:
        path = self._path(execution_id)
        if path.exists():
            path.unlink()

    def exists(self, execution_id: str) -> bool:
        return self._path(execution_id).exists()
