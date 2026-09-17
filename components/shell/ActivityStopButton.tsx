"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function ActivityStopButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/activities/stop", { method: "POST" });
          router.refresh();
        })
      }
      className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
    >
      Terminar
    </button>
  );
}
