import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

export default function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="system"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-hairline dark:!border-hairline-dark !bg-surface-raised dark:!bg-surface-raised-dark !text-ink dark:!text-ink-dark !shadow-panel dark:!shadow-panel-dark !text-sm",
          title: "!text-ink dark:!text-ink-dark !font-medium",
          description: "!text-ink-muted dark:!text-ink-muted-dark",
          actionButton: "!bg-accent dark:!bg-accent-dark !text-white dark:!text-[#1a1206]",
          cancelButton: "!bg-transparent !text-ink-muted dark:!text-ink-muted-dark",
        },
      }}
    />
  );
}
