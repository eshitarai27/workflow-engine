"""A thread-safe FIFO queue of pending execution requests, regardless of
where they came from (a schedule, a webhook, another workflow's event)."""
from __future__ import annotations

import queue
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class ExecutionRequest:
    workflow_id: str
    version: Optional[int] = None
    initial_context: Dict[str, Any] = field(default_factory=dict)
    triggered_by: str = "scheduler"


class ExecutionQueue:
    def __init__(self) -> None:
        self._queue: "queue.Queue[ExecutionRequest]" = queue.Queue()

    def enqueue(self, request: ExecutionRequest) -> None:
        self._queue.put(request)

    def dequeue(self, timeout: Optional[float] = None) -> Optional[ExecutionRequest]:
        try:
            return self._queue.get(timeout=timeout)
        except queue.Empty:
            return None

    def qsize(self) -> int:
        return self._queue.qsize()
