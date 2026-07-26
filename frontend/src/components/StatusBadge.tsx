import type { ExecutionStatus, NodeState } from "../lib/types";
import { colorForExecutionStatus, colorForNodeState } from "../lib/colors";

export function NodeStateBadge({ state }: { state: NodeState }) {
  const color = colorForNodeState(state);
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {state}
    </span>
  );
}

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const color = colorForExecutionStatus(status);
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}
