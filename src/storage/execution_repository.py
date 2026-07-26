"""Persists executions: their status, context snapshot, node states, and
full explainable history."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.models.enums import ExecutionStatus, NodeState
from src.models.execution import Execution, ExecutionHistory, NodeExecutionRecord

from .database import Database


class ExecutionRepository:
    def __init__(self, database: Database) -> None:
        self.db = database

    def save(self, execution: Execution) -> None:
        conn = self.db.connection()
        conn.execute(
            """INSERT INTO executions
                 (id, workflow_id, workflow_version, status, triggered_by, started_at, ended_at,
                  error, context_json, node_states_json, history_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 status=excluded.status, started_at=excluded.started_at, ended_at=excluded.ended_at,
                 error=excluded.error, context_json=excluded.context_json,
                 node_states_json=excluded.node_states_json, history_json=excluded.history_json""",
            (
                execution.id,
                execution.workflow_id,
                execution.workflow_version,
                execution.status.value,
                execution.triggered_by,
                execution.started_at.isoformat() if execution.started_at else None,
                execution.ended_at.isoformat() if execution.ended_at else None,
                execution.error,
                json.dumps(execution.context.snapshot(), default=str),
                json.dumps({k: v.value for k, v in execution.node_states.items()}),
                json.dumps(execution.history.to_dict()),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()

    def get(self, execution_id: str) -> Optional[Execution]:
        row = self.db.connection().execute(
            "SELECT * FROM executions WHERE id = ?", (execution_id,)
        ).fetchone()
        return _row_to_execution(row) if row else None

    def list_for_workflow(self, workflow_id: str, limit: int = 50) -> List[Execution]:
        rows = self.db.connection().execute(
            "SELECT * FROM executions WHERE workflow_id = ? ORDER BY created_at DESC LIMIT ?",
            (workflow_id, limit),
        ).fetchall()
        return [_row_to_execution(row) for row in rows]

    def list_recent(self, limit: int = 50) -> List[Execution]:
        rows = self.db.connection().execute(
            "SELECT * FROM executions ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [_row_to_execution(row) for row in rows]


def _row_to_execution(row) -> Execution:
    execution = Execution(
        id=row["id"],
        workflow_id=row["workflow_id"],
        workflow_version=row["workflow_version"],
        status=ExecutionStatus(row["status"]),
        triggered_by=row["triggered_by"] or "manual",
        error=row["error"],
    )
    if row["started_at"]:
        execution.started_at = datetime.fromisoformat(row["started_at"])
    if row["ended_at"]:
        execution.ended_at = datetime.fromisoformat(row["ended_at"])

    execution.context.update(json.loads(row["context_json"] or "{}"))
    execution.node_states = {k: NodeState(v) for k, v in json.loads(row["node_states_json"] or "{}").items()}

    history = ExecutionHistory()
    for record_dict in json.loads(row["history_json"] or "[]"):
        history.add(_dict_to_record(record_dict))
    execution.history = history

    return execution


def _dict_to_record(data: Dict[str, Any]) -> NodeExecutionRecord:
    return NodeExecutionRecord(
        node_id=data["node_id"],
        node_name=data["node_name"],
        state=NodeState(data["state"]),
        dependencies=data.get("dependencies", []),
        reason=data.get("reason", ""),
        condition_expression=data.get("condition_expression"),
        condition_result=data.get("condition_result"),
        attempt=data.get("attempt", 1),
        retry_count=data.get("retry_count", 0),
        iteration=data.get("iteration", 1),
        worker_id=data.get("worker_id"),
        started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
        ended_at=datetime.fromisoformat(data["ended_at"]) if data.get("ended_at") else None,
        duration_ms=data.get("duration_ms"),
        input_snapshot=data.get("input_snapshot", {}),
        output_snapshot=data.get("output_snapshot"),
        failure_reason=data.get("failure_reason"),
    )
