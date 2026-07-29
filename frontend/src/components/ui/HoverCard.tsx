import * as RHoverCard from "@radix-ui/react-hover-card";
import type { ReactNode } from "react";

export default function HoverCard({
  trigger,
  children,
  side = "right",
  align = "start",
  width = "300px",
}: {
  trigger: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  width?: string;
}) {
  return (
    <RHoverCard.Root openDelay={150} closeDelay={80}>
      <RHoverCard.Trigger asChild>{trigger}</RHoverCard.Trigger>
      <RHoverCard.Portal>
        <RHoverCard.Content
          side={side}
          align={align}
          sideOffset={10}
          style={{ width }}
          className="z-50 rounded-lg border border-hairline bg-surface-raised p-3.5 text-sm text-ink shadow-panel animate-scale-in dark:border-hairline-dark dark:bg-surface-raised-dark dark:text-ink-dark dark:shadow-panel-dark"
        >
          {children}
          <RHoverCard.Arrow className="fill-surface-raised dark:fill-surface-raised-dark" />
        </RHoverCard.Content>
      </RHoverCard.Portal>
    </RHoverCard.Root>
  );
}
