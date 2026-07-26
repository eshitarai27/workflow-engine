"""Recent platform-wide events, for the dashboard's live timeline."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from src.api.deps import get_event_bus
from src.events.event_bus import EventBus

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
def list_recent_events(limit: int = 200, bus: EventBus = Depends(get_event_bus)):
    return [e.to_dict() for e in bus.history(limit)]
