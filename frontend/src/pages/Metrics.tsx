import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import type { Execution } from "../lib/types";
import StatTile from "../components/StatTile";
import { colorForExecutionStatus } from "../lib/colors";

const FORGE_PRIMARY = "#e8722c";

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline dark:border-hairline-dark bg-surface dark:bg-surface-dark p-5">
      <div className="mb-4 text-sm font-medium text-ink-muted dark:text-ink-muted-dark">{title}</div>
      <div style={{ width: "100%", height: 260 }}>{children}</div>
    </div>
  );
}

function EmptyState() {
  return <div className="flex h-full items-center justify-center text-xs text-ink-faint">No data yet</div>;
}

export default function Metrics() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .listExecutions(undefined, 200)
        .then((e) => !cancelled && setExecutions(e))
        .catch(() => !cancelled && setError("Could not reach the FlowForge API."));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-status-critical/30 bg-status-critical/10 px-4 py-3 text-sm text-status-critical">
        {error}
      </div>
    );
  }

  const total = executions.length;
  const succeeded = executions.filter((e) => e.status === "SUCCESS").length;
  const failed = executions.filter((e) => e.status === "FAILED").length;
  const durations = executions.map((e) => e.duration_ms).filter((d): d is number => d !== null);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const statusBuckets = ["PENDING", "RUNNING", "PAUSED", "SUCCESS", "FAILED", "CANCELLED"] as const;
  const statusData = statusBuckets.map((status) => ({
    status,
    count: executions.filter((e) => e.status === status).length,
  }));

  const byWorkflow = new Map<string, { count: number; totalDuration: number }>();
  for (const e of executions) {
    const entry = byWorkflow.get(e.workflow_id) ?? { count: 0, totalDuration: 0 };
    entry.count += 1;
    entry.totalDuration += e.duration_ms ?? 0;
    byWorkflow.set(e.workflow_id, entry);
  }
  const workflowData = Array.from(byWorkflow.entries()).map(([workflowId, v]) => ({
    workflow: workflowId.slice(0, 12),
    count: v.count,
    avgDurationMs: v.count ? v.totalDuration / v.count : 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Metrics</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">
          Aggregated from the most recent {total} executions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total executions" value={String(total)} />
        <StatTile label="Succeeded" value={String(succeeded)} accent={succeeded > 0 ? "#4a9d4f" : undefined} />
        <StatTile label="Failed" value={String(failed)} accent={failed > 0 ? "#c1443a" : undefined} />
        <StatTile label="Avg duration" value={`${avgDuration.toFixed(0)} ms`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Executions by status">
          {total === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer>
              <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#332c22" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#8f8270" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8f8270" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #332c22" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={colorForExecutionStatus(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Executions per workflow">
          {workflowData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer>
              <BarChart data={workflowData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#332c22" vertical={false} />
                <XAxis dataKey="workflow" tick={{ fontSize: 11, fill: "#8f8270" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8f8270" }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #332c22" }} />
                <Bar dataKey="count" fill={FORGE_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Average duration per workflow (ms)">
          {workflowData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer>
              <BarChart data={workflowData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#332c22" vertical={false} />
                <XAxis dataKey="workflow" tick={{ fontSize: 11, fill: "#8f8270" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8f8270" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #332c22" }}
                  formatter={(value: number) => `${value.toFixed(1)} ms`}
                />
                <Bar dataKey="avgDurationMs" fill={FORGE_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
