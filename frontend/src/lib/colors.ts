import type { ExecutionStatus, NodeState } from "./types";

// Node/execution states are semantic (success, failure, in-progress), so
// they draw from the status palette, not the categorical one below.
export const NODE_STATE_COLORS: Record<NodeState, string> = {
  WAITING: "#8f8270",
  READY: "#4c7a96",
  RUNNING: "#e8722c",
  SUCCESS: "#4a9d4f",
  FAILED: "#c1443a",
  SKIPPED: "#8f8270",
  CANCELLED: "#d97a4d",
};

export const EXECUTION_STATUS_COLORS: Record<ExecutionStatus, string> = {
  PENDING: "#8f8270",
  RUNNING: "#e8722c",
  PAUSED: "#d4a017",
  SUCCESS: "#4a9d4f",
  FAILED: "#c1443a",
  CANCELLED: "#d97a4d",
};

/** One forge-palette slot per plugin category (identity, not state), kept
 * in a fixed order so a category's color never shifts between the Plugin
 * Manager and the builder's node palette. */
export const CATEGORY_COLORS: Record<string, string> = {
  network: "#e8722c", // ember
  compute: "#4c7a96", // steel
  data: "#c9a13b", // brass
  storage: "#5c8a5c", // moss
  notification: "#8b5a8f", // plum
  ai: "#5b6bab", // indigo
  general: "#7a7568", // slate
};

export function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
}

export function colorForNodeState(state: NodeState): string {
  return NODE_STATE_COLORS[state] ?? "#8f8270";
}

export function colorForExecutionStatus(status: ExecutionStatus): string {
  return EXECUTION_STATUS_COLORS[status] ?? "#8f8270";
}
