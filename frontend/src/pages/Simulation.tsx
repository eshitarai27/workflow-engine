import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { SimulationResult } from "../lib/types";

export default function Simulation() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) return;
    api
      .simulateWorkflow(workflowId)
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Simulation failed"));
  }, [workflowId]);

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }
  if (!result) {
    return <div className="text-sm text-ink-muted dark:text-ink-muted-dark">Simulating…</div>;
  }

  const criticalSet = new Set(result.critical_path);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Simulation</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            What this workflow would do -- no node's action actually runs.
          </p>
        </div>
        <Link to={`/workflows/${workflowId}`} className="text-xs text-forge-1 hover:underline">
          ← Back to workflow
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Estimated runtime</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">{result.estimated_runtime_seconds.toFixed(2)}s</div>
        </div>
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Nodes</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">{result.execution_order.length}</div>
        </div>
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Layers</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">{result.layers.length}</div>
        </div>
        <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-5 py-4">
          <div className="text-xs text-ink-muted dark:text-ink-muted-dark">Parallel branches</div>
          <div className="tabular mt-1.5 text-2xl font-semibold">{result.parallel_branches.length}</div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-xs text-status-warning">
          {result.warnings.join(" · ")}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Execution layers</h2>
        <div className="flex flex-col gap-2">
          {result.layers.map((layer, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-3">
              <span className="tabular w-16 shrink-0 text-xs text-ink-faint">Layer {i + 1}</span>
              <div className="flex flex-wrap gap-2">
                {layer.map((nodeId) => (
                  <span
                    key={nodeId}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      criticalSet.has(nodeId)
                        ? "bg-forge-8/20 text-forge-8"
                        : "bg-plane dark:bg-plane-dark text-ink-muted dark:text-ink-muted-dark"
                    }`}
                  >
                    {nodeId}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">
          Critical path (the floor on how fast this workflow can finish)
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-4 text-sm">
          {result.critical_path.map((nodeId, i) => (
            <span key={nodeId} className="flex items-center gap-1.5">
              <span className="rounded-full bg-forge-8/20 px-2.5 py-1 text-xs font-medium text-forge-8">{nodeId}</span>
              {i < result.critical_path.length - 1 && <span className="text-ink-faint">→</span>}
            </span>
          ))}
        </div>
      </div>

      {result.bottlenecks.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">Potential bottlenecks</h2>
          <div className="flex flex-col gap-2">
            {result.bottlenecks.map((b) => (
              <div
                key={b.node_id}
                className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-3 text-sm"
              >
                <span className="font-medium">{b.node_id}</span>
                <span className="ml-2 text-xs text-ink-muted dark:text-ink-muted-dark">{b.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
