"""Tests for the DAG execution engine: parallelism, retries, conditions,
skip propagation, looping, cancellation, pausing, and resume."""
from __future__ import annotations

import threading
import time

from src.models.enums import ExecutionStatus, NodeState
from src.models.execution import Execution
from src.models.plugin import PluginMetadata
from src.plugins.base import Plugin
from src.utils.ids import new_id


def python_node(node_id: str, code: str, **extra) -> dict:
    return {"id": node_id, "name": node_id, "action": {"plugin_id": "python", "config": {"code": code}}, **extra}


def run_workflow(compiler, planner, engine, definition, resume=False, execution_id=None):
    result = compiler.compile(definition)
    plan = planner.plan(result.graph)
    execution = Execution(
        id=execution_id or new_id("exec"), workflow_id=result.workflow.id, workflow_version=result.workflow.version
    )
    return engine.run(result.workflow, result.graph, plan, execution, resume=resume), result, plan


def test_downstream_node_config_can_reference_upstream_output(compiler, planner, engine, plugin_registry):
    captured = {}

    class ProbePlugin(Plugin):
        metadata = PluginMetadata(id="probe", name="Probe", description="captures its rendered config")

        def execute(self, config, context):
            captured.update(config)
            return {}

    plugin_registry.register(ProbePlugin())
    definition = {
        "id": "wf",
        "name": "templating",
        "nodes": [
            python_node("produce", "def run(state):\n    return {'summary': 'hello world'}"),
            {
                "id": "consume",
                "name": "consume",
                "action": {"plugin_id": "probe", "config": {"body": "Summary: {{summary}}"}},
            },
        ],
        "edges": [{"source": "produce", "target": "consume"}],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.status == ExecutionStatus.SUCCESS
    assert captured["body"] == "Summary: hello world"


def test_diamond_workflow_runs_all_nodes_and_merges_output(compiler, planner, engine):
    definition = {
        "id": "wf",
        "name": "diamond",
        "nodes": [
            python_node("a", "def run(state):\n    return {'a': 1}"),
            python_node("b", "def run(state):\n    return {'b': state['a'] + 1}"),
            python_node("c", "def run(state):\n    return {'c': state['a'] + 2}"),
            python_node("d", "def run(state):\n    return {'d': state['b'] + state['c']}"),
        ],
        "edges": [
            {"source": "a", "target": "b"},
            {"source": "a", "target": "c"},
            {"source": "b", "target": "d"},
            {"source": "c", "target": "d"},
        ],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.status == ExecutionStatus.SUCCESS
    assert execution.context.snapshot()["d"] == 5
    assert all(s == NodeState.SUCCESS for s in execution.node_states.values())


def test_retry_policy_retries_then_fails(compiler, planner, engine):
    definition = {
        "id": "wf",
        "name": "retry",
        "nodes": [
            python_node(
                "flaky",
                "def run(state):\n    raise RuntimeError('boom')",
                retry_policy={"max_retries": 2, "backoff_seconds": 0.01},
            )
        ],
        "edges": [],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.status == ExecutionStatus.FAILED
    attempts = [r.attempt for r in execution.history.records]
    assert attempts == [1, 2, 3]


def test_failed_dependency_skips_descendants(compiler, planner, engine):
    definition = {
        "id": "wf",
        "name": "skip",
        "nodes": [
            python_node("x", "def run(state):\n    raise RuntimeError('fail')"),
            python_node("y", "def run(state):\n    return {'y': 1}"),
        ],
        "edges": [{"source": "x", "target": "y"}],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.node_states["x"] == NodeState.FAILED
    assert execution.node_states["y"] == NodeState.SKIPPED
    assert execution.status == ExecutionStatus.FAILED


def test_condition_false_skips_node(compiler, planner, engine):
    definition = {
        "id": "wf",
        "name": "condition",
        "nodes": [
            python_node("x", "def run(state):\n    return {'flag': False}"),
            {**python_node("y", "def run(state):\n    return {'y': 1}"), "condition": {"expression": "flag"}},
        ],
        "edges": [{"source": "x", "target": "y"}],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.node_states["y"] == NodeState.SKIPPED
    assert execution.status == ExecutionStatus.SUCCESS  # a skip is not a failure


def test_loop_runs_until_condition_satisfied(compiler, planner, engine):
    definition = {
        "id": "wf",
        "name": "loop",
        "nodes": [
            {
                **python_node("counter", "def run(state):\n    return {'count': state.get('count', 0) + 1}"),
                "loop": {"until_condition": "count >= 5", "max_iterations": 20},
            }
        ],
        "edges": [],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.status == ExecutionStatus.SUCCESS
    assert execution.context.snapshot()["count"] == 5
    assert [r.iteration for r in execution.history.records] == [1, 2, 3, 4, 5]


def test_loop_stops_at_max_iterations_even_if_condition_never_true(compiler, planner, engine):
    definition = {
        "id": "wf",
        "name": "loop",
        "nodes": [
            {
                **python_node("counter", "def run(state):\n    return {'count': state.get('count', 0) + 1}"),
                "loop": {"until_condition": "count >= 999", "max_iterations": 3},
            }
        ],
        "edges": [],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.context.snapshot()["count"] == 3


def test_timeout_fails_the_node(compiler, planner, engine, plugin_registry):
    class SlowPlugin(Plugin):
        metadata = PluginMetadata(id="slow_test", name="Slow", description="sleeps")

        def execute(self, config, context):
            time.sleep(0.3)
            return {}

    plugin_registry.register(SlowPlugin())
    definition = {
        "id": "wf",
        "name": "timeout",
        "nodes": [{"id": "n1", "name": "n1", "action": {"plugin_id": "slow_test"}, "timeout_seconds": 0.05}],
        "edges": [],
    }
    execution, _, _ = run_workflow(compiler, planner, engine, definition)
    assert execution.status == ExecutionStatus.FAILED
    assert "timeout" in execution.history.records[0].failure_reason.lower()


def test_cancel_stops_before_remaining_nodes_run(compiler, planner, engine, plugin_registry):
    class SlowPlugin(Plugin):
        metadata = PluginMetadata(id="slow_cancel", name="Slow", description="sleeps")

        def execute(self, config, context):
            time.sleep(0.05)
            return {"ok": True}

    plugin_registry.register(SlowPlugin())
    definition = {
        "id": "wf",
        "name": "cancel",
        "nodes": [
            {"id": "n1", "name": "n1", "action": {"plugin_id": "slow_cancel"}},
            {"id": "n2", "name": "n2", "action": {"plugin_id": "slow_cancel"}},
            {"id": "n3", "name": "n3", "action": {"plugin_id": "slow_cancel"}},
        ],
        "edges": [{"source": "n1", "target": "n2"}, {"source": "n2", "target": "n3"}],
    }
    result = compiler.compile(definition)
    plan = planner.plan(result.graph)
    execution = Execution(id=new_id("exec"), workflow_id=result.workflow.id, workflow_version=result.workflow.version)

    threading.Thread(target=lambda: (time.sleep(0.08), engine.cancel(execution.id))).start()
    final = engine.run(result.workflow, result.graph, plan, execution)

    assert final.status == ExecutionStatus.CANCELLED
    assert final.node_states["n3"] == NodeState.CANCELLED


def test_pause_then_resume_completes_the_workflow(compiler, planner, engine, plugin_registry):
    class SlowPlugin(Plugin):
        metadata = PluginMetadata(id="slow_pause", name="Slow", description="sleeps")

        def execute(self, config, context):
            time.sleep(0.05)
            return {"ok": True}

    plugin_registry.register(SlowPlugin())
    definition = {
        "id": "wf",
        "name": "pause",
        "nodes": [
            {"id": "n1", "name": "n1", "action": {"plugin_id": "slow_pause"}},
            {"id": "n2", "name": "n2", "action": {"plugin_id": "slow_pause"}},
        ],
        "edges": [{"source": "n1", "target": "n2"}],
    }
    result = compiler.compile(definition)
    plan = planner.plan(result.graph)
    execution = Execution(id=new_id("exec"), workflow_id=result.workflow.id, workflow_version=result.workflow.version)

    threading.Thread(target=lambda: (time.sleep(0.02), engine.pause(execution.id))).start()
    paused = engine.run(result.workflow, result.graph, plan, execution)
    assert paused.status == ExecutionStatus.PAUSED

    resumed_execution = Execution(
        id=execution.id, workflow_id=result.workflow.id, workflow_version=result.workflow.version
    )
    final = engine.run(result.workflow, result.graph, plan, resumed_execution, resume=True)
    assert final.status == ExecutionStatus.SUCCESS
    assert final.node_states["n1"] == NodeState.SUCCESS
    assert final.node_states["n2"] == NodeState.SUCCESS
