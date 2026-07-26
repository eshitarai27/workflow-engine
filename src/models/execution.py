"""Runtime state: what happens *while* and *after* a workflow runs.

This is the "explainable execution" half of the domain model -- every node
transition is recorded with enough detail to answer "why did this run, why
did it wait, why did it fail" after the fact, mirroring the trace-engine
idea from ExplainHTTP but for a DAG of nodes instead of an HTTP request
pipeline.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .enums import ExecutionStatus, NodeState


class ExecutionContext:
    """Shared, thread-safe state propagated between nodes during one run.

    Each node reads whatever it needs from the context and writes its
    output back under its own node id, so later nodes can depend on
    earlier nodes' results without any node needing to know how the
    engine is scheduling them.
    """

    def __init__(self, initial: Optional[Dict[str, Any]] = None) -> None:
        self._lock = threading.Lock()
        self._variables: Dict[str, Any] = dict(initial or {})
        self._node_outputs: Dict[str, Any] = {}

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            return self._variables.get(key, default)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._variables[key] = value

    def update(self, values: Dict[str, Any]) -> None:
        with self._lock:
            self._variables.update(values)

    def set_node_output(self, node_id: str, output: Any) -> None:
        with self._lock:
            self._node_outputs[node_id] = output
            if isinstance(output, dict):
                self._variables.update(output)

    def get_node_output(self, node_id: str) -> Any:
        with self._lock:
            return self._node_outputs.get(node_id)

    def snapshot(self) -> Dict[str, Any]:
        """A copy of all variables, safe to read without holding the lock."""
        with self._lock:
            return dict(self._variables)

    def as_eval_namespace(self) -> Dict[str, Any]:
        """Variables exposed to condition/loop expressions."""
        with self._lock:
            return dict(self._variables)


@dataclass
class NodeExecutionRecord:
    """A single node's full explainable record for one attempt within a run."""

    node_id: str
    node_name: str
    state: NodeState
    dependencies: List[str] = field(default_factory=list)
    reason: str = ""
    condition_expression: Optional[str] = None
    condition_result: Optional[bool] = None
    attempt: int = 1
    retry_count: int = 0
    iteration: int = 1
    worker_id: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    input_snapshot: Dict[str, Any] = field(default_factory=dict)
    output_snapshot: Any = None
    failure_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "node_name": self.node_name,
            "state": self.state.value,
            "dependencies": self.dependencies,
            "reason": self.reason,
            "condition_expression": self.condition_expression,
            "condition_result": self.condition_result,
            "attempt": self.attempt,
            "retry_count": self.retry_count,
            "iteration": self.iteration,
            "worker_id": self.worker_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_ms": self.duration_ms,
            "input_snapshot": self.input_snapshot,
            "output_snapshot": self.output_snapshot,
            "failure_reason": self.failure_reason,
        }


@dataclass
class ExecutionHistory:
    """The ordered, append-only log of everything that happened in a run."""

    records: List[NodeExecutionRecord] = field(default_factory=list)

    def add(self, record: NodeExecutionRecord) -> None:
        self.records.append(record)

    def for_node(self, node_id: str) -> List[NodeExecutionRecord]:
        return [r for r in self.records if r.node_id == node_id]

    def to_dict(self) -> List[Dict[str, Any]]:
        return [r.to_dict() for r in self.records]


@dataclass
class Execution:
    """One run of one workflow version."""

    id: str
    workflow_id: str
    workflow_version: int
    status: ExecutionStatus = ExecutionStatus.PENDING
    context: ExecutionContext = field(default_factory=ExecutionContext)
    history: ExecutionHistory = field(default_factory=ExecutionHistory)
    node_states: Dict[str, NodeState] = field(default_factory=dict)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    error: Optional[str] = None
    triggered_by: str = "manual"
    checkpoint: Dict[str, Any] = field(default_factory=dict)

    def mark_started(self) -> None:
        self.status = ExecutionStatus.RUNNING
        self.started_at = datetime.now(timezone.utc)

    def mark_finished(self, status: ExecutionStatus, error: Optional[str] = None) -> None:
        self.status = status
        self.error = error
        self.ended_at = datetime.now(timezone.utc)

    @property
    def duration_ms(self) -> Optional[float]:
        if not self.started_at:
            return None
        end = self.ended_at or datetime.now(timezone.utc)
        return (end - self.started_at).total_seconds() * 1000

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "workflow_version": self.workflow_version,
            "status": self.status.value,
            "node_states": {k: v.value for k, v in self.node_states.items()},
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_ms": self.duration_ms,
            "error": self.error,
            "triggered_by": self.triggered_by,
            "context": self.context.snapshot(),
            "history": self.history.to_dict(),
        }
