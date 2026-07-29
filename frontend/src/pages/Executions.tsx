import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListTree } from "lucide-react";
import { api } from "../lib/api";
import type { Execution, ExecutionStatus, Workflow } from "../lib/types";
import { ExecutionStatusBadge } from "../components/ui/Badge";
import { colorForNodeState } from "../lib/colors";
import EmptyState from "../components/ui/EmptyState";
import HoverCard from "../components/ui/HoverCard";
import { Table, THead, Th, Tr, Td } from "../components/ui/Table";
import { Select } from "../components/ui/Input";
import { SkeletonRows } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

const STATUSES: ExecutionStatus[] = ["PENDING", "RUNNING", "PAUSED", "SUCCESS", "FAILED", "CANCELLED"];

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function NodeStatePreview({ execution }: { execution: Execution }) {
  const entries = Object.entries(execution.node_states);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium text-ink dark:text-ink-dark">Node states</div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([nodeId, state]) => (
          <span
            key={nodeId}
            className="flex items-center gap-1 rounded bg-plane px-1.5 py-0.5 text-[11px] text-ink-muted dark:bg-plane-dark dark:text-ink-muted-dark"
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorForNodeState(state) }} />
            {nodeId}
          </span>
        ))}
      </div>
      {execution.error && <div className="text-xs text-status-danger dark:text-status-danger-dark">{execution.error}</div>}
    </div>
  );
}

export default function Executions() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | "ALL">("ALL");
  const [workflowFilter, setWorkflowFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([api.listExecutions(undefined, 150), api.listWorkflows()])
        .then(([e, w]) => {
          if (cancelled) return;
          setExecutions(e);
          setWorkflows(w);
          setError(null);
        })
        .catch(() => !cancelled && setError("Could not reach the FlowForge API."))
        .finally(() => !cancelled && setLoading(false));
    };
    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const nameForWorkflow = useMemo(() => {
    const map = new Map(workflows.map((w) => [w.id, w.name]));
    return (id: string) => map.get(id) ?? id;
  }, [workflows]);

  const filtered = executions.filter(
    (e) => (statusFilter === "ALL" || e.status === statusFilter) && (workflowFilter === "ALL" || e.workflow_id === workflowFilter)
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Executions</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">Every run, across every workflow, most recent first.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="w-44">
            <option value="ALL">All workflows</option>
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ExecutionStatus | "ALL")} className="w-36">
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-hairline dark:border-hairline-dark">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ListTree} title="No executions match these filters" description="Run a workflow to see it show up here in real time." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th className="w-[24%]">Workflow</Th>
                <Th className="w-[14%]">Status</Th>
                <Th className="w-[12%]">Duration</Th>
                <Th className="w-[14%]">Triggered by</Th>
                <Th className="w-[18%]">Started</Th>
                <Th className="w-[18%]">Execution</Th>
              </tr>
            </THead>
            <tbody>
              {filtered.map((e) => (
                <Tr key={e.id}>
                  <Td className="truncate">
                    <Link to={`/workflows/${e.workflow_id}`} className="text-ink hover:text-accent dark:text-ink-dark dark:hover:text-accent-dark">
                      {nameForWorkflow(e.workflow_id)}
                    </Link>
                  </Td>
                  <Td>
                    <HoverCard trigger={<span className={cn("inline-block cursor-default")}> <ExecutionStatusBadge status={e.status} /> </span>} width="260px">
                      <NodeStatePreview execution={e} />
                    </HoverCard>
                  </Td>
                  <Td className="tabular text-ink-muted dark:text-ink-muted-dark">{formatDuration(e.duration_ms)}</Td>
                  <Td className="text-ink-faint dark:text-ink-faint-dark">{e.triggered_by}</Td>
                  <Td className="text-xs text-ink-faint dark:text-ink-faint-dark">
                    {e.started_at ? new Date(e.started_at).toLocaleString() : "—"}
                  </Td>
                  <Td>
                    <Link to={`/executions/${e.id}`} className="tabular text-xs text-accent hover:underline dark:text-accent-dark">
                      {e.id.slice(0, 14)}…
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
