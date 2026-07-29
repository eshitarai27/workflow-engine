import * as RTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
}: {
  value: string;
  onValueChange: (v: string) => void;
  tabs: { value: string; label: string; icon?: ReactNode; count?: number }[];
  children: ReactNode;
}) {
  return (
    <RTabs.Root value={value} onValueChange={onValueChange}>
      <RTabs.List className="flex items-center gap-1 border-b border-hairline dark:border-hairline-dark">
        {tabs.map((tab) => (
          <RTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="group relative flex items-center gap-1.5 px-3 py-2 text-sm text-ink-muted transition-colors hover:text-ink data-[state=active]:text-ink dark:text-ink-muted-dark dark:hover:text-ink-dark dark:data-[state=active]:text-ink-dark"
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded bg-plane px-1 text-xs text-ink-faint dark:bg-plane-dark dark:text-ink-faint-dark">
                {tab.count}
              </span>
            )}
            <span className="absolute inset-x-0 -bottom-px h-[2px] scale-x-0 bg-accent transition-transform duration-150 group-data-[state=active]:scale-x-100 dark:bg-accent-dark" />
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RTabs.Content value={value} className="animate-fade-in outline-none">
      {children}
    </RTabs.Content>
  );
}
