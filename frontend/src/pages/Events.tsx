import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PlatformEvent } from "../lib/types";

const EVENT_COLORS: Record<string, string> = {
  WorkflowStarted: "#e8722c",
  WorkflowCompleted: "#4a9d4f",
  WorkflowFailed: "#c1443a",
  WorkflowPaused: "#d4a017",
  WorkflowResumed: "#e8722c",
  WorkflowCancelled: "#d97a4d",
  NodeStarted: "#8f8270",
  NodeCompleted: "#4a9d4f",
  NodeFailed: "#c1443a",
  NodeSkipped: "#8f8270",
  PluginLoaded: "#5b6bab",
  RetryStarted: "#d4a017",
  CheckpointCreated: "#5c8a5c",
};

export default function Events() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .listEvents(300)
        .then((e) => !cancelled && setEvents(e))
        .catch(() => !cancelled && setError("Could not reach the FlowForge API."));
    };
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const types = ["ALL", ...Array.from(new Set(events.map((e) => e.type)))];
  const filtered = filter === "ALL" ? events : events.filter((e) => e.type === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
            Every lifecycle event fired across every workflow and node, in real time.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark px-3 py-1.5 text-sm outline-none"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark font-mono text-xs">
        {filtered.length === 0 && <div className="px-4 py-8 text-center text-ink-faint">No events yet.</div>}
        {filtered.map((event, i) => {
          const color = EVENT_COLORS[event.type] ?? "#8f8270";
          return (
            <div
              key={i}
              className="grid grid-cols-[160px_180px_1fr] items-center gap-3 border-b border-hairline dark:border-hairline-dark px-4 py-2 last:border-0 hover:bg-plane dark:hover:bg-plane-dark"
            >
              <span className="tabular text-ink-faint">{new Date(event.timestamp).toLocaleTimeString()}</span>
              <span className="rounded px-1.5 py-0.5 font-semibold" style={{ color, backgroundColor: `${color}1a` }}>
                {event.type}
              </span>
              <span className="truncate text-ink-muted dark:text-ink-muted-dark">
                {JSON.stringify(event.payload)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
