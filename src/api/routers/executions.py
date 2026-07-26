"""Starting, tracking, pausing, resuming, and cancelling executions."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_execution_service
from src.api.schemas import ExecutionStartRequest
from src.compiler.compiler import CycleDetectedError
from src.compiler.validator import WorkflowValidationError
from src.services.execution_service import ExecutionNotFoundError, ExecutionService

router = APIRouter(tags=["executions"])


@router.post("/workflows/{workflow_id}/execute")
def start_execution(
    workflow_id: str, body: ExecutionStartRequest, service: ExecutionService = Depends(get_execution_service)
):
    try:
        execution = service.start_execution(
            workflow_id, version=body.version, initial_context=body.initial_context, triggered_by=body.triggered_by
        )
    except ExecutionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except (WorkflowValidationError, CycleDetectedError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return execution.to_dict()


@router.get("/executions/{execution_id}")
def get_execution(execution_id: str, service: ExecutionService = Depends(get_execution_service)):
    execution = service.get_execution(execution_id)
    if execution is None:
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found")
    return execution.to_dict()


@router.get("/executions")
def list_executions(
    workflow_id: Optional[str] = None, limit: int = 50, service: ExecutionService = Depends(get_execution_service)
):
    executions = service.list_for_workflow(workflow_id, limit) if workflow_id else service.list_recent(limit)
    return [e.to_dict() for e in executions]


@router.post("/executions/{execution_id}/pause")
def pause_execution(execution_id: str, service: ExecutionService = Depends(get_execution_service)):
    if not service.pause_execution(execution_id):
        raise HTTPException(status_code=404, detail=f"No running execution '{execution_id}' to pause")
    return {"paused": True}


@router.post("/executions/{execution_id}/resume")
def resume_execution(execution_id: str, service: ExecutionService = Depends(get_execution_service)):
    try:
        execution = service.resume_execution(execution_id)
    except ExecutionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return execution.to_dict()


@router.post("/executions/{execution_id}/cancel")
def cancel_execution(execution_id: str, service: ExecutionService = Depends(get_execution_service)):
    if not service.cancel_execution(execution_id):
        raise HTTPException(status_code=404, detail=f"No running execution '{execution_id}' to cancel")
    return {"cancelled": True}
