"""Receives external webhook calls and enqueues a workflow execution for
them, via the Scheduler's execution queue."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends

from src.api.deps import get_scheduler
from src.scheduler.scheduler import Scheduler

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/{workflow_id}")
def receive_webhook(workflow_id: str, payload: Dict[str, Any], scheduler: Scheduler = Depends(get_scheduler)):
    scheduler.trigger_webhook(workflow_id, payload)
    return {"enqueued": True, "workflow_id": workflow_id}
