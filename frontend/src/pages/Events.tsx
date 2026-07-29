import { useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, Pause, Play } from "lucide-react";
import { api } from "../lib/api";
import type { PlatformEvent } from "../lib/types";
import EventIcon from "../components/EventIcon";
import { Panel } from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import IconButton from "../components/ui/IconButton";
import { cn } from "../lib/cn";

export default function Events() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);
  const [live, setLive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
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
  }, [live]);

  const allTypes = useMemo(() => Array.from(new Set(events.map((e) => e.type))).sort(), [events]);
  const filtered = activeTypes === null ? events : events.filter((e) => activeTypes.has(e.type));

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const base = prev ?? new Set(allTypes);
      const next = new Set(base);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Activity</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">Every lifecycle event fired across every workflow and node, in real time.</p>
        </div>
        <IconButton label={live ? "Pause live updates" : "Resume live updates"} active={live} onClick={() => setLive((l) => !l)}>
          {live ? <Pause size={14} /> : <Play size={14} />}
        </IconButton>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {allTypes.map((t) => {
          const isActive = activeTypes === null || activeTypes.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                isActive
                  ? "border-baseline bg-plane text-ink dark:border-baseline-dark dark:bg-plane-dark dark:text-ink-dark"
                  : "border-hairline text-ink-faint hover:text-ink-muted dark:border-hairline-dark dark:text-ink-faint-dark dark:hover:text-ink-muted-dark"
              )}
            >
              <EventIcon type={t} size={11} />
              {t}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
          {error}
        </div>
      )}

      <Panel className="overflow-hidden font-mono text-xs">
        {filtered.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="No events yet" />
        ) : (
          filtered.map((event, i) => (
            <div
              key={i}
              className="grid grid-cols-[160px_20px_180px_1fr] items-center gap-2 border-b border-hairline px-4 py-2 last:border-0 hover:bg-plane dark:border-hairline-dark dark:hover:bg-plane-dark"
            >
              <span className="tabular text-ink-faint dark:text-ink-faint-dark">{new Date(event.timestamp).toLocaleTimeString()}</span>
              <EventIcon type={event.type} />
              <span className="font-semibold text-ink dark:text-ink-dark">{event.type}</span>
              <span className="truncate text-ink-muted dark:text-ink-muted-dark">{JSON.stringify(event.payload)}</span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
