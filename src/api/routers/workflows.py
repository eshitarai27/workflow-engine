"""Workflow CRUD, versioning, and validation."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_workflow_service
from src.api.schemas import WorkflowDefinitionRequest
from src.compiler.compiler import CycleDetectedError
from src.compiler.validator import WorkflowValidationError
from src.services.workflow_service import WorkflowNotFoundError, WorkflowService

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.post("")
def create_workflow(body: WorkflowDefinitionRequest, service: WorkflowService = Depends(get_workflow_service)):
    try:
        workflow = service.create_workflow(body.model_dump(exclude_none=True))
    except WorkflowValidationError as exc:
        raise HTTPException(status_code=400, detail={"errors": exc.errors}) from exc
    except CycleDetectedError as exc:
        raise HTTPException(status_code=400, detail={"errors": [str(exc)], "cycle": exc.cycle}) from exc
    return workflow.to_dict()


@router.get("")
def list_workflows(service: WorkflowService = Depends(get_workflow_service)):
    return [w.to_dict() for w in service.list_workflows()]


@router.post("/validate")
def validate_workflow(body: WorkflowDefinitionRequest, service: WorkflowService = Depends(get_workflow_service)):
    definition = body.model_dump(exclude_none=True)
    definition.setdefault("id", "validation-preview")
    definition.setdefault("version", 1)
    errors = service.validate_definition(definition)
    return {"valid": not errors, "errors": errors}


@router.get("/{workflow_id}")
def get_workflow(
    workflow_id: str, version: Optional[int] = None, service: WorkflowService = Depends(get_workflow_service)
):
    try:
        workflow = service.get_workflow(workflow_id, version)
    except WorkflowNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found") from exc
    return workflow.to_dict()


@router.put("/{workflow_id}")
def update_workflow(
    workflow_id: str, body: WorkflowDefinitionRequest, service: WorkflowService = Depends(get_workflow_service)
):
    try:
        workflow = service.update_workflow(workflow_id, body.model_dump(exclude_none=True))
    except WorkflowNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found") from exc
    except WorkflowValidationError as exc:
        raise HTTPException(status_code=400, detail={"errors": exc.errors}) from exc
    except CycleDetectedError as exc:
        raise HTTPException(status_code=400, detail={"errors": [str(exc)], "cycle": exc.cycle}) from exc
    return workflow.to_dict()


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, service: WorkflowService = Depends(get_workflow_service)):
    try:
        service.delete_workflow(workflow_id)
    except WorkflowNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found") from exc
    return {"deleted": True}


@router.get("/{workflow_id}/versions")
def list_versions(workflow_id: str, service: WorkflowService = Depends(get_workflow_service)):
    return service.list_versions(workflow_id)


@router.get("/{workflow_id}/versions/compare")
def compare_versions(
    workflow_id: str, from_version: int, to_version: int, service: WorkflowService = Depends(get_workflow_service)
):
    try:
        diff = service.compare_versions(workflow_id, from_version, to_version)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return diff.to_dict()
