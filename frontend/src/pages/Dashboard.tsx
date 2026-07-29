import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Gauge, Play, Workflow as WorkflowIcon, XCircle } from "lucide-react";
import { api } from "../lib/api";
import type { Execution, Workflow } from "../lib/types";
import { Panel, SectionLabel } from "../components/ui/Panel";
import Stat from "../components/ui/Stat";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import { useNewWorkflowDialog } from "../lib/newWorkflowContext";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function ActivityRow({ execution, workflowName }: { execution: Execution; workflowName: string }) {
  const Icon = execution.status === "SUCCESS" ? CheckCircle2 : execution.status === "FAILED" ? XCircle : Play;
  const tone =
    execution.status === "SUCCESS"
      ? "text-status-success dark:text-status-success-dark"
      : execution.status === "FAILED"
        ? "text-status-danger dark:text-status-danger-dark"
        : "text-accent dark:text-accent-dark";
  return (
    <Link
      to={`/executions/${execution.id}`}
      className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-plane dark:border-hairline-dark dark:hover:bg-plane-dark"
    >
      <Icon size={15} className={tone} />
      <span className="min-w-0 flex-1 truncate text-ink dark:text-ink-dark">
        {workflowName} <span className="text-ink-faint dark:text-ink-faint-dark">— {execution.status.toLowerCase()}</span>
      </span>
      <span className="tabular shrink-0 text-xs text-ink-faint dark:text-ink-faint-dark">{formatDuration(execution.duration_ms)}</span>
      <span className="shrink-0 text-xs text-ink-faint dark:text-ink-faint-dark">{relativeTime(execution.started_at)}</span>
    </Link>
  );
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const openNewWorkflow = useNewWorkflowDialog();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([api.listWorkflows(), api.listExecutions(undefined, 50)])
        .then(([w, e]) => {
          if (cancelled) return;
          setWorkflows(w);
          setExecutions(e);
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

  const running = executions.filter((e) => e.status === "RUNNING").length;
  const terminal = executions.filter((e) => e.status === "SUCCESS" || e.status === "FAILED");
  const successRate = terminal.length ? Math.round((terminal.filter((e) => e.status === "SUCCESS").length / terminal.length) * 100) : null;
  const durations = executions.map((e) => e.duration_ms).filter((d): d is number => d !== null);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const failing = executions.filter((e) => e.status === "FAILED").slice(0, 5);
  const recent = executions.slice(0, 8);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-6 w-32 skeleton" />
        <Panel>
          <SkeletonRows rows={4} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            {api.baseUrl} <span className="text-ink-faint dark:text-ink-faint-dark">·</span>{" "}
            {error ? "unreachable" : "connected"}
          </p>
        </div>
        <Button variant="primary" onClick={openNewWorkflow}>
          + New workflow
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {error} Start it with <code className="tabular">python main.py</code>.
        </div>
      )}

      <Panel className="grid grid-cols-2 divide-x divide-hairline md:grid-cols-4 dark:divide-hairline-dark">
        <Stat label="Workflows" value={String(workflows.length)} icon={<WorkflowIcon size={13} />} />
        <Stat
          label="Success rate"
          value={successRate === null ? "—" : `${successRate}%`}
          hint={`${terminal.length} recent runs`}
          tone={successRate !== null && successRate < 80 ? "danger" : undefined}
          icon={<Gauge size={13} />}
        />
        <Stat label="Running now" value={String(running)} tone={running > 0 ? "accent" : undefined} icon={<Play size={13} />} />
        <Stat label="Avg duration" value={avgDuration === null ? "—" : formatDuration(avgDuration)} icon={<Clock size={13} />} />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionLabel className="mb-2">Recent activity</SectionLabel>
          <Panel className="overflow-hidden">
            {recent.length === 0 ? (
              <EmptyState
                icon={Play}
                title="No executions yet"
                description="Run a workflow to see live activity appear here."
                action={
                  <Link to="/workflows" className="text-xs text-accent hover:underline dark:text-accent-dark">
                    Go to workflows →
                  </Link>
                }
              />
            ) : (
              recent.map((e) => <ActivityRow key={e.id} execution={e} workflowName={nameForWorkflow(e.workflow_id)} />)
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <SectionLabel className="mb-2">Needs attention</SectionLabel>
            <Panel className="overflow-hidden">
              {failing.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-4 text-sm text-status-success dark:text-status-success-dark">
                  <CheckCircle2 size={15} />
                  All recent runs succeeded
                </div>
              ) : (
                failing.map((e) => (
                  <Link
                    key={e.id}
                    to={`/executions/${e.id}`}
                    className="flex items-center gap-2 border-b border-hairline px-4 py-2.5 text-sm last:border-0 hover:bg-plane dark:border-hairline-dark dark:hover:bg-plane-dark"
                  >
                    <AlertTriangle size={14} className="shrink-0 text-status-danger dark:text-status-danger-dark" />
                    <span className="min-w-0 flex-1 truncate text-ink dark:text-ink-dark">{nameForWorkflow(e.workflow_id)}</span>
                    <span className="shrink-0 text-xs text-ink-faint dark:text-ink-faint-dark">{relativeTime(e.started_at)}</span>
                  </Link>
                ))
              )}
            </Panel>
          </div>

          <div>
            <SectionLabel className="mb-2">Shortcuts</SectionLabel>
            <Panel>
              <div className="flex items-center gap-2 px-4 py-2.5">
                <span className="text-xs text-ink-muted dark:text-ink-muted-dark">Press</span>
                <kbd>⌘K</kbd>
                <span className="text-xs text-ink-muted dark:text-ink-muted-dark">to jump anywhere</span>
              </div>
              <div className="flex flex-col gap-1 px-2 pb-2">
                <Link to="/builder" className="rounded px-2.5 py-1.5 text-sm text-ink hover:bg-plane dark:text-ink-dark dark:hover:bg-plane-dark">
                  Open the builder
                </Link>
                <Link to="/plugins" className="rounded px-2.5 py-1.5 text-sm text-ink hover:bg-plane dark:text-ink-dark dark:hover:bg-plane-dark">
                  Browse plugins
                </Link>
                <Link to="/settings" className="rounded px-2.5 py-1.5 text-sm text-ink hover:bg-plane dark:text-ink-dark dark:hover:bg-plane-dark">
                  Configure AI provider
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
