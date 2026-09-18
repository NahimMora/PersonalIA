import { clsx } from "clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldStyles =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldStyles, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(fieldStyles, "resize-none", className)} {...props} />;
}
