"""Turns a workflow definition into a validated, acyclic IR graph.

Pipeline (see docs/architecture.md for the full picture)::

    raw dict --validate_definition--> Workflow.from_dict --> IRGraph --detect_cycles-->

The planner then takes that IRGraph and turns it into an ExecutionPlan.
Compilation is entirely separate from execution: nothing in this module
runs a node's action.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set

from src.models.workflow import Workflow

from .ir import IRGraph
from .validator import WorkflowValidationError, validate_definition


class CycleDetectedError(ValueError):
    """Raised when the dependency graph contains a cycle.

    ``cycle`` is the actual list of node ids forming the cycle, so the
    caller (API layer, CLI, frontend) can point the author directly at the
    problem instead of just saying "there is a cycle somewhere."
    """

    def __init__(self, cycle: List[str]) -> None:
        self.cycle = cycle
        super().__init__(f"Cycle detected: {' -> '.join(cycle)}")


@dataclass
class CompilationResult:
    workflow: Workflow
    graph: IRGraph
    warnings: List[str]


class WorkflowCompiler:
    """Validates a raw workflow definition and compiles it into an IR graph."""

    def __init__(self, known_plugin_ids: Optional[Set[str]] = None) -> None:
        self.known_plugin_ids = known_plugin_ids

    def compile(self, definition: Dict[str, Any]) -> CompilationResult:
        errors = validate_definition(definition, self.known_plugin_ids)
        if errors:
            raise WorkflowValidationError(errors)

        workflow = Workflow.from_dict(definition)
        graph = IRGraph.from_workflow(workflow)

        cycle = find_cycle(graph)
        if cycle:
            raise CycleDetectedError(cycle)

        warnings = self._warnings(graph)
        return CompilationResult(workflow=workflow, graph=graph, warnings=warnings)

    @staticmethod
    def _warnings(graph: IRGraph) -> List[str]:
        # A node with no dependencies is a valid root by definition, so
        # "reachable from some root" is trivially true for every node --
        # that check can never actually catch an authoring mistake. What's
        # actually worth flagging is a node with *neither* dependencies nor
        # dependents: it runs in isolation, disconnected from the rest of
        # the graph, which is far more likely to be a forgotten edge than
        # an intentional design.
        warnings: List[str] = []
        if len(graph.node_ids) > 1:
            for node_id in sorted(graph.node_ids):
                node = graph.nodes[node_id]
                if not node.depends_on and not node.dependents:
                    warnings.append(f"Node '{node_id}' is isolated (no dependencies or dependents)")
        return warnings


def find_cycle(graph: IRGraph) -> Optional[List[str]]:
    """DFS with three-color marking. Returns the cycle's node ids in order
    if one exists, else ``None``. O(V + E)."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node_id: WHITE for node_id in graph.node_ids}
    path: List[str] = []

    def visit(node_id: str) -> Optional[List[str]]:
        color[node_id] = GRAY
        path.append(node_id)
        for dependent in sorted(graph.nodes[node_id].dependents):
            if color[dependent] == GRAY:
                cycle_start = path.index(dependent)
                return path[cycle_start:] + [dependent]
            if color[dependent] == WHITE:
                result = visit(dependent)
                if result:
                    return result
        color[node_id] = BLACK
        path.pop()
        return None

    for node_id in graph.node_ids:
        if color[node_id] == WHITE:
            result = visit(node_id)
            if result:
                return result
    return None
