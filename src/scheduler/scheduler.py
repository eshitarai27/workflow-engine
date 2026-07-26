"""Fires workflows on their configured SCHEDULE triggers and drains the
ExecutionQueue -- whether a request came from a schedule, a webhook, or
another event source -- handing each one to the ExecutionService.

Runs as two background threads: one polls workflows for due schedules and
enqueues requests, the other drains the queue and starts executions. Kept
separate from ExecutionService itself so "what starts an execution" (API
call, schedule, webhook) stays decoupled from "how an execution runs."
"""
from __future__ import annotations

import threading
import time
from typing import Dict, List, Optional

from src.models.enums import TriggerType
from src.services.execution_service import ExecutionService
from src.storage.workflow_repository import WorkflowRepository
from src.utils.logging import get_logger

from .queue import ExecutionQueue, ExecutionRequest

logger = get_logger("flowforge.scheduler")


class Scheduler:
    def __init__(
        self,
        workflow_repository: WorkflowRepository,
        execution_service: ExecutionService,
        queue: Optional[ExecutionQueue] = None,
        poll_interval_seconds: float = 1.0,
    ) -> None:
        self.workflow_repository = workflow_repository
        self.execution_service = execution_service
        self.queue = queue or ExecutionQueue()
        self.poll_interval_seconds = poll_interval_seconds
        self._last_run: Dict[str, float] = {}
        self._stop_event = threading.Event()
        self._threads: List[threading.Thread] = []

    def start(self) -> None:
        self._stop_event.clear()
        poller = threading.Thread(target=self._poll_loop, daemon=True, name="scheduler-poller")
        worker = threading.Thread(target=self._drain_loop, daemon=True, name="scheduler-worker")
        poller.start()
        worker.start()
        self._threads = [poller, worker]

    def stop(self) -> None:
        self._stop_event.set()

    def trigger_webhook(self, workflow_id: str, payload: dict) -> None:
        """Enqueues an execution for ``workflow_id``, as if fired by an
        external webhook receiver posting to this workflow's WEBHOOK
        trigger."""
        self.queue.enqueue(
            ExecutionRequest(workflow_id=workflow_id, initial_context=payload, triggered_by="webhook")
        )

    def _poll_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._check_schedules()
            except Exception:  # noqa: BLE001 - one bad workflow must not stop the poller
                logger.exception("scheduler poll failed")
            self._stop_event.wait(self.poll_interval_seconds)

    def _check_schedules(self) -> None:
        now = time.time()
        for workflow in self.workflow_repository.list_latest():
            for trigger in workflow.triggers:
                if trigger.type != TriggerType.SCHEDULE:
                    continue
                interval = float(trigger.config.get("interval_seconds", 0))
                if interval <= 0:
                    continue
                last_run = self._last_run.get(workflow.id, 0.0)
                if now - last_run >= interval:
                    self._last_run[workflow.id] = now
                    self.queue.enqueue(ExecutionRequest(workflow_id=workflow.id, triggered_by="schedule"))

    def _drain_loop(self) -> None:
        while not self._stop_event.is_set():
            request = self.queue.dequeue(timeout=self.poll_interval_seconds)
            if request is None:
                continue
            try:
                self.execution_service.start_execution(
                    request.workflow_id,
                    version=request.version,
                    initial_context=request.initial_context,
                    triggered_by=request.triggered_by,
                )
            except Exception:  # noqa: BLE001 - a bad request must not stop the drain loop
                logger.exception(
                    "scheduler failed to start execution", extra={"fields": {"workflow_id": request.workflow_id}}
                )
