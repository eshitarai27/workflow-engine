"""Starts, tracks, pauses, resumes, and cancels workflow executions.

An execution runs on its own background thread (the engine itself
dispatches individual nodes onto the shared :class:`WorkerPool`), so
``start_execution`` returns immediately with a PENDING/RUNNING execution
the caller can poll or subscribe to via the event bus. Progress is
persisted incrementally by subscribing to the engine's own lifecycle
events, piggybacking on the same events the API's live timeline reads.
"""
from __future__ import annotations

import threading
from typing import Any, Dict, List, Optional

from src.compiler.compiler import WorkflowCompiler
from src.engine.engine import ExecutionEngine
from src.events.event_bus import EventBus
from src.models.enums import EventType, ExecutionStatus
from src.models.execution import Execution
from src.planner.planner import WorkflowPlanner
from src.storage.execution_repository import ExecutionRepository
from src.storage.workflow_repository import WorkflowRepository
from src.utils.ids import new_id
from src.utils.logging import get_logger

logger = get_logger("flowforge.services.execution")

_PERSIST_ON = (
    EventType.WORKFLOW_STARTED,
    EventType.WORKFLOW_RESUMED,
    EventType.CHECKPOINT_CREATED,
    EventType.WORKFLOW_COMPLETED,
    EventType.WORKFLOW_FAILED,
    EventType.WORKFLOW_CANCELLED,
    EventType.WORKFLOW_PAUSED,
)


class ExecutionNotFoundError(KeyError):
    pass


class ExecutionService:
    def __init__(
        self,
        workflow_repository: WorkflowRepository,
        execution_repository: ExecutionRepository,
        engine: ExecutionEngine,
        event_bus: EventBus,
    ) -> None:
        self.workflow_repository = workflow_repository
        self.execution_repository = execution_repository
        self.engine = engine
        self.event_bus = event_bus
        self.compiler = WorkflowCompiler()
        self.planner = WorkflowPlanner()
        self._active: Dict[str, Execution] = {}
        self._lock = threading.Lock()
        for event_type in _PERSIST_ON:
            self.event_bus.subscribe(event_type, self._persist_on_event)

    def _persist_on_event(self, event) -> None:
        execution_id = event.payload.get("execution_id")
        if not execution_id:
            return
        with self._lock:
            execution = self._active.get(execution_id)
        if execution is not None:
            self.execution_repository.save(execution)

    def start_execution(
        self,
        workflow_id: str,
        version: Optional[int] = None,
        initial_context: Optional[Dict[str, Any]] = None,
        triggered_by: str = "manual",
    ) -> Execution:
        workflow = (
            self.workflow_repository.get_version(workflow_id, version)
            if version
            else self.workflow_repository.get_latest(workflow_id)
        )
        if workflow is None:
            raise ExecutionNotFoundError(f"No workflow found for id '{workflow_id}'")

        compiled = self.compiler.compile(workflow.to_dict())
        plan = self.planner.plan(compiled.graph)

        execution = Execution(
            id=new_id("exec"),
            workflow_id=workflow.id,
            workflow_version=workflow.version,
            triggered_by=triggered_by,
        )
        if initial_context:
            execution.context.update(initial_context)

        with self._lock:
            self._active[execution.id] = execution
        self.execution_repository.save(execution)

        thread = threading.Thread(
            target=self._run_and_cleanup, args=(workflow, compiled.graph, plan, execution, False), daemon=True
        )
        thread.start()
        return execution

    def resume_execution(self, execution_id: str) -> Execution:
        execution = self.get_execution(execution_id)
        if execution is None:
            raise ExecutionNotFoundError(execution_id)
        if execution.status not in (ExecutionStatus.PAUSED, ExecutionStatus.CANCELLED, ExecutionStatus.FAILED):
            raise ValueError(f"Execution {execution_id} is not resumable (status: {execution.status.value})")

        workflow = self.workflow_repository.get_version(execution.workflow_id, execution.workflow_version)
        if workflow is None:
            raise ExecutionNotFoundError(execution.workflow_id)
        compiled = self.compiler.compile(workflow.to_dict())
        plan = self.planner.plan(compiled.graph)

        with self._lock:
            self._active[execution.id] = execution

        thread = threading.Thread(
            target=self._run_and_cleanup, args=(workflow, compiled.graph, plan, execution, True), daemon=True
        )
        thread.start()
        return execution

    def _run_and_cleanup(self, workflow, graph, plan, execution: Execution, resume: bool) -> None:
        try:
            self.engine.run(workflow, graph, plan, execution, resume=resume)
        except Exception:  # noqa: BLE001 - an engine crash must not leave the execution stuck as RUNNING
            logger.exception("execution crashed", extra={"fields": {"execution_id": execution.id}})
            execution.mark_finished(ExecutionStatus.FAILED, error="internal engine error")
        finally:
            self.execution_repository.save(execution)
            with self._lock:
                self._active.pop(execution.id, None)

    def get_execution(self, execution_id: str) -> Optional[Execution]:
        with self._lock:
            if execution_id in self._active:
                return self._active[execution_id]
        return self.execution_repository.get(execution_id)

    def list_for_workflow(self, workflow_id: str, limit: int = 50) -> List[Execution]:
        return self.execution_repository.list_for_workflow(workflow_id, limit)

    def list_recent(self, limit: int = 50) -> List[Execution]:
        return self.execution_repository.list_recent(limit)

    def pause_execution(self, execution_id: str) -> bool:
        return self.engine.pause(execution_id)

    def cancel_execution(self, execution_id: str) -> bool:
        return self.engine.cancel(execution_id)
