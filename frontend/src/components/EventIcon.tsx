import {
  Blocks,
  CheckCircle2,
  CircleDashed,
  type LucideIcon,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipForward,
  Square,
  XCircle,
} from "lucide-react";

interface EventVisual {
  icon: LucideIcon;
  tone: "success" | "danger" | "warning" | "accent" | "info" | "neutral";
}

const EVENT_VISUALS: Record<string, EventVisual> = {
  WorkflowStarted: { icon: Play, tone: "accent" },
  WorkflowCompleted: { icon: CheckCircle2, tone: "success" },
  WorkflowFailed: { icon: XCircle, tone: "danger" },
  WorkflowPaused: { icon: Pause, tone: "warning" },
  WorkflowResumed: { icon: Play, tone: "accent" },
  WorkflowCancelled: { icon: Square, tone: "neutral" },
  NodeStarted: { icon: CircleDashed, tone: "neutral" },
  NodeCompleted: { icon: CheckCircle2, tone: "success" },
  NodeFailed: { icon: XCircle, tone: "danger" },
  NodeSkipped: { icon: SkipForward, tone: "neutral" },
  PluginLoaded: { icon: Blocks, tone: "info" },
  RetryStarted: { icon: RotateCcw, tone: "warning" },
  CheckpointCreated: { icon: Save, tone: "info" },
};

const TONE_CLASSES: Record<EventVisual["tone"], string> = {
  success: "text-status-success dark:text-status-success-dark",
  danger: "text-status-danger dark:text-status-danger-dark",
  warning: "text-status-warning dark:text-status-warning-dark",
  accent: "text-accent dark:text-accent-dark",
  info: "text-status-info dark:text-status-info-dark",
  neutral: "text-ink-faint dark:text-ink-faint-dark",
};

export function visualForEvent(type: string): EventVisual {
  return EVENT_VISUALS[type] ?? { icon: CircleDashed, tone: "neutral" };
}

export default function EventIcon({ type, size = 14 }: { type: string; size?: number }) {
  const { icon: Icon, tone } = visualForEvent(type);
  return <Icon size={size} className={TONE_CLASSES[tone]} />;
}
