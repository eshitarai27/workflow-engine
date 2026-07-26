"""Structural validation of a raw workflow definition, before it's even
turned into :class:`~src.models.workflow.Workflow` objects.

Kept separate from cycle detection (see ``compiler.py``): this layer catches
authoring mistakes (missing fields, dangling edges, duplicate ids) that are
independent of graph shape.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional, Set


class WorkflowValidationError(ValueError):
    """Raised with the full list of problems found, not just the first one."""

    def __init__(self, errors: List[str]) -> None:
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_definition(data: Dict[str, Any], known_plugin_ids: Optional[Set[str]] = None) -> List[str]:
    """Check a raw workflow definition (already-parsed JSON) for structural
    problems. Returns a list of human-readable error messages; an empty list
    means the definition is well-formed enough to compile."""
    errors: List[str] = []

    for field_name in ("id", "name", "nodes"):
        if field_name not in data:
            errors.append(f"Missing required field: '{field_name}'")

    nodes = data.get("nodes", [])
    if not isinstance(nodes, list) or not nodes:
        errors.append("'nodes' must be a non-empty list")
        return errors

    node_ids: Set[str] = set()
    for i, node in enumerate(nodes):
        if "id" not in node:
            errors.append(f"nodes[{i}] is missing 'id'")
            continue
        node_id = node["id"]
        if node_id in node_ids:
            errors.append(f"Duplicate node id: '{node_id}'")
        node_ids.add(node_id)

        action = node.get("action")
        if not action or "plugin_id" not in action:
            errors.append(f"Node '{node_id}' is missing action.plugin_id")
        elif known_plugin_ids is not None and action["plugin_id"] not in known_plugin_ids:
            errors.append(f"Node '{node_id}' references unknown plugin '{action['plugin_id']}'")

        loop = node.get("loop")
        if loop and "until_condition" not in loop:
            errors.append(f"Node '{node_id}' has a loop block missing 'until_condition'")

    edges = data.get("edges", [])
    if not isinstance(edges, list):
        errors.append("'edges' must be a list")
        edges = []

    seen_edges: Set[tuple] = set()
    for i, edge in enumerate(edges):
        source, target = edge.get("source"), edge.get("target")
        if source is None or target is None:
            errors.append(f"edges[{i}] must have 'source' and 'target'")
            continue
        if source == target:
            errors.append(f"Node '{source}' cannot depend on itself (self-loop edges are not allowed)")
        if source not in node_ids:
            errors.append(f"Edge references unknown source node '{source}'")
        if target not in node_ids:
            errors.append(f"Edge references unknown target node '{target}'")
        if (source, target) in seen_edges:
            errors.append(f"Duplicate edge: {source} -> {target}")
        seen_edges.add((source, target))

    return errors
