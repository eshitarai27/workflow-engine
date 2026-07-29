import { useEffect, useState } from "react";
import type { Execution, Workflow } from "../lib/types";
import { api } from "../lib/api";
import WorkflowThumbnail from "./WorkflowThumbnail";

const cache = new Map<string, Promise<Execution[]>>();

function loadExecutions(workflowId: string): Promise<Execution[]> {
  let entry = cache.get(workflowId);
  if (!entry) {
    entry = api.listExecutions(workflowId, 30);
    cache.set(workflowId, entry);
  }
  return entry;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function WorkflowStatsPreview({ workflow }: { workflow: Workflow }) {
  const [executions, setExecutions] = useState<Execution[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadExecutions(workflow.id).then((e) => !cancelled && setExecutions(e));
    return () => {
      cancelled = true;
    };
  }, [workflow.id]);

  const terminal = executions?.filter((e) => e.status === "SUCCESS" || e.status === "FAILED") ?? [];
  const successRate = terminal.length ? Math.round((terminal.filter((e) => e.status === "SUCCESS").length / terminal.length) * 100) : null;
  const durations = executions?.map((e) => e.duration_ms).filter((d): d is number => d !== null) ?? [];
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const last = executions?.[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-ink dark:text-ink-dark">{workflow.name}</div>
        <span className="tabular text-xs text-ink-faint dark:text-ink-faint-dark">v{workflow.version}</span>
      </div>
      <div className="h-16 rounded border border-hairline bg-plane dark:border-hairline-dark dark:bg-plane-dark">
        <WorkflowThumbnail workflow={workflow} className="h-full w-full p-2" />
      </div>
      {executions === null ? (
        <div className="text-xs text-ink-faint dark:text-ink-faint-dark">Loading recent runs…</div>
      ) : executions.length === 0 ? (
        <div className="text-xs text-ink-faint dark:text-ink-faint-dark">Never run yet.</div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="tabular text-sm font-medium text-ink dark:text-ink-dark">{executions.length}</div>
            <div className="text-[11px] text-ink-faint dark:text-ink-faint-dark">runs</div>
          </div>
          <div>
            <div className="tabular text-sm font-medium text-ink dark:text-ink-dark">{successRate === null ? "—" : `${successRate}%`}</div>
            <div className="text-[11px] text-ink-faint dark:text-ink-faint-dark">success</div>
          </div>
          <div>
            <div className="tabular text-sm font-medium text-ink dark:text-ink-dark">{avgDuration === null ? "—" : formatDuration(avgDuration)}</div>
            <div className="text-[11px] text-ink-faint dark:text-ink-faint-dark">avg</div>
          </div>
        </div>
      )}
      {last && (
        <div className="border-t border-hairline pt-2 text-xs text-ink-faint dark:border-hairline-dark dark:text-ink-faint-dark">
          Last run: {last.status.toLowerCase()} {last.started_at ? `· ${new Date(last.started_at).toLocaleString()}` : ""}
        </div>
      )}
    </div>
  );
}
