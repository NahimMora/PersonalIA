import { clsx } from "clsx";

export function Badge({ colorVar, children, className }: { colorVar: string; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={{
        color: `var(--${colorVar})`,
        backgroundColor: `color-mix(in srgb, var(--${colorVar}) 14%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
