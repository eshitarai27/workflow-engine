"""Tests for the storage layer: workflow versioning/diffing and execution
persistence."""
from __future__ import annotations

from src.models.enums import ExecutionStatus
from src.models.execution import Execution
from src.models.workflow import Workflow
from src.utils.ids import new_id


def make_workflow(node_ids, edges=None) -> Workflow:
    return Workflow.from_dict(
        {
            "id": "wf1",
            "name": "Test",
            "nodes": [{"id": n, "name": n, "action": {"plugin_id": "http"}} for n in node_ids],
            "edges": edges or [],
        }
    )


def test_saving_twice_increments_version(workflow_repository):
    v1 = workflow_repository.save_new_version(make_workflow(["a"]))
    v2 = workflow_repository.save_new_version(make_workflow(["a", "b"], [{"source": "a", "target": "b"}]))
    assert v1.version == 1
    assert v2.version == 2

    latest = workflow_repository.get_latest("wf1")
    assert latest.version == 2
    assert len(latest.nodes) == 2

    original = workflow_repository.get_version("wf1", 1)
    assert len(original.nodes) == 1


def test_compare_versions_reports_added_node_and_edge(workflow_repository):
    workflow_repository.save_new_version(make_workflow(["a"]))
    workflow_repository.save_new_version(make_workflow(["a", "b"], [{"source": "a", "target": "b"}]))

    diff = workflow_repository.compare_versions("wf1", 1, 2)
    assert diff.nodes_added == ["b"]
    assert diff.nodes_removed == []
    assert diff.edges_added == [{"source": "a", "target": "b"}]


def test_list_versions_returns_all_versions_newest_first(workflow_repository):
    workflow_repository.save_new_version(make_workflow(["a"]))
    workflow_repository.save_new_version(make_workflow(["a", "b"]))
    versions = workflow_repository.list_versions("wf1")
    assert [v["version"] for v in versions] == [2, 1]


def test_execution_round_trips_through_storage(execution_repository):
    execution = Execution(
        id=new_id("exec"), workflow_id="wf1", workflow_version=1, status=ExecutionStatus.SUCCESS
    )
    execution.context.set("result", 42)
    execution_repository.save(execution)

    loaded = execution_repository.get(execution.id)
    assert loaded is not None
    assert loaded.status == ExecutionStatus.SUCCESS
    assert loaded.context.snapshot() == {"result": 42}


def test_list_for_workflow_filters_by_workflow_id(execution_repository):
    execution_repository.save(Execution(id=new_id("exec"), workflow_id="wf1", workflow_version=1))
    execution_repository.save(Execution(id=new_id("exec"), workflow_id="wf2", workflow_version=1))

    results = execution_repository.list_for_workflow("wf1")
    assert len(results) == 1
    assert results[0].workflow_id == "wf1"
