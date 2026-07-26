"""Tests for validation, cycle detection, and IR compilation."""
from __future__ import annotations

import pytest

from src.compiler.compiler import CycleDetectedError
from src.compiler.validator import WorkflowValidationError


def make_node(node_id: str, plugin_id: str = "http") -> dict:
    return {"id": node_id, "name": node_id, "action": {"plugin_id": plugin_id}}


def test_compiles_a_valid_dag(compiler):
    definition = {
        "id": "wf1",
        "name": "test",
        "nodes": [make_node("a"), make_node("b"), make_node("c")],
        "edges": [{"source": "a", "target": "b"}, {"source": "a", "target": "c"}],
    }
    result = compiler.compile(definition)
    assert result.graph.roots() == ["a"]
    assert set(result.graph.leaves()) == {"b", "c"}


def test_rejects_missing_nodes(compiler):
    with pytest.raises(WorkflowValidationError) as exc_info:
        compiler.compile({"id": "wf1", "name": "test", "nodes": []})
    assert "non-empty list" in exc_info.value.errors[0]


def test_rejects_duplicate_node_ids(compiler):
    definition = {"id": "wf1", "name": "test", "nodes": [make_node("a"), make_node("a")]}
    with pytest.raises(WorkflowValidationError) as exc_info:
        compiler.compile(definition)
    assert any("Duplicate node id" in e for e in exc_info.value.errors)


def test_rejects_dangling_edge(compiler):
    definition = {
        "id": "wf1",
        "name": "test",
        "nodes": [make_node("a")],
        "edges": [{"source": "a", "target": "ghost"}],
    }
    with pytest.raises(WorkflowValidationError) as exc_info:
        compiler.compile(definition)
    assert any("unknown target" in e for e in exc_info.value.errors)


def test_rejects_self_loop_edge(compiler):
    definition = {
        "id": "wf1",
        "name": "test",
        "nodes": [make_node("a")],
        "edges": [{"source": "a", "target": "a"}],
    }
    with pytest.raises(WorkflowValidationError):
        compiler.compile(definition)


def test_rejects_unknown_plugin_when_known_ids_given():
    from src.compiler.compiler import WorkflowCompiler

    compiler = WorkflowCompiler(known_plugin_ids={"http"})
    definition = {"id": "wf1", "name": "test", "nodes": [make_node("a", plugin_id="not_a_real_plugin")]}
    with pytest.raises(WorkflowValidationError) as exc_info:
        compiler.compile(definition)
    assert any("unknown plugin" in e for e in exc_info.value.errors)


def test_detects_a_three_node_cycle(compiler):
    definition = {
        "id": "wf1",
        "name": "test",
        "nodes": [make_node("a"), make_node("b"), make_node("c")],
        "edges": [
            {"source": "a", "target": "b"},
            {"source": "b", "target": "c"},
            {"source": "c", "target": "a"},
        ],
    }
    with pytest.raises(CycleDetectedError) as exc_info:
        compiler.compile(definition)
    assert set(exc_info.value.cycle) == {"a", "b", "c"}


def test_warns_about_unreachable_nodes(compiler):
    definition = {
        "id": "wf1",
        "name": "test",
        "nodes": [make_node("a"), make_node("b"), make_node("orphan")],
        "edges": [{"source": "a", "target": "b"}],
    }
    result = compiler.compile(definition)
    assert any("orphan" in w for w in result.warnings)
