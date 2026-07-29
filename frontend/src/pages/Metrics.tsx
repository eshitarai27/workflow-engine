import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import type { Execution } from "../lib/types";
import { Panel, SectionLabel } from "../components/ui/Panel";
import Stat from "../components/ui/Stat";
import { colorForExecutionStatus } from "../lib/colors";

const ACCENT = "#f0a020";

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="p-4">
      <SectionLabel className="mb-3">{title}</SectionLabel>
      <div style={{ width: "100%", height: 240 }}>{children}</div>
    </Panel>
  );
}

function EmptyState() {
  return <div className="flex h-full items-center justify-center text-xs text-ink-faint dark:text-ink-faint-dark">No data yet</div>;
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
      <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger dark:border-status-danger-dark/30 dark:bg-status-danger-dark/10 dark:text-status-danger-dark">
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
  const statusData = statusBuckets.map((status) => ({ status, count: executions.filter((e) => e.status === status).length }));

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

  const tickStyle = { fontSize: 11, fill: "#a1a1aa" };
  const tooltipStyle = { fontSize: 12, borderRadius: 8, border: "1px solid #232327", background: "#18181b", color: "#f4f4f5" };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink dark:text-ink-dark">Insights</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-ink-muted-dark">Aggregated from the most recent {total} executions.</p>
      </div>

      <Panel className="grid grid-cols-2 divide-x divide-hairline md:grid-cols-4 dark:divide-hairline-dark">
        <Stat label="Total executions" value={String(total)} />
        <Stat label="Succeeded" value={String(succeeded)} tone={succeeded > 0 ? "success" : undefined} />
        <Stat label="Failed" value={String(failed)} tone={failed > 0 ? "danger" : undefined} />
        <Stat label="Avg duration" value={`${avgDuration.toFixed(0)} ms`} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Executions by status">
          {total === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer>
              <BarChart data={statusData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232327" vertical={false} />
                <XAxis dataKey="status" tick={tickStyle} axisLine={{ stroke: "#232327" }} tickLine={false} />
                <YAxis tick={tickStyle} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(161,161,170,0.08)" }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#232327" vertical={false} />
                <XAxis dataKey="workflow" tick={tickStyle} axisLine={{ stroke: "#232327" }} tickLine={false} />
                <YAxis tick={tickStyle} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(161,161,170,0.08)" }} />
                <Bar dataKey="count" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={40} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#232327" vertical={false} />
                <XAxis dataKey="workflow" tick={tickStyle} axisLine={{ stroke: "#232327" }} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(161,161,170,0.08)" }} formatter={(value: number) => `${value.toFixed(1)} ms`} />
                <Bar dataKey="avgDurationMs" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
