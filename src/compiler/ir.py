"""The compiler's intermediate representation: a workflow definition turned
into a plain dependency graph, decoupled from the authoring format (JSON)
and from how it will eventually be scheduled."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Set

from src.models.workflow import Node, Workflow


@dataclass
class IRNode:
    node: Node
    depends_on: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)


@dataclass
class IRGraph:
    """A validated, acyclic dependency graph derived from a Workflow."""

    workflow_id: str
    workflow_version: int
    nodes: Dict[str, IRNode] = field(default_factory=dict)

    @property
    def node_ids(self) -> List[str]:
        return list(self.nodes.keys())

    def roots(self) -> List[str]:
        """Nodes with no dependencies -- valid starting points."""
        return [nid for nid, n in self.nodes.items() if not n.depends_on]

    def leaves(self) -> List[str]:
        """Nodes nothing else depends on -- valid ending points."""
        return [nid for nid, n in self.nodes.items() if not n.dependents]

    @classmethod
    def from_workflow(cls, workflow: Workflow) -> "IRGraph":
        graph = cls(workflow_id=workflow.id, workflow_version=workflow.version)
        for node in workflow.nodes:
            graph.nodes[node.id] = IRNode(node=node)
        for edge in workflow.edges:
            graph.nodes[edge.target].depends_on.add(edge.source)
            graph.nodes[edge.source].dependents.add(edge.target)
        return graph
