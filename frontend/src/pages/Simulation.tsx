import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, GitBranch } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { SimulationResult } from "../lib/types";
import { Panel, SectionLabel } from "../components/ui/Panel";
import Stat from "../components/ui/Stat";
import { cn } from "../lib/cn";

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
      <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
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
          <Link to={`/workflows/${workflowId}`} className="mb-1 flex w-fit items-center gap-1 text-xs text-ink-faint hover:text-ink-muted dark:text-ink-faint-dark dark:hover:text-ink-muted-dark">
            <ArrowLeft size={12} /> Back to workflow
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Simulation</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">What this workflow would do — no node's action actually runs.</p>
        </div>
      </div>

      <Panel className="grid grid-cols-2 divide-x divide-hairline md:grid-cols-4 dark:divide-hairline-dark">
        <Stat label="Estimated runtime" value={`${result.estimated_runtime_seconds.toFixed(2)}s`} />
        <Stat label="Nodes" value={String(result.execution_order.length)} />
        <Stat label="Layers" value={String(result.layers.length)} />
        <Stat label="Parallel branches" value={String(result.parallel_branches.length)} />
      </Panel>

      {result.warnings.length > 0 && (
        <div className="rounded-md border border-status-warning/30 bg-status-warning/10 px-4 py-3 text-xs text-status-warning dark:border-status-warning-dark/30 dark:bg-status-warning-dark/10 dark:text-status-warning-dark">
          {result.warnings.join(" · ")}
        </div>
      )}

      <div>
        <SectionLabel className="mb-2">Execution layers</SectionLabel>
        <div className="flex flex-col gap-2">
          {result.layers.map((layer, i) => (
            <Panel key={i} className="flex items-center gap-2 p-3">
              <span className="tabular w-16 shrink-0 text-xs text-ink-faint dark:text-ink-faint-dark">Layer {i + 1}</span>
              <div className="flex flex-wrap gap-2">
                {layer.map((nodeId) => (
                  <span
                    key={nodeId}
                    className={cn(
                      "rounded px-2 py-0.5 text-xs font-medium",
                      criticalSet.has(nodeId)
                        ? "bg-accent-muted text-accent dark:bg-accent-muted-dark dark:text-accent-dark"
                        : "bg-plane text-ink-muted dark:bg-plane-dark dark:text-ink-muted-dark"
                    )}
                  >
                    {nodeId}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel className="mb-2 flex items-center gap-1.5">
          <GitBranch size={12} /> Critical path — the floor on how fast this workflow can finish
        </SectionLabel>
        <Panel className="flex flex-wrap items-center gap-1.5 p-4 text-sm">
          {result.critical_path.map((nodeId, i) => (
            <span key={nodeId} className="flex items-center gap-1.5">
              <span className="rounded bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent dark:bg-accent-muted-dark dark:text-accent-dark">{nodeId}</span>
              {i < result.critical_path.length - 1 && <span className="text-ink-faint dark:text-ink-faint-dark">→</span>}
            </span>
          ))}
        </Panel>
      </div>

      {result.bottlenecks.length > 0 && (
        <div>
          <SectionLabel className="mb-2">Potential bottlenecks</SectionLabel>
          <div className="flex flex-col gap-2">
            {result.bottlenecks.map((b) => (
              <div key={b.node_id} className="rounded-lg border border-status-warning/30 bg-status-warning/10 p-3 text-sm dark:border-status-warning-dark/30 dark:bg-status-warning-dark/10">
                <span className="font-medium text-ink dark:text-ink-dark">{b.node_id}</span>
                <span className="ml-2 text-xs text-ink-muted dark:text-ink-muted-dark">{b.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
