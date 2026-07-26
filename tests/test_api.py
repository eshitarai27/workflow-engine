"""End-to-end tests for the REST API, via FastAPI's TestClient.

Each test gets a fresh :class:`Container` wired to an isolated in-memory
database, injected through FastAPI's ``dependency_overrides`` rather than
fighting the app's process-wide ``lru_cache`` singleton.
"""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from src.api import deps
from src.api.app import create_app
from src.api.deps import Container
from src.storage.database import Database


@pytest.fixture()
def client(tmp_path):
    container = Container(database=Database(db_path=":memory:"), checkpoint_dir=str(tmp_path / "checkpoints"))

    app = create_app()
    app.dependency_overrides[deps.get_workflow_service] = lambda: container.workflow_service
    app.dependency_overrides[deps.get_execution_service] = lambda: container.execution_service
    app.dependency_overrides[deps.get_simulation_service] = lambda: container.simulation_service
    app.dependency_overrides[deps.get_plugin_service] = lambda: container.plugin_service
    app.dependency_overrides[deps.get_ai_generator] = lambda: container.ai_generator
    app.dependency_overrides[deps.get_event_bus] = lambda: container.event_bus
    app.dependency_overrides[deps.get_scheduler] = lambda: container.scheduler

    with TestClient(app) as test_client:
        yield test_client
    container.shutdown()


SIMPLE_WORKFLOW = {
    "name": "API Test Workflow",
    "nodes": [
        {"id": "step1", "name": "Step 1", "action": {"plugin_id": "python", "config": {"code": "def run(state):\n    return {'x': 1}"}}},
        {"id": "step2", "name": "Step 2", "action": {"plugin_id": "python", "config": {"code": "def run(state):\n    return {'y': state['x'] + 1}"}}},
    ],
    "edges": [{"source": "step1", "target": "step2"}],
}


def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "FlowForge"


def test_lists_all_ten_plugins(client):
    response = client.get("/plugins")
    assert response.status_code == 200
    assert len(response.json()) == 10


def test_create_and_get_workflow(client):
    response = client.post("/workflows", json=SIMPLE_WORKFLOW)
    assert response.status_code == 200
    workflow_id = response.json()["id"]

    fetched = client.get(f"/workflows/{workflow_id}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "API Test Workflow"


def test_create_rejects_invalid_workflow(client):
    bad = {"name": "bad", "nodes": []}
    response = client.post("/workflows", json=bad)
    assert response.status_code == 400


def test_update_creates_a_new_version(client):
    created = client.post("/workflows", json=SIMPLE_WORKFLOW).json()
    workflow_id = created["id"]

    updated_def = dict(SIMPLE_WORKFLOW)
    updated_def["nodes"] = SIMPLE_WORKFLOW["nodes"] + [
        {"id": "step3", "name": "Step 3", "action": {"plugin_id": "http", "config": {"url": "https://example.com"}}}
    ]
    response = client.put(f"/workflows/{workflow_id}", json=updated_def)
    assert response.status_code == 200
    assert response.json()["version"] == 2

    versions = client.get(f"/workflows/{workflow_id}/versions").json()
    assert len(versions) == 2


def test_simulate_reports_execution_order_and_critical_path(client):
    workflow_id = client.post("/workflows", json=SIMPLE_WORKFLOW).json()["id"]
    response = client.post(f"/workflows/{workflow_id}/simulate")
    assert response.status_code == 200
    body = response.json()
    assert body["execution_order"] == ["step1", "step2"]
    assert body["critical_path"] == ["step1", "step2"]


def test_execute_workflow_and_poll_until_success(client):
    workflow_id = client.post("/workflows", json=SIMPLE_WORKFLOW).json()["id"]
    execution = client.post(f"/workflows/{workflow_id}/execute", json={}).json()
    execution_id = execution["id"]

    deadline = time.time() + 5
    status = execution["status"]
    while status not in ("SUCCESS", "FAILED") and time.time() < deadline:
        time.sleep(0.05)
        status = client.get(f"/executions/{execution_id}").json()["status"]

    assert status == "SUCCESS"
    final = client.get(f"/executions/{execution_id}").json()
    assert final["context"]["y"] == 2


def test_execute_unknown_workflow_returns_404(client):
    response = client.post("/workflows/does-not-exist/execute", json={})
    assert response.status_code == 404


def test_ai_generate_returns_503_without_a_configured_provider(client):
    response = client.post("/ai/generate", json={"prompt": "do something"})
    assert response.status_code == 503


def test_ai_providers_lists_all_four(client):
    response = client.get("/ai/providers")
    assert response.status_code == 200
    assert {p["id"] for p in response.json()} == {"openai", "anthropic", "google", "ollama"}


def test_events_endpoint_returns_recent_events(client):
    workflow_id = client.post("/workflows", json=SIMPLE_WORKFLOW).json()["id"]
    client.post(f"/workflows/{workflow_id}/execute", json={})
    time.sleep(0.3)

    response = client.get("/events?limit=50")
    assert response.status_code == 200
    event_types = [e["type"] for e in response.json()]
    assert "WorkflowStarted" in event_types
