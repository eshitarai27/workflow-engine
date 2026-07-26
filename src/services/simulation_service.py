"""Simulation mode: reports what a workflow *would* do without running any
node's action -- execution order, estimated runtime, parallel branches, the
critical path, and likely bottlenecks.

Duration estimates come from the average of each node's past recorded
durations (via ``ExecutionRepository``), falling back to a flat default for
nodes that have never run. This is why simulation only ever depends on the
planner, never the engine: nothing here executes anything.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

from src.compiler.compiler import WorkflowCompiler
from src.models.enums import NodeState
from src.models.workflow import Workflow
from src.planner.planner import WorkflowPlanner
from src.storage.execution_repository import ExecutionRepository

DEFAULT_NODE_DURATION_SECONDS = 1.0
BOTTLENECK_THRESHOLD_MULTIPLIER = 1.5


@dataclass
class Bottleneck:
    node_id: str
    estimated_duration_seconds: float
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "estimated_duration_seconds": self.estimated_duration_seconds,
            "reason": self.reason,
        }


@dataclass
class SimulationResult:
    workflow_id: str
    workflow_version: int
    execution_order: List[str]
    layers: List[List[str]]
    estimated_runtime_seconds: float
    critical_path: List[str]
    parallel_branches: List[List[str]]
    bottlenecks: List[Bottleneck]
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "workflow_id": self.workflow_id,
            "workflow_version": self.workflow_version,
            "execution_order": self.execution_order,
            "layers": self.layers,
            "estimated_runtime_seconds": self.estimated_runtime_seconds,
            "critical_path": self.critical_path,
            "parallel_branches": self.parallel_branches,
            "bottlenecks": [b.to_dict() for b in self.bottlenecks],
            "warnings": self.warnings,
        }


class SimulationService:
    def __init__(self, execution_repository: ExecutionRepository) -> None:
        self.execution_repository = execution_repository
        self.compiler = WorkflowCompiler()
        self.planner = WorkflowPlanner()

    def simulate(self, workflow: Workflow) -> SimulationResult:
        compiled = self.compiler.compile(workflow.to_dict())
        graph = compiled.graph
        plan = self.planner.plan(graph)

        duration_by_node = self._estimate_durations(workflow.id, graph.node_ids)
        critical = self.planner.critical_path(graph, duration_by_node, DEFAULT_NODE_DURATION_SECONDS)

        execution_order = [node_id for layer in plan.layers for node_id in layer]
        parallel_branches = [layer for layer in plan.layers if len(layer) > 1]

        average_duration = (
            sum(duration_by_node.values()) / len(duration_by_node) if duration_by_node else DEFAULT_NODE_DURATION_SECONDS
        )
        bottlenecks = [
            Bottleneck(
                node_id=node_id,
                estimated_duration_seconds=duration,
                reason=f"takes {duration:.2f}s, {duration / average_duration:.1f}x the workflow's average node duration",
            )
            for node_id, duration in duration_by_node.items()
            if duration > average_duration * BOTTLENECK_THRESHOLD_MULTIPLIER
        ]
        bottlenecks.sort(key=lambda b: b.estimated_duration_seconds, reverse=True)

        return SimulationResult(
            workflow_id=workflow.id,
            workflow_version=workflow.version,
            execution_order=execution_order,
            layers=plan.layers,
            estimated_runtime_seconds=critical.total_duration_seconds,
            critical_path=critical.path,
            parallel_branches=parallel_branches,
            bottlenecks=bottlenecks,
            warnings=compiled.warnings,
        )

    def _estimate_durations(self, workflow_id: str, node_ids: List[str]) -> Dict[str, float]:
        durations_ms: Dict[str, List[float]] = {node_id: [] for node_id in node_ids}
        for execution in self.execution_repository.list_for_workflow(workflow_id, limit=50):
            for record in execution.history.records:
                if record.state == NodeState.SUCCESS and record.duration_ms is not None and record.node_id in durations_ms:
                    durations_ms[record.node_id].append(record.duration_ms)

        return {
            node_id: (sum(values) / len(values) / 1000.0) if values else DEFAULT_NODE_DURATION_SECONDS
            for node_id, values in durations_ms.items()
        }
