import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon && (
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-ink-faint dark:border-hairline-dark dark:text-ink-faint-dark">
          <Icon size={16} strokeWidth={1.75} />
        </div>
      )}
      <div className="text-sm font-medium text-ink dark:text-ink-dark">{title}</div>
      {description && <p className="max-w-sm text-xs text-ink-muted dark:text-ink-muted-dark">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
