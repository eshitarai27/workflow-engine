"""Tests for topological layering and critical-path analysis."""
from __future__ import annotations


def make_node(node_id: str) -> dict:
    return {"id": node_id, "name": node_id, "action": {"plugin_id": "http"}}


def test_diamond_produces_three_layers_with_parallel_middle(compiler, planner):
    definition = {
        "id": "wf",
        "name": "diamond",
        "nodes": [make_node(n) for n in "abcd"],
        "edges": [
            {"source": "a", "target": "b"},
            {"source": "a", "target": "c"},
            {"source": "b", "target": "d"},
            {"source": "c", "target": "d"},
        ],
    }
    result = compiler.compile(definition)
    plan = planner.plan(result.graph)
    assert plan.layers == [["a"], ["b", "c"], ["d"]]
    assert plan.max_parallelism == 2
    assert plan.node_count == 4


def test_fully_independent_nodes_form_a_single_layer(compiler, planner):
    definition = {"id": "wf", "name": "parallel", "nodes": [make_node(n) for n in "abc"], "edges": []}
    result = compiler.compile(definition)
    plan = planner.plan(result.graph)
    assert len(plan.layers) == 1
    assert set(plan.layers[0]) == {"a", "b", "c"}


def test_critical_path_follows_the_slower_branch(compiler, planner):
    definition = {
        "id": "wf",
        "name": "diamond",
        "nodes": [make_node(n) for n in "abcd"],
        "edges": [
            {"source": "a", "target": "b"},
            {"source": "a", "target": "c"},
            {"source": "b", "target": "d"},
            {"source": "c", "target": "d"},
        ],
    }
    result = compiler.compile(definition)
    critical = planner.critical_path(result.graph, {"a": 1, "b": 5, "c": 1, "d": 1})
    assert critical.path == ["a", "b", "d"]
    assert critical.total_duration_seconds == 7


def test_critical_path_uses_default_duration_for_unknown_nodes(compiler, planner):
    definition = {"id": "wf", "name": "single", "nodes": [make_node("a")], "edges": []}
    result = compiler.compile(definition)
    critical = planner.critical_path(result.graph, {}, default_duration=2.5)
    assert critical.path == ["a"]
    assert critical.total_duration_seconds == 2.5
