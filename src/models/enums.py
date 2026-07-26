"""Enumerations shared across the workflow engine's domain model."""
from __future__ import annotations

from enum import Enum


class NodeState(str, Enum):
    """Lifecycle states of a single node within one execution."""

    WAITING = "WAITING"
    READY = "READY"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"

    @property
    def is_terminal(self) -> bool:
        return self in (NodeState.SUCCESS, NodeState.FAILED, NodeState.SKIPPED, NodeState.CANCELLED)


class ExecutionStatus(str, Enum):
    """Lifecycle status of an entire workflow execution."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

    @property
    def is_terminal(self) -> bool:
        return self in (ExecutionStatus.SUCCESS, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED)


class TriggerType(str, Enum):
    """How a workflow execution can be initiated."""

    MANUAL = "MANUAL"
    SCHEDULE = "SCHEDULE"
    WEBHOOK = "WEBHOOK"
    EVENT = "EVENT"


class EventType(str, Enum):
    """The internal event bus's event catalog."""

    WORKFLOW_STARTED = "WorkflowStarted"
    WORKFLOW_COMPLETED = "WorkflowCompleted"
    WORKFLOW_FAILED = "WorkflowFailed"
    WORKFLOW_PAUSED = "WorkflowPaused"
    WORKFLOW_RESUMED = "WorkflowResumed"
    WORKFLOW_CANCELLED = "WorkflowCancelled"
    NODE_STARTED = "NodeStarted"
    NODE_COMPLETED = "NodeCompleted"
    NODE_FAILED = "NodeFailed"
    NODE_SKIPPED = "NodeSkipped"
    PLUGIN_LOADED = "PluginLoaded"
    RETRY_STARTED = "RetryStarted"
    CHECKPOINT_CREATED = "CheckpointCreated"


class ArtifactType(str, Enum):
    JSON = "JSON"
    TEXT = "TEXT"
    FILE = "FILE"
    BINARY = "BINARY"
