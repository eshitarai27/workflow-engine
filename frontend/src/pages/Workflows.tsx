import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Workflow } from "../lib/types";

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listWorkflows()
      .then(setWorkflows)
      .catch(() => setError("Could not reach the FlowForge API."));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            Every workflow shown here is the latest saved version.
          </p>
        </div>
        <Link
          to="/builder"
          className="rounded-md bg-forge-1 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          + New workflow
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {workflows.length === 0 && !error && (
          <div className="col-span-2 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-4 py-8 text-center text-ink-faint">
            No workflows yet. <Link to="/builder" className="text-forge-1 hover:underline">Build one →</Link>
          </div>
        )}
        {workflows.map((wf) => (
          <Link
            key={wf.id}
            to={`/workflows/${wf.id}`}
            className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5 hover:border-baseline dark:hover:border-baseline-dark"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{wf.name}</div>
              <span className="tabular text-xs text-ink-faint">v{wf.version}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-ink-muted dark:text-ink-muted-dark">
              {wf.description || "No description"}
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-faint">
              <span>{wf.nodes.length} nodes</span>
              <span>{wf.edges.length} edges</span>
              <span className="tabular">{wf.id}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
