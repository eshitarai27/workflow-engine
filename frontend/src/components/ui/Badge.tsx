import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { ExecutionStatus, NodeState } from "../../lib/types";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  success: "text-status-success bg-status-success/10 dark:text-status-success-dark dark:bg-status-success-dark/10",
  warning: "text-status-warning bg-status-warning/10 dark:text-status-warning-dark dark:bg-status-warning-dark/10",
  danger: "text-status-danger bg-status-danger/10 dark:text-status-danger-dark dark:bg-status-danger-dark/10",
  info: "text-status-info bg-status-info/10 dark:text-status-info-dark dark:bg-status-info-dark/10",
  neutral: "text-status-neutral bg-status-neutral/10 dark:text-status-neutral-dark dark:bg-status-neutral-dark/10",
  accent: "text-accent bg-accent-muted dark:text-accent-dark dark:bg-accent-muted-dark",
};

export function Badge({
  tone = "neutral",
  children,
  dot = true,
  pulse = false,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-medium", toneClasses[tone], className)}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dotClasses[tone])} />}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}

const dotClasses: Record<Tone, string> = {
  success: "bg-status-success dark:bg-status-success-dark",
  warning: "bg-status-warning dark:bg-status-warning-dark",
  danger: "bg-status-danger dark:bg-status-danger-dark",
  info: "bg-status-info dark:bg-status-info-dark",
  neutral: "bg-status-neutral dark:bg-status-neutral-dark",
  accent: "bg-accent dark:bg-accent-dark",
};

const NODE_STATE_TONE: Record<NodeState, Tone> = {
  WAITING: "neutral",
  READY: "info",
  RUNNING: "accent",
  SUCCESS: "success",
  FAILED: "danger",
  SKIPPED: "neutral",
  CANCELLED: "neutral",
};

const EXECUTION_STATUS_TONE: Record<ExecutionStatus, Tone> = {
  PENDING: "neutral",
  RUNNING: "accent",
  PAUSED: "info",
  SUCCESS: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

export function NodeStateBadge({ state }: { state: NodeState }) {
  return (
    <Badge tone={NODE_STATE_TONE[state] ?? "neutral"} pulse={state === "RUNNING"}>
      {state}
    </Badge>
  );
}

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  return (
    <Badge tone={EXECUTION_STATUS_TONE[status] ?? "neutral"} pulse={status === "RUNNING"}>
      {status}
    </Badge>
  );
}

export function CategoryBadge({ category, color }: { category: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {category}
    </span>
  );
}
