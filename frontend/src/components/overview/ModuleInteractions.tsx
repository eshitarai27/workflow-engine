import { useMemo } from "react";
import ReactFlow, { Background, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { useIsDark } from "../../lib/useIsDark";

interface Theme {
  surface: string;
  ink: string;
  hairline: string;
  accent: string;
  inkFaint: string;
}

function themeFor(dark: boolean): Theme {
  return dark
    ? { surface: "#18181b", ink: "#f4f4f5", hairline: "#232327", accent: "#f0a020", inkFaint: "#5f5f66" }
    : { surface: "#ffffff", ink: "#18181b", hairline: "#e4e4e7", accent: "#c2620a", inkFaint: "#a1a1aa" };
}

function baseNode(id: string, x: number, y: number, label: string, sub: string, accent: boolean, t: Theme): Node {
  return {
    id,
    position: { x, y },
    data: {
      label: (
        <div className="px-1 py-0.5 text-center">
          <div className="text-xs font-semibold">{label}</div>
          <div className="mt-0.5 font-mono text-[10px] opacity-70">{sub}</div>
        </div>
      ),
    },
    style: {
      background: accent ? t.accent : t.surface,
      color: accent ? "white" : t.ink,
      border: `1px solid ${accent ? t.accent : t.hairline}`,
      borderRadius: 8,
      width: 172,
      padding: 4,
    },
  };
}

export default function ModuleInteractions() {
  const isDark = useIsDark();
  const t = themeFor(isDark);

  const nodes = useMemo<Node[]>(
    () => [
      baseNode("api", 210, 0, "API routers", "workflows.py, executions.py", false, t),
      baseNode("execsvc", 210, 100, "ExecutionService", "starts & controls runs", true, t),
      baseNode("compiler", 0, 60, "Compiler + Planner", "validate → IR → layers", false, t),
      baseNode("engine", 420, 100, "Engine", "dispatches layers", false, t),
      baseNode("workerpool", 420, 220, "WorkerPool", "concurrent node execution", false, t),
      baseNode("plugins", 630, 220, "PluginRegistry", "10 built-in plugins", false, t),
      baseNode("eventbus", 210, 220, "EventBus", "pub/sub, 2000-event history", false, t),
      baseNode("checkpoint", 0, 220, "CheckpointStore", "JSON snapshot per execution", false, t),
      baseNode("scheduler", 0, 340, "Scheduler", "poll + drain threads", false, t),
      baseNode("storage", 210, 340, "Storage", "SQLite — workflows & executions", false, t),
    ],
    [t]
  );

  const solid = (id: string, source: string, target: string, label?: string): Edge => ({
    id,
    source,
    target,
    label,
    labelStyle: { fontSize: 9, fill: t.inkFaint },
    style: { stroke: t.accent, strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: t.accent, width: 14, height: 14 },
  });

  const dashed = (id: string, source: string, target: string, label?: string): Edge => ({
    id,
    source,
    target,
    label,
    labelStyle: { fontSize: 9, fill: t.inkFaint },
    style: { stroke: t.inkFaint, strokeWidth: 1.25, strokeDasharray: "4 3" },
    markerEnd: { type: MarkerType.ArrowClosed, color: t.inkFaint, width: 12, height: 12 },
  });

  const edges = useMemo<Edge[]>(
    () => [
      solid("e-api-exec", "api", "execsvc", "starts execution"),
      solid("e-exec-compiler", "execsvc", "compiler", "compile + plan"),
      solid("e-exec-engine", "execsvc", "engine", "runs plan"),
      solid("e-engine-pool", "engine", "workerpool", "dispatches layer"),
      solid("e-pool-plugins", "workerpool", "plugins", "execute(config, ctx)"),
      dashed("e-engine-events", "engine", "eventbus", "publishes events"),
      dashed("e-engine-checkpoint", "engine", "checkpoint", "checkpoints layer"),
      dashed("e-scheduler-exec", "scheduler", "execsvc", "enqueues due runs"),
      dashed("e-exec-storage", "execsvc", "storage", "persists execution"),
      dashed("e-api-storage", "api", "storage", "reads/writes workflows"),
    ],
    [t]
  );

  return (
    <div className="h-[380px] overflow-hidden rounded-lg border border-hairline dark:border-hairline-dark">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }} nodesDraggable={false} nodesConnectable={false} zoomOnScroll={false} panOnDrag>
        <Background gap={22} color={`${t.inkFaint}33`} />
      </ReactFlow>
    </div>
  );
}
