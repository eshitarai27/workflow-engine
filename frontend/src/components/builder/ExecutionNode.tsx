import { Handle, Position, type NodeProps } from "reactflow";
import { CheckCircle2, CircleDashed, Loader2, SkipForward, Square, XCircle } from "lucide-react";
import type { NodeState } from "../../lib/types";

export interface ExecutionNodeData {
  label: string;
  state: NodeState;
}

const STATE_STYLES: Record<NodeState, { border: string; ring: string; icon: JSX.Element; text: string }> = {
  WAITING: {
    border: "border-hairline dark:border-hairline-dark",
    ring: "",
    icon: <CircleDashed size={13} className="text-ink-faint dark:text-ink-faint-dark" />,
    text: "text-ink-faint dark:text-ink-faint-dark",
  },
  READY: {
    border: "border-status-info/50 dark:border-status-info-dark/50",
    ring: "",
    icon: <CircleDashed size={13} className="text-status-info dark:text-status-info-dark" />,
    text: "text-status-info dark:text-status-info-dark",
  },
  RUNNING: {
    border: "border-accent dark:border-accent-dark",
    ring: "ring-2 ring-accent/25 dark:ring-accent-dark/25 animate-pulse-ring",
    icon: <Loader2 size={13} className="animate-spin text-accent dark:text-accent-dark" />,
    text: "text-accent dark:text-accent-dark",
  },
  SUCCESS: {
    border: "border-status-success/60 dark:border-status-success-dark/60",
    ring: "",
    icon: <CheckCircle2 size={13} className="text-status-success dark:text-status-success-dark" />,
    text: "text-status-success dark:text-status-success-dark",
  },
  FAILED: {
    border: "border-status-danger dark:border-status-danger-dark",
    ring: "ring-2 ring-status-danger/20 dark:ring-status-danger-dark/20",
    icon: <XCircle size={13} className="text-status-danger dark:text-status-danger-dark" />,
    text: "text-status-danger dark:text-status-danger-dark",
  },
  SKIPPED: {
    border: "border-hairline dark:border-hairline-dark",
    ring: "",
    icon: <SkipForward size={13} className="text-ink-faint dark:text-ink-faint-dark" />,
    text: "text-ink-faint dark:text-ink-faint-dark",
  },
  CANCELLED: {
    border: "border-hairline dark:border-hairline-dark",
    ring: "",
    icon: <Square size={13} className="text-ink-faint dark:text-ink-faint-dark" />,
    text: "text-ink-faint dark:text-ink-faint-dark",
  },
};

export default function ExecutionNode({ data, selected }: NodeProps<ExecutionNodeData>) {
  const style = STATE_STYLES[data.state] ?? STATE_STYLES.WAITING;
  return (
    <div
      className={`flex w-[164px] items-center gap-2 rounded-md border bg-surface px-2.5 py-2 shadow-sm transition-colors duration-300 dark:bg-surface-dark ${style.border} ${style.ring} ${
        selected ? "outline outline-2 outline-offset-1 outline-ink-faint dark:outline-ink-faint-dark" : ""
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-surface !bg-baseline dark:!border-surface-dark dark:!bg-baseline-dark" />
      <span className="shrink-0">{style.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-ink dark:text-ink-dark">{data.label}</div>
        <div className={`truncate text-[10px] font-medium ${style.text}`}>{data.state}</div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-surface !bg-baseline dark:!border-surface-dark dark:!bg-baseline-dark" />
    </div>
  );
}
