"""Persists artifacts: named outputs worth keeping independently of the
execution context."""
from __future__ import annotations

from typing import List, Optional

from src.models.artifact import Artifact
from src.models.enums import ArtifactType

from .database import Database


class ArtifactRepository:
    def __init__(self, database: Database) -> None:
        self.db = database

    def save(self, artifact: Artifact) -> None:
        conn = self.db.connection()
        conn.execute(
            """INSERT INTO artifacts (id, execution_id, node_id, name, type, content, path, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                artifact.id,
                artifact.execution_id,
                artifact.node_id,
                artifact.name,
                artifact.type.value,
                artifact.content,
                artifact.path,
                artifact.created_at.isoformat(),
            ),
        )
        conn.commit()

    def get(self, artifact_id: str) -> Optional[Artifact]:
        row = self.db.connection().execute("SELECT * FROM artifacts WHERE id = ?", (artifact_id,)).fetchone()
        return _row_to_artifact(row) if row else None

    def list_for_execution(self, execution_id: str) -> List[Artifact]:
        rows = self.db.connection().execute(
            "SELECT * FROM artifacts WHERE execution_id = ? ORDER BY created_at", (execution_id,)
        ).fetchall()
        return [_row_to_artifact(row) for row in rows]


def _row_to_artifact(row) -> Artifact:
    from datetime import datetime

    return Artifact(
        id=row["id"],
        execution_id=row["execution_id"],
        node_id=row["node_id"],
        name=row["name"],
        type=ArtifactType(row["type"]),
        content=row["content"],
        path=row["path"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )
