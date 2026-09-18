import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const variants = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border bg-surface text-foreground hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: "border border-border text-priority-critical hover:bg-priority-critical/10",
};

const sizes = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2.5 text-sm",
};

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return <button className={clsx(base, variants[variant], sizes[size], className)} {...props} />;
}
