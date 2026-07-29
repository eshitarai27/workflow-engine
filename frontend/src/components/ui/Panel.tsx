import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-surface dark:border-hairline-dark dark:bg-surface-dark",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-hairline-dark",
        className
      )}
      {...props}
    />
  );
}

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-xs font-medium uppercase tracking-wide text-ink-faint dark:text-ink-faint-dark", className)}
      {...props}
    />
  );
}
