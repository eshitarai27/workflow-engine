import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactFlow, { Background, Controls, MarkerType, type Edge as RFEdge, type Node as RFNode } from "reactflow";
import "reactflow/dist/style.css";
import { api, ApiError } from "../lib/api";
import type { Execution, NodeExecutionRecord, Workflow } from "../lib/types";
import { colorForNodeState } from "../lib/colors";
import { ExecutionStatusBadge, NodeStateBadge } from "../components/StatusBadge";

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);

function buildGraph(workflow: Workflow, execution: Execution): { nodes: RFNode[]; edges: RFEdge[] } {
  const positions = (workflow.metadata?.positions as Record<string, { x: number; y: number }>) || {};
  const nodes: RFNode[] = workflow.nodes.map((n, i) => {
    const state = execution.node_states[n.id] ?? "WAITING";
    const color = colorForNodeState(state);
    return {
      id: n.id,
      position: positions[n.id] || { x: (i % 4) * 200, y: Math.floor(i / 4) * 110 },
      data: { label: `${n.name}\n${state}` },
      style: {
        background: color,
        color: "white",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 10,
        width: 150,
        fontSize: 12,
        whiteSpace: "pre-line",
        textAlign: "center",
        padding: 6,
      },
    };
  });
  const edges: RFEdge[] = workflow.edges.map((e) => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#8f827088" },
  }));
  return { nodes, edges };
}

export default function ExecutionDetail() {
  const { executionId } = useParams<{ executionId: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!executionId) return;
    let cancelled = false;

    const load = () => {
      api
        .getExecution(executionId)
        .then((exec) => {
          if (cancelled) return;
          setExecution(exec);
          return api.getWorkflow(exec.workflow_id, exec.workflow_version).then((wf) => !cancelled && setWorkflow(wf));
        })
        .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Failed to load execution"));
    };

    load();
    const interval = setInterval(() => {
      if (execution && !ACTIVE_STATUSES.has(execution.status)) return;
      load();
    }, 1200);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, execution?.status]);

  const graph = useMemo(() => (workflow && execution ? buildGraph(workflow, execution) : null), [workflow, execution]);

  const selectedRecords: NodeExecutionRecord[] = useMemo(() => {
    if (!execution || !selectedNodeId) return [];
    return execution.history.filter((r) => r.node_id === selectedNodeId);
  }, [execution, selectedNodeId]);

  const runAction = (action: "pause" | "resume" | "cancel") => {
    if (!executionId) return;
    setActionError(null);
    const call = action === "pause" ? api.pauseExecution : action === "resume" ? api.resumeExecution : api.cancelExecution;
    call(executionId).catch((err) => setActionError(err instanceof ApiError ? err.message : `Failed to ${action}`));
  };

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }
  if (!execution || !workflow || !graph) {
    return <div className="text-sm text-ink-muted dark:text-ink-muted-dark">Loading…</div>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Execution</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted dark:text-ink-muted-dark">
            <Link to={`/workflows/${workflow.id}`} className="text-forge-1 hover:underline">
              {workflow.name}
            </Link>
            <span className="tabular text-xs">{execution.id}</span>
            <ExecutionStatusBadge status={execution.status} />
          </p>
        </div>
        <div className="flex gap-2">
          {execution.status === "RUNNING" && (
            <button onClick={() => runAction("pause")} className="rounded-md border border-hairline dark:border-hairline-dark px-3 py-1.5 text-xs hover:border-baseline dark:hover:border-baseline-dark">
              ⏸ Pause
            </button>
          )}
          {(execution.status === "PAUSED" || execution.status === "CANCELLED" || execution.status === "FAILED") && (
            <button onClick={() => runAction("resume")} className="rounded-md border border-hairline dark:border-hairline-dark px-3 py-1.5 text-xs hover:border-baseline dark:hover:border-baseline-dark">
              ▶ Resume
            </button>
          )}
          {ACTIVE_STATUSES.has(execution.status) && (
            <button onClick={() => runAction("cancel")} className="rounded-md border border-status-critical/30 px-3 py-1.5 text-xs text-status-critical hover:bg-status-critical/10">
              ✕ Cancel
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="text-xs text-status-critical">{actionError}</div>}
      {execution.error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-2 text-xs text-status-critical">
          {execution.error}
        </div>
      )}

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-1 overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
          <ReactFlow nodes={graph.nodes} edges={graph.edges} onNodeClick={(_, n) => setSelectedNodeId(n.id)} fitView proOptions={{ hideAttribution: true }}>
            <Background gap={24} color="#8f827033" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <div className="w-96 shrink-0 overflow-y-auto rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-4">
          <div className="mb-3 text-xs font-medium text-ink-muted dark:text-ink-muted-dark">
            Node Inspector {selectedNodeId ? `— ${selectedNodeId}` : ""}
          </div>
          {!selectedNodeId ? (
            <div className="text-xs text-ink-faint">Click a node in the graph to inspect its execution record.</div>
          ) : selectedRecords.length === 0 ? (
            <div className="text-xs text-ink-faint">This node hasn't run yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedRecords.map((r, i) => (
                <div key={i} className="rounded border border-hairline dark:border-hairline-dark p-3 text-xs">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="tabular text-ink-faint">
                      attempt {r.attempt} · iteration {r.iteration}
                    </span>
                    <NodeStateBadge state={r.state} />
                  </div>
                  <div className="mb-1">
                    <span className="text-ink-muted dark:text-ink-muted-dark">Reason: </span>
                    {r.reason || "—"}
                  </div>
                  {r.condition_expression && (
                    <div className="mb-1">
                      <span className="text-ink-muted dark:text-ink-muted-dark">Condition: </span>
                      <code>{r.condition_expression}</code> → {String(r.condition_result)}
                    </div>
                  )}
                  {r.dependencies.length > 0 && (
                    <div className="mb-1">
                      <span className="text-ink-muted dark:text-ink-muted-dark">Depends on: </span>
                      {r.dependencies.join(", ")}
                    </div>
                  )}
                  {r.duration_ms !== null && (
                    <div className="mb-1 tabular">
                      <span className="text-ink-muted dark:text-ink-muted-dark">Duration: </span>
                      {r.duration_ms.toFixed(2)} ms · worker {r.worker_id ?? "—"}
                    </div>
                  )}
                  {r.failure_reason && (
                    <div className="mb-1 text-status-critical">Failure: {r.failure_reason}</div>
                  )}
                  {r.output_snapshot !== null && r.output_snapshot !== undefined && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-ink-muted dark:text-ink-muted-dark">Output</summary>
                      <pre className="tabular mt-1 overflow-x-auto rounded bg-plane dark:bg-plane-dark p-2">
                        {JSON.stringify(r.output_snapshot, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
