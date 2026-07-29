import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import Tooltip from "./Tooltip";

type Variant = "default" | "danger" | "accent";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

const variants: Record<Variant, string> = {
  default:
    "text-ink-muted hover:bg-plane hover:text-ink dark:text-ink-muted-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark",
  danger: "text-status-danger hover:bg-status-danger/10 dark:text-status-danger-dark dark:hover:bg-status-danger-dark/10",
  accent: "text-accent hover:bg-accent-muted dark:text-accent-dark dark:hover:bg-accent-muted-dark",
};

const sizes: Record<Size, string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = "default", size = "md", active, ...props }, ref) => (
    <Tooltip content={label}>
      <button
        ref={ref}
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
          variants[variant],
          sizes[size],
          active && "bg-plane text-ink dark:bg-plane-dark dark:text-ink-dark",
          className
        )}
        {...props}
      />
    </Tooltip>
  )
);
IconButton.displayName = "IconButton";

export default IconButton;
