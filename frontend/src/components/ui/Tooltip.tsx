import * as RTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RTooltip.Provider delayDuration={350} skipDelayDuration={100}>
      {children}
    </RTooltip.Provider>
  );
}

export default function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  if (!content) return <>{children}</>;
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 select-none rounded-md border border-hairline bg-surface-raised px-2 py-1 text-xs text-ink shadow-panel animate-fade-in dark:border-hairline-dark dark:bg-surface-raised-dark dark:text-ink-dark dark:shadow-panel-dark"
        >
          {content}
          <RTooltip.Arrow className="fill-surface-raised dark:fill-surface-raised-dark" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}
