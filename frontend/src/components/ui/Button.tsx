import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90 dark:bg-accent-dark dark:text-[#1a1206] dark:hover:bg-accent-dark/90",
  secondary:
    "border border-hairline bg-surface text-ink hover:border-baseline hover:bg-plane dark:border-hairline-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:border-baseline-dark dark:hover:bg-plane-dark",
  ghost: "text-ink-muted hover:bg-plane hover:text-ink dark:text-ink-muted-dark dark:hover:bg-plane-dark dark:hover:text-ink-dark",
  danger:
    "border border-status-danger/25 text-status-danger hover:bg-status-danger/10 dark:border-status-danger-dark/25 dark:text-status-danger-dark dark:hover:bg-status-danger-dark/10",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
);
Button.displayName = "Button";

export default Button;
