"""The DAG execution engine: runs an ExecutionPlan layer by layer, with
every node in a layer dispatched to the worker pool concurrently.

A layer is only ever started once every previous layer has fully finished
(succeeded, failed, or been skipped), because the planner guarantees a
node's dependencies all live in earlier layers -- that barrier is what
keeps the implementation simple while still giving real parallelism
within a layer.
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from src.compiler.ir import IRGraph
from src.engine.checkpoint import CheckpointStore
from src.events.event_bus import EventBus
from src.executor.executor import NodeExecutor
from src.models.enums import EventType, ExecutionStatus, NodeState
from src.models.execution import Execution, NodeExecutionRecord
from src.models.workflow import Workflow
from src.planner.planner import ExecutionPlan
from src.plugins.registry import PluginRegistry
from src.utils.safe_eval import evaluate_condition
from src.workers.worker_pool import WorkerPool


class ExecutionEngine:
    def __init__(
        self,
        plugin_registry: PluginRegistry,
        event_bus: EventBus,
        worker_pool: WorkerPool,
        checkpoint_store: CheckpointStore,
    ) -> None:
        self.plugin_registry = plugin_registry
        self.event_bus = event_bus
        self.worker_pool = worker_pool
        self.checkpoint_store = checkpoint_store
        self.node_executor = NodeExecutor(plugin_registry, event_bus)
        self._cancel_events: Dict[str, threading.Event] = {}
        self._stop_status: Dict[str, ExecutionStatus] = {}
        self._lock = threading.Lock()

    def cancel(self, execution_id: str) -> bool:
        """Requests cancellation. The engine checks this cooperatively
        between layers and between retry attempts -- it does not
        forcibly interrupt a node that's already mid-execution."""
        return self._request_stop(execution_id, ExecutionStatus.CANCELLED)

    def pause(self, execution_id: str) -> bool:
        """Requests a pause: stops after the current layer finishes, exactly
        like :meth:`cancel`, but the run ends in PAUSED rather than
        CANCELLED. Either way a checkpoint is written, so
        ``run(..., resume=True)`` continues it later."""
        return self._request_stop(execution_id, ExecutionStatus.PAUSED)

    def _request_stop(self, execution_id: str, status: ExecutionStatus) -> bool:
        with self._lock:
            event = self._cancel_events.get(execution_id)
            if event is None:
                return False
            self._stop_status[execution_id] = status
        event.set()
        return True

    def run(
        self,
        workflow: Workflow,
        graph: IRGraph,
        plan: ExecutionPlan,
        execution: Execution,
        resume: bool = False,
    ) -> Execution:
        cancel_event = threading.Event()
        with self._lock:
            self._cancel_events[execution.id] = cancel_event

        start_layer_index = self._initialize_or_resume(execution, graph, resume)

        try:
            for layer_index in range(start_layer_index, len(plan.layers)):
                if cancel_event.is_set():
                    self._mark_remaining_cancelled(execution, plan, layer_index)
                    break

                self._run_layer(graph, execution, plan.layers[layer_index], cancel_event)
                self._save_checkpoint(execution, layer_index + 1)
                self.event_bus.publish(
                    EventType.CHECKPOINT_CREATED,
                    {"execution_id": execution.id, "completed_layers": layer_index + 1},
                )

            self._finalize(execution, cancel_event)
        finally:
            with self._lock:
                self._cancel_events.pop(execution.id, None)

        return execution

    # -- setup / resume ---------------------------------------------------------
    def _initialize_or_resume(self, execution: Execution, graph: IRGraph, resume: bool) -> int:
        checkpoint = self.checkpoint_store.load(execution.id) if resume else None

        if checkpoint:
            execution.node_states = {k: NodeState(v) for k, v in checkpoint["node_states"].items()}
            execution.context.update(checkpoint.get("context", {}))
            execution.status = ExecutionStatus.RUNNING
            self.event_bus.publish(EventType.WORKFLOW_RESUMED, {"execution_id": execution.id})
            return int(checkpoint.get("completed_layers", 0))

        for node_id in graph.node_ids:
            execution.node_states[node_id] = NodeState.WAITING
        execution.mark_started()
        self.event_bus.publish(
            EventType.WORKFLOW_STARTED,
            {"execution_id": execution.id, "workflow_id": execution.workflow_id},
        )
        return 0

    # -- per-layer execution ------------------------------------------------------
    def _run_layer(
        self,
        graph: IRGraph,
        execution: Execution,
        layer: List[str],
        cancel_event: threading.Event,
    ) -> None:
        futures = {}
        for node_id in layer:
            if execution.node_states.get(node_id, NodeState.WAITING).is_terminal:
                continue  # already handled by a prior checkpoint on resume

            node = graph.nodes[node_id].node
            dependencies = sorted(graph.nodes[node_id].depends_on)
            state, reason, condition_result = self._determine_readiness(graph, execution, node_id)

            if state == NodeState.SKIPPED:
                execution.node_states[node_id] = NodeState.SKIPPED
                execution.history.add(
                    NodeExecutionRecord(
                        node_id=node_id,
                        node_name=node.name,
                        state=NodeState.SKIPPED,
                        dependencies=dependencies,
                        reason=reason,
                        condition_expression=node.condition.expression if node.condition else None,
                        condition_result=condition_result,
                        started_at=datetime.now(timezone.utc),
                        ended_at=datetime.now(timezone.utc),
                    )
                )
                self.event_bus.publish(EventType.NODE_SKIPPED, {"node_id": node_id, "reason": reason})
                continue

            execution.node_states[node_id] = NodeState.RUNNING
            futures[node_id] = self.worker_pool.submit(
                self.node_executor.execute_node, node, execution.context, dependencies, cancel_event
            )

        for node_id, future in futures.items():
            final_state, records, _output = future.result()
            for record in records:
                execution.history.add(record)
            execution.node_states[node_id] = final_state

    def _determine_readiness(
        self, graph: IRGraph, execution: Execution, node_id: str
    ) -> Tuple[NodeState, str, "bool | None"]:
        node = graph.nodes[node_id].node
        deps = graph.nodes[node_id].depends_on

        for dep in sorted(deps):
            dep_state = execution.node_states.get(dep)
            if dep_state in (NodeState.FAILED, NodeState.SKIPPED, NodeState.CANCELLED):
                return NodeState.SKIPPED, f"dependency '{dep}' did not succeed (state: {dep_state.value})", None

        if node.condition:
            try:
                result = evaluate_condition(node.condition.expression, execution.context.as_eval_namespace())
            except Exception as exc:  # noqa: BLE001 - a bad condition skips the node, doesn't crash the run
                return NodeState.SKIPPED, f"condition evaluation error: {exc}", None
            if not result:
                return NodeState.SKIPPED, f"condition '{node.condition.expression}' evaluated false", False
            return NodeState.READY, "condition evaluated true", True

        return NodeState.READY, "all dependencies satisfied" if deps else "root node, no dependencies", None

    # -- cancellation / finalization ----------------------------------------------
    def _mark_remaining_cancelled(self, execution: Execution, plan: ExecutionPlan, from_layer_index: int) -> None:
        for layer in plan.layers[from_layer_index:]:
            for node_id in layer:
                if not execution.node_states.get(node_id, NodeState.WAITING).is_terminal:
                    execution.node_states[node_id] = NodeState.CANCELLED

    def _finalize(self, execution: Execution, cancel_event: threading.Event) -> None:
        if cancel_event.is_set():
            stop_status = self._stop_status.pop(execution.id, ExecutionStatus.CANCELLED)
            execution.mark_finished(stop_status)
            event_type = (
                EventType.WORKFLOW_PAUSED if stop_status == ExecutionStatus.PAUSED else EventType.WORKFLOW_CANCELLED
            )
            self.event_bus.publish(event_type, {"execution_id": execution.id})
        elif any(state == NodeState.FAILED for state in execution.node_states.values()):
            execution.mark_finished(ExecutionStatus.FAILED, error="one or more nodes failed")
            self.event_bus.publish(EventType.WORKFLOW_FAILED, {"execution_id": execution.id})
        else:
            execution.mark_finished(ExecutionStatus.SUCCESS)
            self.checkpoint_store.delete(execution.id)
            self.event_bus.publish(EventType.WORKFLOW_COMPLETED, {"execution_id": execution.id})

    def _save_checkpoint(self, execution: Execution, completed_layers: int) -> None:
        self.checkpoint_store.save(
            execution.id,
            {
                "node_states": {k: v.value for k, v in execution.node_states.items()},
                "context": execution.context.snapshot(),
                "completed_layers": completed_layers,
            },
        )
