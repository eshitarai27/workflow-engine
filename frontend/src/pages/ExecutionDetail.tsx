import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactFlow, { Background, Controls, MarkerType, type Edge as RFEdge, type Node as RFNode } from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Ban, Pause, Play } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Execution, NodeExecutionRecord, Workflow } from "../lib/types";
import { ExecutionStatusBadge, NodeStateBadge } from "../components/ui/Badge";
import ExecutionNode, { type ExecutionNodeData } from "../components/builder/ExecutionNode";
import IconButton from "../components/ui/IconButton";
import { Tabs, TabPanel } from "../components/ui/Tabs";
import EmptyState from "../components/ui/EmptyState";
import Dialog from "../components/ui/Dialog";
import Button from "../components/ui/Button";
import { toast } from "../components/ui/Toaster";

const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);
const nodeTypes = { execution: ExecutionNode };

function buildGraph(workflow: Workflow, execution: Execution): { nodes: RFNode<ExecutionNodeData>[]; edges: RFEdge[] } {
  const positions = (workflow.metadata?.positions as Record<string, { x: number; y: number }>) || {};
  const nodes: RFNode<ExecutionNodeData>[] = workflow.nodes.map((n, i) => ({
    id: n.id,
    type: "execution",
    position: positions[n.id] || { x: (i % 4) * 200, y: Math.floor(i / 4) * 100 },
    data: { label: n.name, state: execution.node_states[n.id] ?? "WAITING" },
  }));
  const edges: RFEdge[] = workflow.edges.map((e) => {
    const sourceState = execution.node_states[e.source];
    const targetState = execution.node_states[e.target];
    const active = sourceState === "SUCCESS" && (targetState === "RUNNING" || targetState === "READY");
    return {
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: active,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: active ? { stroke: "#f0a020", strokeWidth: 2 } : undefined,
    };
  });
  return { nodes, edges };
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ExecutionDetail() {
  const { executionId } = useParams<{ executionId: string }>();
  const [execution, setExecution] = useState<Execution | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [tab, setTab] = useState("attempts");

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
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, execution?.status]);

  useEffect(() => {
    if (!execution || !ACTIVE_STATUSES.has(execution.status)) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [execution]);

  const graph = useMemo(() => (workflow && execution ? buildGraph(workflow, execution) : null), [workflow, execution]);

  const selectedRecords: NodeExecutionRecord[] = useMemo(() => {
    if (!execution || !selectedNodeId) return [];
    return execution.history.filter((r) => r.node_id === selectedNodeId);
  }, [execution, selectedNodeId]);

  const runAction = (action: "pause" | "resume" | "cancel") => {
    if (!executionId) return;
    const call = action === "pause" ? api.pauseExecution : action === "resume" ? api.resumeExecution : api.cancelExecution;
    call(executionId)
      .then(() => toast.success(`Execution ${action === "pause" ? "paused" : action === "resume" ? "resumed" : "cancelled"}`))
      .catch((err) => toast.error(err instanceof ApiError ? err.message : `Failed to ${action}`));
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {error}
        </div>
      </div>
    );
  }
  if (!execution || !workflow || !graph) {
    return <div className="p-6 text-sm text-ink-muted dark:text-ink-muted-dark">Loading…</div>;
  }

  const total = Object.keys(execution.node_states).length;
  const finished = Object.values(execution.node_states).filter((s) => s === "SUCCESS" || s === "FAILED" || s === "SKIPPED" || s === "CANCELLED").length;
  const progressPct = total ? Math.round((finished / total) * 100) : 0;
  const startedAt = execution.started_at ? new Date(execution.started_at).getTime() : null;
  const endedAt = execution.ended_at ? new Date(execution.ended_at).getTime() : now;
  const elapsed = startedAt !== null ? endedAt - startedAt : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-2.5 dark:border-hairline-dark">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/workflows/${workflow.id}`} className="flex shrink-0 items-center gap-1 text-xs text-ink-faint hover:text-ink-muted dark:text-ink-faint-dark dark:hover:text-ink-muted-dark">
            <ArrowLeft size={12} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight text-ink dark:text-ink-dark">{workflow.name}</span>
              <ExecutionStatusBadge status={execution.status} />
            </div>
            <div className="tabular text-xs text-ink-faint dark:text-ink-faint-dark">
              {execution.id} · {formatElapsed(elapsed)} elapsed
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-hairline dark:bg-hairline-dark">
              <div className="h-full rounded-full bg-accent transition-all duration-300 dark:bg-accent-dark" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="tabular text-xs text-ink-faint dark:text-ink-faint-dark">
              {finished}/{total}
            </span>
          </div>
          {execution.status === "RUNNING" && (
            <IconButton label="Pause" onClick={() => runAction("pause")}>
              <Pause size={14} />
            </IconButton>
          )}
          {(execution.status === "PAUSED" || execution.status === "CANCELLED" || execution.status === "FAILED") && (
            <IconButton label="Resume" onClick={() => runAction("resume")}>
              <Play size={14} />
            </IconButton>
          )}
          {ACTIVE_STATUSES.has(execution.status) && (
            <IconButton label="Cancel" variant="danger" onClick={() => setConfirmCancel(true)}>
              <Ban size={14} />
            </IconButton>
          )}
        </div>
      </div>

      {execution.error && (
        <div className="border-b border-status-danger/30 bg-status-danger/10 px-4 py-2 text-xs text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {execution.error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-plane dark:bg-plane-dark">
          <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} onNodeClick={(_, n) => setSelectedNodeId(n.id)} fitView proOptions={{ hideAttribution: true }}>
            <Background gap={20} size={1} className="dark:opacity-40" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <div className="w-96 shrink-0 border-l border-hairline dark:border-hairline-dark">
          {!selectedNodeId ? (
            <div className="p-4">
              <EmptyState title="No node selected" description="Click a node in the graph to inspect its execution record." />
            </div>
          ) : selectedRecords.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Hasn't run yet" description="This node hasn't started executing." />
            </div>
          ) : (
            <Tabs
              value={tab}
              onValueChange={setTab}
              tabs={[
                { value: "attempts", label: "Attempts", count: selectedRecords.length },
                { value: "details", label: "Details" },
              ]}
            >
              <div className="max-h-full overflow-y-auto p-3">
                <TabPanel value="attempts">
                  <div className="flex flex-col gap-3">
                    {selectedRecords.map((r, i) => (
                      <div key={i} className="rounded-md border border-hairline p-3 text-xs dark:border-hairline-dark">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="tabular text-ink-faint dark:text-ink-faint-dark">
                            attempt {r.attempt} · iteration {r.iteration}
                          </span>
                          <NodeStateBadge state={r.state} />
                        </div>
                        <div className="mb-1 text-ink-muted dark:text-ink-muted-dark">{r.reason || "—"}</div>
                        {r.duration_ms !== null && (
                          <div className="tabular mb-1">
                            <span className="text-ink-muted dark:text-ink-muted-dark">Duration: </span>
                            {r.duration_ms.toFixed(2)} ms · worker {r.worker_id ?? "—"}
                          </div>
                        )}
                        {r.failure_reason && <div className="text-status-danger dark:text-status-danger-dark">{r.failure_reason}</div>}
                        {r.output_snapshot !== null && r.output_snapshot !== undefined && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-ink-muted dark:text-ink-muted-dark">Output</summary>
                            <pre className="tabular mt-1 overflow-x-auto rounded bg-plane p-2 dark:bg-plane-dark">{JSON.stringify(r.output_snapshot, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </TabPanel>
                <TabPanel value="details">
                  <div className="flex flex-col gap-2 text-xs">
                    {selectedRecords[selectedRecords.length - 1].dependencies.length > 0 && (
                      <div>
                        <span className="text-ink-muted dark:text-ink-muted-dark">Depends on: </span>
                        {selectedRecords[selectedRecords.length - 1].dependencies.join(", ")}
                      </div>
                    )}
                    {selectedRecords[selectedRecords.length - 1].condition_expression && (
                      <div>
                        <span className="text-ink-muted dark:text-ink-muted-dark">Condition: </span>
                        <code>{selectedRecords[selectedRecords.length - 1].condition_expression}</code> →{" "}
                        {String(selectedRecords[selectedRecords.length - 1].condition_result)}
                      </div>
                    )}
                    {selectedRecords[selectedRecords.length - 1].input_snapshot && (
                      <details>
                        <summary className="cursor-pointer text-ink-muted dark:text-ink-muted-dark">Input snapshot</summary>
                        <pre className="tabular mt-1 overflow-x-auto rounded bg-plane p-2 dark:bg-plane-dark">
                          {JSON.stringify(selectedRecords[selectedRecords.length - 1].input_snapshot, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </TabPanel>
              </div>
            </Tabs>
          )}
        </div>
      </div>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Cancel execution" description="Remaining nodes won't run. Completed work is preserved." width="400px">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            Keep running
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmCancel(false);
              runAction("cancel");
            }}
          >
            Cancel execution
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
