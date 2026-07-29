import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export default function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "accent" | "danger" | "success";
  icon?: ReactNode;
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent dark:text-accent-dark"
      : tone === "danger"
        ? "text-status-danger dark:text-status-danger-dark"
        : tone === "success"
          ? "text-status-success dark:text-status-success-dark"
          : "text-ink dark:text-ink-dark";
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-muted-dark">
        {icon}
        {label}
      </div>
      <div className={cn("tabular text-2xl font-semibold tracking-tight", toneClass)}>{value}</div>
      {hint && <div className="text-xs text-ink-faint dark:text-ink-faint-dark">{hint}</div>}
    </div>
  );
}
