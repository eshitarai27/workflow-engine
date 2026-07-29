import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const fieldBase =
  "w-full rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent dark:border-hairline-dark dark:bg-surface-dark dark:text-ink-dark dark:placeholder:text-ink-faint-dark dark:focus:border-accent-dark disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, className)} {...props} />
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "resize-none", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "appearance-none bg-no-repeat pr-7", className)} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1 block text-xs font-medium text-ink-muted dark:text-ink-muted-dark",
        className
      )}
      {...props}
    />
  );
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-8 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50",
        checked ? "bg-accent dark:bg-accent-dark" : "bg-hairline dark:bg-hairline-dark"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150",
          checked ? "translate-x-3.5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
