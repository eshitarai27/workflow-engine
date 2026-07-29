import * as RDropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function DropdownMenu({ trigger, children, align = "end" }: { trigger: ReactNode; children: ReactNode; align?: "start" | "end" | "center" }) {
  return (
    <RDropdown.Root>
      <RDropdown.Trigger asChild>{trigger}</RDropdown.Trigger>
      <RDropdown.Portal>
        <RDropdown.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[180px] rounded-md border border-hairline bg-surface-raised p-1 text-sm shadow-panel animate-scale-in dark:border-hairline-dark dark:bg-surface-raised-dark dark:shadow-panel-dark"
        >
          {children}
        </RDropdown.Content>
      </RDropdown.Portal>
    </RDropdown.Root>
  );
}

export function DropdownItem({
  children,
  onSelect,
  danger,
  icon,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  icon?: ReactNode;
}) {
  return (
    <RDropdown.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm outline-none transition-colors",
        danger
          ? "text-status-danger hover:bg-status-danger/10 dark:text-status-danger-dark dark:hover:bg-status-danger-dark/10"
          : "text-ink hover:bg-plane dark:text-ink-dark dark:hover:bg-plane-dark"
      )}
    >
      {icon}
      {children}
    </RDropdown.Item>
  );
}

export function DropdownSeparator() {
  return <RDropdown.Separator className="my-1 h-px bg-hairline dark:bg-hairline-dark" />;
}
