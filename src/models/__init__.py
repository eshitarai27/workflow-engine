"""Domain model: framework-agnostic dataclasses shared by the compiler,
engine, storage, and API layers."""
from .enums import ArtifactType, EventType, ExecutionStatus, NodeState, TriggerType
from .workflow import Action, Condition, Edge, LoopSpec, Node, RetryPolicy, Trigger, Workflow
from .execution import Execution, ExecutionContext, ExecutionHistory, NodeExecutionRecord
from .plugin import ConfigField, PluginMetadata
from .artifact import Artifact

__all__ = [
    "ArtifactType",
    "EventType",
    "ExecutionStatus",
    "NodeState",
    "TriggerType",
    "Action",
    "Condition",
    "Edge",
    "LoopSpec",
    "Node",
    "RetryPolicy",
    "Trigger",
    "Workflow",
    "Execution",
    "ExecutionContext",
    "ExecutionHistory",
    "NodeExecutionRecord",
    "ConfigField",
    "PluginMetadata",
    "Artifact",
]
