import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { Execution, Workflow, WorkflowVersionSummary } from "../lib/types";
import { ExecutionStatusBadge } from "../components/StatusBadge";

export default function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [versions, setVersions] = useState<WorkflowVersionSummary[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const load = () => {
    if (!workflowId) return;
    Promise.all([api.getWorkflow(workflowId), api.listVersions(workflowId), api.listExecutions(workflowId, 20)])
      .then(([w, v, e]) => {
        setWorkflow(w);
        setVersions(v);
        setExecutions(e);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load workflow"));
  };

  useEffect(load, [workflowId]);

  const runNow = () => {
    if (!workflowId) return;
    setExecuting(true);
    api
      .executeWorkflow(workflowId)
      .then((execution) => navigate(`/executions/${execution.id}`))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to start execution"))
      .finally(() => setExecuting(false));
  };

  const deleteWorkflow = () => {
    if (!workflowId || !window.confirm(`Delete workflow "${workflow?.name}"? This removes every version.`)) return;
    api.deleteWorkflow(workflowId).then(() => navigate("/workflows"));
  };

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }
  if (!workflow) {
    return <div className="text-sm text-ink-muted dark:text-ink-muted-dark">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{workflow.name}</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            {workflow.description || "No description"} · v{workflow.version} · {workflow.id}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runNow}
            disabled={executing}
            className="rounded-md bg-forge-1 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {executing ? "Starting…" : "▶ Run now"}
          </button>
          <Link
            to={`/workflows/${workflow.id}/simulate`}
            className="rounded-md border border-hairline dark:border-hairline-dark px-3 py-1.5 text-xs hover:border-baseline dark:hover:border-baseline-dark"
          >
            Simulate
          </Link>
          <Link
            to={`/builder/${workflow.id}`}
            className="rounded-md border border-hairline dark:border-hairline-dark px-3 py-1.5 text-xs hover:border-baseline dark:hover:border-baseline-dark"
          >
            Edit
          </Link>
          <button
            onClick={deleteWorkflow}
            className="rounded-md border border-status-critical/30 px-3 py-1.5 text-xs text-status-critical hover:bg-status-critical/10"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5">
          <div className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">
            Nodes ({workflow.nodes.length})
          </div>
          <div className="flex flex-col gap-2">
            {workflow.nodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between rounded border border-hairline dark:border-hairline-dark px-3 py-2 text-sm">
                <span>{node.name}</span>
                <span className="tabular text-xs text-ink-faint">{node.action.plugin_id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5">
          <div className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Versions</div>
          <div className="flex flex-col gap-2">
            {versions.map((v) => (
              <div key={v.version} className="flex items-center justify-between text-sm">
                <span className="tabular">v{v.version}</span>
                <span className="text-xs text-ink-faint">{new Date(v.created_at).toLocaleString()}</span>
                {v.is_latest ? <span className="text-xs text-status-good">latest</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Executions</h2>
        <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline dark:border-hairline-dark text-left text-xs text-ink-muted dark:text-ink-muted-dark">
                <th className="px-4 py-2.5 font-normal">Status</th>
                <th className="px-4 py-2.5 font-normal">Triggered by</th>
                <th className="px-4 py-2.5 font-normal">Started</th>
                <th className="px-4 py-2.5 font-normal">Execution</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-ink-faint">
                    No executions yet.
                  </td>
                </tr>
              )}
              {executions.map((e) => (
                <tr key={e.id} className="border-b border-hairline dark:border-hairline-dark last:border-0 hover:bg-plane dark:hover:bg-plane-dark">
                  <td className="px-4 py-2.5">
                    <ExecutionStatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-faint">{e.triggered_by}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-faint">
                    {e.started_at ? new Date(e.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link to={`/executions/${e.id}`} className="tabular text-xs text-forge-1 hover:underline">
                      {e.id.slice(0, 14)}…
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
