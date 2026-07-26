"""Turns a compiled IR graph into an ExecutionPlan: the topological layering
the engine schedules from, plus the critical-path analysis simulation mode
reports on.

Kept separate from the engine on purpose -- planning is pure and
deterministic (same graph in, same plan out), while execution involves
side effects, retries, and wall-clock time. That split is also what makes
"simulate this workflow without running it" possible: simulation only ever
touches the planner.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from src.compiler.ir import IRGraph


@dataclass
class ExecutionPlan:
    """The planned shape of one run: which nodes can execute in parallel,
    grouped into ordered layers where every node in layer *N* depends only
    on nodes in layers before it."""

    workflow_id: str
    workflow_version: int
    layers: List[List[str]] = field(default_factory=list)
    depends_on: Dict[str, List[str]] = field(default_factory=dict)
    dependents: Dict[str, List[str]] = field(default_factory=dict)

    @property
    def node_count(self) -> int:
        return sum(len(layer) for layer in self.layers)

    @property
    def max_parallelism(self) -> int:
        return max((len(layer) for layer in self.layers), default=0)

    def to_dict(self) -> dict:
        return {
            "workflow_id": self.workflow_id,
            "workflow_version": self.workflow_version,
            "layers": self.layers,
            "node_count": self.node_count,
            "max_parallelism": self.max_parallelism,
            "depends_on": self.depends_on,
        }


@dataclass
class CriticalPathResult:
    path: List[str]
    total_duration_seconds: float
    per_node_duration: Dict[str, float]


class WorkflowPlanner:
    """Builds an :class:`ExecutionPlan` from an already-acyclic
    :class:`~src.compiler.ir.IRGraph`."""

    def plan(self, graph: IRGraph) -> ExecutionPlan:
        layers = self._topological_layers(graph)
        return ExecutionPlan(
            workflow_id=graph.workflow_id,
            workflow_version=graph.workflow_version,
            layers=layers,
            depends_on={nid: sorted(n.depends_on) for nid, n in graph.nodes.items()},
            dependents={nid: sorted(n.dependents) for nid, n in graph.nodes.items()},
        )

    @staticmethod
    def _topological_layers(graph: IRGraph) -> List[List[str]]:
        """Kahn's algorithm, grouped by level rather than flattened, so the
        engine can dispatch an entire layer's nodes concurrently."""
        remaining_deps = {nid: set(n.depends_on) for nid, n in graph.nodes.items()}
        layers: List[List[str]] = []
        placed: set = set()

        while len(placed) < len(graph.nodes):
            ready = sorted(
                nid for nid, deps in remaining_deps.items()
                if nid not in placed and deps <= placed
            )
            if not ready:
                # Should be unreachable -- the compiler already rejected cycles.
                raise RuntimeError("Planner could not make progress; graph may contain an undetected cycle")
            layers.append(ready)
            placed.update(ready)

        return layers

    def critical_path(self, graph: IRGraph, duration_by_node: Dict[str, float], default_duration: float = 1.0) -> CriticalPathResult:
        """Longest path through the graph by estimated duration -- the
        minimum possible wall-clock time the workflow can finish in, and
        the nodes that gate that time."""
        durations = {nid: duration_by_node.get(nid, default_duration) for nid in graph.node_ids}
        order = self._topological_order(graph)

        best_finish: Dict[str, float] = {}
        best_predecessor: Dict[str, Optional[str]] = {}

        for node_id in order:
            deps = graph.nodes[node_id].depends_on
            if not deps:
                best_finish[node_id] = durations[node_id]
                best_predecessor[node_id] = None
            else:
                pred = max(deps, key=lambda d: best_finish[d])
                best_finish[node_id] = best_finish[pred] + durations[node_id]
                best_predecessor[node_id] = pred

        if not best_finish:
            return CriticalPathResult(path=[], total_duration_seconds=0.0, per_node_duration=durations)

        end_node = max(best_finish, key=lambda n: best_finish[n])
        path = [end_node]
        while best_predecessor[path[-1]] is not None:
            path.append(best_predecessor[path[-1]])
        path.reverse()

        return CriticalPathResult(
            path=path,
            total_duration_seconds=best_finish[end_node],
            per_node_duration=durations,
        )

    @staticmethod
    def _topological_order(graph: IRGraph) -> List[str]:
        remaining_deps = {nid: set(n.depends_on) for nid, n in graph.nodes.items()}
        order: List[str] = []
        placed: set = set()
        while len(placed) < len(graph.nodes):
            ready = sorted(nid for nid, deps in remaining_deps.items() if nid not in placed and deps <= placed)
            order.extend(ready)
            placed.update(ready)
        return order
