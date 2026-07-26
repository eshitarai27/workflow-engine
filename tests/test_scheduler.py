"""Tests for the Scheduler: schedule-triggered execution and webhook
enqueueing."""
from __future__ import annotations

import time

from src.models.workflow import Workflow
from src.scheduler.scheduler import Scheduler
from src.services.execution_service import ExecutionService


def make_scheduled_workflow(interval_seconds: float) -> Workflow:
    return Workflow.from_dict(
        {
            "id": "wf_scheduled",
            "name": "Scheduled",
            "nodes": [
                {"id": "a", "name": "A", "action": {"plugin_id": "python", "config": {"code": "def run(state):\n    return {'ran': True}"}}}
            ],
            "edges": [],
            "triggers": [{"type": "SCHEDULE", "config": {"interval_seconds": interval_seconds}}],
        }
    )


def test_scheduler_fires_a_due_schedule_trigger(workflow_repository, execution_repository, engine, event_bus):
    workflow_repository.save_new_version(make_scheduled_workflow(interval_seconds=0.05))
    execution_service = ExecutionService(workflow_repository, execution_repository, engine, event_bus)

    scheduler = Scheduler(workflow_repository, execution_service, poll_interval_seconds=0.02)
    scheduler.start()
    try:
        deadline = time.time() + 3
        while not execution_service.list_for_workflow("wf_scheduled") and time.time() < deadline:
            time.sleep(0.05)
        executions = execution_service.list_for_workflow("wf_scheduled")
        assert len(executions) >= 1
        assert executions[0].triggered_by == "schedule"
    finally:
        scheduler.stop()


def test_webhook_trigger_enqueues_and_runs(workflow_repository, execution_repository, engine, event_bus):
    workflow_repository.save_new_version(
        Workflow.from_dict(
            {
                "id": "wf_webhook",
                "name": "Webhook",
                "nodes": [
                    {"id": "a", "name": "A", "action": {"plugin_id": "python", "config": {"code": "def run(state):\n    return {'seen': state.get('payload_flag')}"}}}
                ],
                "edges": [],
            }
        )
    )
    execution_service = ExecutionService(workflow_repository, execution_repository, engine, event_bus)
    scheduler = Scheduler(workflow_repository, execution_service, poll_interval_seconds=0.02)
    scheduler.start()
    try:
        scheduler.trigger_webhook("wf_webhook", {"payload_flag": True})
        deadline = time.time() + 3
        executions = []
        while not executions and time.time() < deadline:
            time.sleep(0.05)
            executions = execution_service.list_for_workflow("wf_webhook")
        assert len(executions) == 1
        assert executions[0].triggered_by == "webhook"
    finally:
        scheduler.stop()
