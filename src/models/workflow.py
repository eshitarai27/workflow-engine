"""The static workflow definition: what a workflow *is*, before it runs.

These are plain dataclasses with no framework dependency (no pydantic, no
FastAPI) -- the domain model stays usable from the engine, the CLI, and the
API layer alike. Validation of a raw definition happens in ``compiler``, not
here; these classes model an already-well-formed workflow.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .enums import TriggerType


@dataclass
class RetryPolicy:
    """How a node's action should be retried on failure."""

    max_retries: int = 0
    backoff_seconds: float = 1.0
    backoff_multiplier: float = 2.0

    def delay_for_attempt(self, attempt: int) -> float:
        """Exponential backoff delay before retry attempt ``attempt`` (1-indexed)."""
        return self.backoff_seconds * (self.backoff_multiplier ** max(0, attempt - 1))

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> "RetryPolicy":
        data = data or {}
        return cls(
            max_retries=int(data.get("max_retries", 0)),
            backoff_seconds=float(data.get("backoff_seconds", 1.0)),
            backoff_multiplier=float(data.get("backoff_multiplier", 2.0)),
        )


@dataclass
class LoopSpec:
    """Bounded iteration for a single node.

    A workflow graph must stay acyclic (the compiler rejects cycles), so
    repetition is modeled as a property of one node rather than a cyclic
    edge: the engine re-runs that node's action, feeding its own output back
    in as input, until ``until_condition`` evaluates true or
    ``max_iterations`` is reached. This is what expresses "loop until
    quality score reaches N" style workflows without the graph itself
    looping.
    """

    until_condition: str
    max_iterations: int = 20

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["LoopSpec"]:
        if not data:
            return None
        return cls(
            until_condition=data["until_condition"],
            max_iterations=int(data.get("max_iterations", 20)),
        )


@dataclass
class Action:
    """What a node does: which plugin runs, with what configuration."""

    plugin_id: str
    config: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Action":
        return cls(plugin_id=data["plugin_id"], config=data.get("config", {}))


@dataclass
class Condition:
    """A guard on whether a node runs at all.

    ``expression`` is evaluated against the execution context by
    :func:`src.utils.safe_eval.evaluate_condition` -- never Python's own
    ``eval``, since these strings come from user-authored workflow JSON.
    """

    expression: str

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> Optional["Condition"]:
        if not data:
            return None
        return cls(expression=data["expression"])


@dataclass
class Trigger:
    """How a workflow's execution can be initiated."""

    type: TriggerType
    config: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Trigger":
        return cls(type=TriggerType(data["type"]), config=data.get("config", {}))


@dataclass
class Node:
    """A single unit of work in a workflow."""

    id: str
    name: str
    action: Action
    condition: Optional[Condition] = None
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    timeout_seconds: Optional[float] = None
    loop: Optional[LoopSpec] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Node":
        return cls(
            id=data["id"],
            name=data.get("name", data["id"]),
            action=Action.from_dict(data["action"]),
            condition=Condition.from_dict(data.get("condition")),
            retry_policy=RetryPolicy.from_dict(data.get("retry_policy")),
            timeout_seconds=data.get("timeout_seconds"),
            loop=LoopSpec.from_dict(data.get("loop")),
        )


@dataclass
class Edge:
    """A dependency: ``target`` runs only after ``source`` succeeds (or is
    skipped, if ``source`` was itself skipped by a condition)."""

    source: str
    target: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Edge":
        return cls(source=data["source"], target=data["target"])


@dataclass
class Workflow:
    """A versioned, named collection of nodes, edges, and triggers."""

    id: str
    name: str
    version: int = 1
    description: str = ""
    nodes: List[Node] = field(default_factory=list)
    edges: List[Edge] = field(default_factory=list)
    triggers: List[Trigger] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def node_by_id(self, node_id: str) -> Optional[Node]:
        return next((n for n in self.nodes if n.id == node_id), None)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Workflow":
        return cls(
            id=data["id"],
            name=data["name"],
            version=int(data.get("version", 1)),
            description=data.get("description", ""),
            nodes=[Node.from_dict(n) for n in data.get("nodes", [])],
            edges=[Edge.from_dict(e) for e in data.get("edges", [])],
            triggers=[Trigger.from_dict(t) for t in data.get("triggers", [])],
            metadata=data.get("metadata", {}),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "action": {"plugin_id": n.action.plugin_id, "config": n.action.config},
                    "condition": {"expression": n.condition.expression} if n.condition else None,
                    "retry_policy": {
                        "max_retries": n.retry_policy.max_retries,
                        "backoff_seconds": n.retry_policy.backoff_seconds,
                        "backoff_multiplier": n.retry_policy.backoff_multiplier,
                    },
                    "timeout_seconds": n.timeout_seconds,
                    "loop": (
                        {"until_condition": n.loop.until_condition, "max_iterations": n.loop.max_iterations}
                        if n.loop
                        else None
                    ),
                }
                for n in self.nodes
            ],
            "edges": [{"source": e.source, "target": e.target} for e in self.edges],
            "triggers": [{"type": t.type.value, "config": t.config} for t in self.triggers],
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }
