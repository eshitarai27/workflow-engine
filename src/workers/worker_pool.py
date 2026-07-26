"""A small pool of workers that actually run node actions.

This is deliberately a thin wrapper around
:class:`concurrent.futures.ThreadPoolExecutor` rather than a bespoke
scheduler: node actions here are I/O-bound (HTTP calls, subprocess calls,
file access) far more often than CPU-bound, so a thread pool is the right
tool, and wrapping it keeps "which worker ran this node" visible to the
execution history without leaking thread-pool details into the engine.
"""
from __future__ import annotations

import threading
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")

_thread_local = threading.local()


def current_worker_id() -> str:
    """The id of the worker thread executing the calling code, if any."""
    return getattr(_thread_local, "worker_id", "main")


class WorkerPool:
    """Executes node actions concurrently across a bounded set of workers."""

    def __init__(self, max_workers: int = 8, name_prefix: str = "worker") -> None:
        self.max_workers = max_workers
        self._name_prefix = name_prefix
        self._executor = ThreadPoolExecutor(
            max_workers=max_workers,
            thread_name_prefix=name_prefix,
            initializer=self._init_worker,
        )
        self._counter = 0
        self._counter_lock = threading.Lock()

    def _init_worker(self) -> None:
        with self._counter_lock:
            self._counter += 1
            worker_id = f"{self._name_prefix}-{self._counter}"
        _thread_local.worker_id = worker_id

    def submit(self, fn: Callable[..., T], *args, **kwargs) -> "Future[T]":
        return self._executor.submit(fn, *args, **kwargs)

    def shutdown(self, wait: bool = True) -> None:
        self._executor.shutdown(wait=wait, cancel_futures=not wait)
