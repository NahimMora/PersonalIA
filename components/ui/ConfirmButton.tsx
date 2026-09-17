"use client";

import { useState } from "react";
import { clsx } from "clsx";

/**
 * Reusable confirmation gate for destructive/sensitive operations (see
 * docs/SECURITY.md → "Operaciones destructivas"). First click arms it,
 * second click within a few seconds actually runs `onConfirm`.
 */
export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "¿Seguro? Tocá de nuevo",
  className,
}: {
  onConfirm: () => void | Promise<void>;
  label: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="button"
      className={clsx(
        "rounded-lg border px-3 py-1.5 text-sm transition",
        armed ? "border-priority-critical bg-priority-critical/10 text-priority-critical" : "border-border text-priority-critical hover:bg-surface-hover",
        className
      )}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
