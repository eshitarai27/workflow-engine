"""Tests for the internal pub/sub event bus."""
from __future__ import annotations

from src.events.event_bus import EventBus
from src.models.enums import EventType


def test_subscriber_receives_only_its_event_type():
    bus = EventBus()
    received = []
    bus.subscribe(EventType.NODE_STARTED, lambda e: received.append(e))

    bus.publish(EventType.NODE_STARTED, {"node_id": "a"})
    bus.publish(EventType.NODE_COMPLETED, {"node_id": "a"})

    assert len(received) == 1
    assert received[0].payload == {"node_id": "a"}


def test_global_subscriber_receives_every_event_type():
    bus = EventBus()
    received = []
    bus.subscribe_all(lambda e: received.append(e.type))

    bus.publish(EventType.WORKFLOW_STARTED, {})
    bus.publish(EventType.NODE_STARTED, {})

    assert received == [EventType.WORKFLOW_STARTED, EventType.NODE_STARTED]


def test_a_broken_subscriber_does_not_break_others():
    bus = EventBus()
    received = []

    def broken_handler(event):
        raise RuntimeError("boom")

    bus.subscribe(EventType.NODE_STARTED, broken_handler)
    bus.subscribe(EventType.NODE_STARTED, lambda e: received.append(e))

    bus.publish(EventType.NODE_STARTED, {})
    assert len(received) == 1


def test_history_returns_most_recent_first_and_respects_limit():
    bus = EventBus()
    for i in range(5):
        bus.publish(EventType.NODE_STARTED, {"i": i})

    recent = bus.history(limit=3)
    assert [e.payload["i"] for e in recent] == [4, 3, 2]
