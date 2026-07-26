"""A minimal, thread-safe, synchronous pub/sub event bus.

Every lifecycle transition in the engine (a node starting, a retry
kicking in, a checkpoint being written, a workflow finishing) publishes
one event here. Subscribers -- structured logging, metrics, the API's
live execution timeline -- never need to know anything about the engine
internals; they just listen for event types they care about.
"""
from __future__ import annotations

import threading
from collections import defaultdict, deque
from typing import Any, Callable, Deque, Dict, List

from src.models.enums import EventType
from src.utils.logging import get_logger

from .event_types import Event

logger = get_logger("flowforge.events")

EventHandler = Callable[[Event], None]


class EventBus:
    def __init__(self, history_size: int = 2000) -> None:
        self._lock = threading.Lock()
        self._subscribers: Dict[EventType, List[EventHandler]] = defaultdict(list)
        self._global_subscribers: List[EventHandler] = []
        self._history: Deque[Event] = deque(maxlen=history_size)

    def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        with self._lock:
            self._subscribers[event_type].append(handler)

    def subscribe_all(self, handler: EventHandler) -> None:
        """Subscribe to every event type, regardless of kind."""
        with self._lock:
            self._global_subscribers.append(handler)

    def publish(self, event_type: EventType, payload: Dict[str, Any]) -> Event:
        event = Event(type=event_type, payload=payload)
        with self._lock:
            self._history.append(event)
            handlers = list(self._subscribers.get(event_type, ())) + list(self._global_subscribers)

        for handler in handlers:
            try:
                handler(event)
            except Exception:  # noqa: BLE001 - a broken subscriber must never break publishing
                logger.exception("event subscriber raised", extra={"fields": {"event_type": event_type.value}})

        return event

    def history(self, limit: int = 200) -> List[Event]:
        with self._lock:
            items = list(self._history)[-limit:]
        return list(reversed(items))


def install_logging_subscriber(bus: EventBus) -> None:
    """Logs every event as a structured log line -- the simplest possible
    observability integration, always on."""

    def handler(event: Event) -> None:
        logger.info(event.type.value, extra={"fields": event.payload})

    bus.subscribe_all(handler)
