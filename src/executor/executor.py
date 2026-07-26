"""Executes a single node: retry policy, timeout enforcement, and bounded
looping, all producing fully explainable :class:`NodeExecutionRecord`
entries.

Deliberately separate from the engine: the engine decides *which* nodes are
ready to run and orchestrates the DAG; this module only knows how to run
*one* node correctly once it's been told to.
"""
from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from datetime import datetime, timezone
from typing import Any, List, Tuple

from src.models.enums import EventType, NodeState
from src.models.execution import ExecutionContext, NodeExecutionRecord
from src.models.workflow import Node
from src.plugins.base import Plugin, PluginConfigError, PluginExecutionError
from src.plugins.registry import PluginRegistry
from src.utils.safe_eval import evaluate_condition
from src.utils.templating import render_config
from src.workers.worker_pool import current_worker_id

# A soft timeout: the call is bounded from the caller's point of view, but
# CPython cannot safely force-kill a running thread, so a plugin that
# ignores its input and blocks forever will still occupy a background
# thread after this raises. This mirrors the same limitation nearly every
# pure-Python task runner has; the alternative (a subprocess per node) was
# judged too heavy for the common case and is left as a future option for
# plugins that need hard isolation (see docs/architecture.md).
_timeout_pool = ThreadPoolExecutor(max_workers=32, thread_name_prefix="timeout-guard")


class NodeTimeoutError(Exception):
    pass


def _run_with_timeout(plugin: Plugin, config: dict, context: ExecutionContext, timeout: float) -> Any:
    future = _timeout_pool.submit(plugin.execute, config, context)
    try:
        return future.result(timeout=timeout)
    except FutureTimeoutError as exc:
        raise NodeTimeoutError(f"Node execution exceeded {timeout}s timeout") from exc


class NodeExecutor:
    def __init__(self, plugin_registry: PluginRegistry, event_bus) -> None:
        self.plugin_registry = plugin_registry
        self.event_bus = event_bus

    def execute_node(
        self,
        node: Node,
        context: ExecutionContext,
        dependencies: List[str],
        cancel_event: threading.Event,
    ) -> Tuple[NodeState, List[NodeExecutionRecord], Any]:
        """Runs ``node`` to completion, including retries and looping.
        Returns the node's final state, every record produced along the
        way (one per attempt/iteration), and its final output."""
        records: List[NodeExecutionRecord] = []
        final_output: Any = None
        iteration = 1
        max_iterations = node.loop.max_iterations if node.loop else 1

        while True:
            if cancel_event.is_set():
                records.append(self._cancelled_record(node, dependencies, iteration))
                return NodeState.CANCELLED, records, final_output

            state, attempt_records, output = self._execute_with_retry(
                node, context, dependencies, cancel_event, iteration
            )
            records.extend(attempt_records)

            if state in (NodeState.FAILED, NodeState.CANCELLED):
                return state, records, final_output

            final_output = output
            context.set_node_output(node.id, output)

            if not node.loop:
                return NodeState.SUCCESS, records, final_output

            try:
                satisfied = evaluate_condition(node.loop.until_condition, context.as_eval_namespace())
            except Exception as exc:  # noqa: BLE001 - a bad loop expression fails the node, not the process
                records.append(self._failed_record(node, dependencies, iteration, f"loop condition error: {exc}"))
                return NodeState.FAILED, records, final_output

            if satisfied or iteration >= max_iterations:
                return NodeState.SUCCESS, records, final_output
            iteration += 1

    def _execute_with_retry(
        self,
        node: Node,
        context: ExecutionContext,
        dependencies: List[str],
        cancel_event: threading.Event,
        iteration: int,
    ) -> Tuple[NodeState, List[NodeExecutionRecord], Any]:
        plugin = self.plugin_registry.get(node.action.plugin_id)
        records: List[NodeExecutionRecord] = []
        max_attempts = node.retry_policy.max_retries + 1
        attempt = 0

        while True:
            attempt += 1
            if cancel_event.is_set():
                records.append(self._cancelled_record(node, dependencies, iteration, attempt))
                return NodeState.CANCELLED, records, None

            started_at = datetime.now(timezone.utc)
            record = NodeExecutionRecord(
                node_id=node.id,
                node_name=node.name,
                state=NodeState.RUNNING,
                dependencies=dependencies,
                reason="all dependencies satisfied" if dependencies else "root node, no dependencies",
                attempt=attempt,
                retry_count=attempt - 1,
                iteration=iteration,
                worker_id=current_worker_id(),
                started_at=started_at,
                input_snapshot=context.snapshot(),
            )

            self.event_bus.publish(
                EventType.NODE_STARTED,
                {"node_id": node.id, "attempt": attempt, "iteration": iteration},
            )

            try:
                config = self._validate_config(plugin, node, context)
                if node.timeout_seconds:
                    output = _run_with_timeout(plugin, config, context, node.timeout_seconds)
                else:
                    output = plugin.execute(config, context)
            except (PluginConfigError, PluginExecutionError, NodeTimeoutError) as exc:
                record.state = NodeState.FAILED
                record.failure_reason = str(exc)
                record.ended_at = datetime.now(timezone.utc)
                record.duration_ms = (record.ended_at - started_at).total_seconds() * 1000
                records.append(record)
                self.event_bus.publish(
                    EventType.NODE_FAILED,
                    {"node_id": node.id, "attempt": attempt, "reason": str(exc)},
                )

                if attempt < max_attempts:
                    delay = node.retry_policy.delay_for_attempt(attempt)
                    self.event_bus.publish(
                        EventType.RETRY_STARTED,
                        {"node_id": node.id, "next_attempt": attempt + 1, "delay_seconds": delay},
                    )
                    time.sleep(delay)
                    continue
                return NodeState.FAILED, records, None

            record.state = NodeState.SUCCESS
            record.ended_at = datetime.now(timezone.utc)
            record.duration_ms = (record.ended_at - started_at).total_seconds() * 1000
            record.output_snapshot = output
            records.append(record)
            self.event_bus.publish(
                EventType.NODE_COMPLETED,
                {"node_id": node.id, "attempt": attempt, "duration_ms": record.duration_ms},
            )
            return NodeState.SUCCESS, records, output

    @staticmethod
    def _validate_config(plugin: Plugin, node: Node, context: ExecutionContext) -> dict:
        rendered = render_config(node.action.config, context.as_eval_namespace())
        errors = plugin.validate(rendered)
        if errors:
            raise PluginConfigError("; ".join(errors))
        return rendered

    @staticmethod
    def _cancelled_record(node: Node, dependencies: List[str], iteration: int, attempt: int = 1) -> NodeExecutionRecord:
        now = datetime.now(timezone.utc)
        return NodeExecutionRecord(
            node_id=node.id,
            node_name=node.name,
            state=NodeState.CANCELLED,
            dependencies=dependencies,
            reason="execution was cancelled",
            attempt=attempt,
            iteration=iteration,
            started_at=now,
            ended_at=now,
            duration_ms=0.0,
        )

    @staticmethod
    def _failed_record(node: Node, dependencies: List[str], iteration: int, reason: str) -> NodeExecutionRecord:
        now = datetime.now(timezone.utc)
        return NodeExecutionRecord(
            node_id=node.id,
            node_name=node.name,
            state=NodeState.FAILED,
            dependencies=dependencies,
            reason=reason,
            iteration=iteration,
            started_at=now,
            ended_at=now,
            duration_ms=0.0,
            failure_reason=reason,
        )
