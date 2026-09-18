"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ActivityStopButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/activities/stop", { method: "POST" });
          router.refresh();
        })
      }
      className="shrink-0"
    >
      {pending ? "Terminando…" : "Terminar"}
    </Button>
  );
}
