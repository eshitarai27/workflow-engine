"""Artifacts: named outputs a node produces that are worth keeping around
independently of the execution context (files, generated reports, large
payloads that shouldn't bloat the in-memory context)."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .enums import ArtifactType


@dataclass
class Artifact:
    id: str
    execution_id: str
    node_id: str
    name: str
    type: ArtifactType
    content: Optional[str] = None
    path: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "execution_id": self.execution_id,
            "node_id": self.node_id,
            "name": self.name,
            "type": self.type.value,
            "content": self.content,
            "path": self.path,
            "created_at": self.created_at.isoformat(),
        }
