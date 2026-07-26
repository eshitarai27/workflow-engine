"""Simulation mode: what a workflow would do, without running it."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from src.api.deps import get_simulation_service, get_workflow_service
from src.api.schemas import WorkflowDefinitionRequest
from src.compiler.compiler import CycleDetectedError
from src.compiler.validator import WorkflowValidationError
from src.models.workflow import Workflow
from src.services.simulation_service import SimulationService
from src.services.workflow_service import WorkflowNotFoundError, WorkflowService

router = APIRouter(tags=["simulation"])


@router.post("/workflows/{workflow_id}/simulate")
def simulate_saved_workflow(
    workflow_id: str,
    version: Optional[int] = None,
    workflow_service: WorkflowService = Depends(get_workflow_service),
    simulation_service: SimulationService = Depends(get_simulation_service),
):
    try:
        workflow = workflow_service.get_workflow(workflow_id, version)
    except WorkflowNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found") from exc
    try:
        result = simulation_service.simulate(workflow)
    except (WorkflowValidationError, CycleDetectedError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result.to_dict()


@router.post("/simulate")
def simulate_draft_workflow(
    body: WorkflowDefinitionRequest, simulation_service: SimulationService = Depends(get_simulation_service)
):
    """Simulates a not-yet-saved definition -- the builder's live preview."""
    definition = body.model_dump(exclude_none=True)
    definition.setdefault("id", "draft")
    definition.setdefault("version", 1)
    try:
        workflow = Workflow.from_dict(definition)
        result = simulation_service.simulate(workflow)
    except (WorkflowValidationError, CycleDetectedError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result.to_dict()
