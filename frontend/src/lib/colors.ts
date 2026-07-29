import type { ExecutionStatus, NodeState } from "./types";

// Raw hex for contexts Tailwind classes can't reach: ReactFlow inline node
// styles, the minimap, and Recharts fills. Badges/pills use the Tailwind
// `status-*`/`category-*` tokens directly (see Badge.tsx) so they stay
// theme-aware; these are the fixed, single-hex counterparts for canvases.
export const NODE_STATE_COLORS: Record<NodeState, string> = {
  WAITING: "#a1a1aa",
  READY: "#60a5fa",
  RUNNING: "#f0a020",
  SUCCESS: "#22c55e",
  FAILED: "#ef4444",
  SKIPPED: "#71717a",
  CANCELLED: "#94a3b8",
};

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  PENDING: "#a1a1aa",
  RUNNING: "#f0a020",
  PAUSED: "#60a5fa",
  SUCCESS: "#22c55e",
  FAILED: "#ef4444",
  CANCELLED: "#94a3b8",
};

/** One color per plugin category (identity, not state), kept in sync with
 * the `category.*` tokens in tailwind.config.js. */
export const CATEGORY_COLORS: Record<string, string> = {
  network: "#f0a020",
  compute: "#60a5fa",
  data: "#a78bfa",
  storage: "#4ade80",
  notification: "#f472b6",
  ai: "#2dd4bf",
  general: "#a1a1aa",
};

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
}

export function colorForNodeState(state: NodeState): string {
  return NODE_STATE_COLORS[state] ?? "#a1a1aa";
}

export function colorForExecutionStatus(status: ExecutionStatus): string {
  return EXECUTION_STATUS_COLORS[status] ?? "#a1a1aa";
}
