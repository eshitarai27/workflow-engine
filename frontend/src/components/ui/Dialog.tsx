import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export default function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = "480px",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] data-[state=open]:animate-fade-in dark:bg-black/60" />
        <RDialog.Content
          style={{ maxWidth: width }}
          className="fixed left-1/2 top-[12%] z-50 w-[92vw] -translate-x-1/2 rounded-lg border border-hairline bg-surface p-5 shadow-panel outline-none animate-scale-in dark:border-hairline-dark dark:bg-surface-dark dark:shadow-panel-dark"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <RDialog.Title className="text-base font-semibold tracking-tight text-ink dark:text-ink-dark">
                {title}
              </RDialog.Title>
              {description && (
                <RDialog.Description className="mt-1 text-xs text-ink-muted dark:text-ink-muted-dark">
                  {description}
                </RDialog.Description>
              )}
            </div>
            <RDialog.Close className="rounded-md p-1 text-ink-faint transition-colors hover:bg-plane hover:text-ink dark:text-ink-faint-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark">
              <X size={16} />
            </RDialog.Close>
          </div>
          {children}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
