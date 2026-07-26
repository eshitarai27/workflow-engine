"""Persists workflows with full version history, and supports comparing
two versions of the same workflow."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.models.workflow import Workflow

from .database import Database


@dataclass
class VersionDiff:
    workflow_id: str
    from_version: int
    to_version: int
    nodes_added: List[str]
    nodes_removed: List[str]
    nodes_changed: List[str]
    edges_added: List[Dict[str, str]]
    edges_removed: List[Dict[str, str]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "nodes_added": self.nodes_added,
            "nodes_removed": self.nodes_removed,
            "nodes_changed": self.nodes_changed,
            "edges_added": self.edges_added,
            "edges_removed": self.edges_removed,
        }


class WorkflowRepository:
    def __init__(self, database: Database) -> None:
        self.db = database

    def save_new_version(self, workflow: Workflow) -> Workflow:
        """Inserts ``workflow`` as the next version for its id, demoting
        any previous version's ``is_latest`` flag."""
        conn = self.db.connection()
        current_max = conn.execute(
            "SELECT MAX(version) AS v FROM workflows WHERE id = ?", (workflow.id,)
        ).fetchone()["v"]
        next_version = (current_max or 0) + 1
        workflow.version = next_version

        conn.execute("UPDATE workflows SET is_latest = 0 WHERE id = ?", (workflow.id,))
        conn.execute(
            """INSERT INTO workflows (id, version, name, description, definition_json, is_latest, created_at)
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (
                workflow.id,
                workflow.version,
                workflow.name,
                workflow.description,
                json.dumps(workflow.to_dict()),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
        return workflow

    def get_latest(self, workflow_id: str) -> Optional[Workflow]:
        row = self.db.connection().execute(
            "SELECT definition_json FROM workflows WHERE id = ? AND is_latest = 1", (workflow_id,)
        ).fetchone()
        return Workflow.from_dict(json.loads(row["definition_json"])) if row else None

    def get_version(self, workflow_id: str, version: int) -> Optional[Workflow]:
        row = self.db.connection().execute(
            "SELECT definition_json FROM workflows WHERE id = ? AND version = ?", (workflow_id, version)
        ).fetchone()
        return Workflow.from_dict(json.loads(row["definition_json"])) if row else None

    def list_versions(self, workflow_id: str) -> List[Dict[str, Any]]:
        rows = self.db.connection().execute(
            "SELECT version, name, is_latest, created_at FROM workflows WHERE id = ? ORDER BY version DESC",
            (workflow_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def list_latest(self) -> List[Workflow]:
        rows = self.db.connection().execute(
            "SELECT definition_json FROM workflows WHERE is_latest = 1 ORDER BY created_at DESC"
        ).fetchall()
        return [Workflow.from_dict(json.loads(row["definition_json"])) for row in rows]

    def delete(self, workflow_id: str) -> None:
        conn = self.db.connection()
        conn.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
        conn.commit()

    def compare_versions(self, workflow_id: str, from_version: int, to_version: int) -> VersionDiff:
        old = self.get_version(workflow_id, from_version)
        new = self.get_version(workflow_id, to_version)
        if old is None or new is None:
            raise ValueError(f"Version not found for workflow '{workflow_id}'")

        old_node_ids = {n.id for n in old.nodes}
        new_node_ids = {n.id for n in new.nodes}
        old_nodes_by_id = {n.id: n for n in old.nodes}
        new_nodes_by_id = {n.id: n for n in new.nodes}

        changed = [
            nid
            for nid in old_node_ids & new_node_ids
            if _node_signature(old_nodes_by_id[nid]) != _node_signature(new_nodes_by_id[nid])
        ]

        old_edges = {(e.source, e.target) for e in old.edges}
        new_edges = {(e.source, e.target) for e in new.edges}

        return VersionDiff(
            workflow_id=workflow_id,
            from_version=from_version,
            to_version=to_version,
            nodes_added=sorted(new_node_ids - old_node_ids),
            nodes_removed=sorted(old_node_ids - new_node_ids),
            nodes_changed=sorted(changed),
            edges_added=[{"source": s, "target": t} for s, t in sorted(new_edges - old_edges)],
            edges_removed=[{"source": s, "target": t} for s, t in sorted(old_edges - new_edges)],
        )


def _node_signature(node) -> str:
    return json.dumps(
        {
            "name": node.name,
            "action": {"plugin_id": node.action.plugin_id, "config": node.action.config},
            "condition": node.condition.expression if node.condition else None,
            "retry_policy": vars(node.retry_policy),
            "timeout_seconds": node.timeout_seconds,
            "loop": vars(node.loop) if node.loop else None,
        },
        sort_keys=True,
        default=str,
    )
