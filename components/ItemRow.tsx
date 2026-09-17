"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { priorityColorVar, priorityLabel, relativeTime, typeLabel } from "@/lib/ui-maps";
import { Check, X } from "lucide-react";

interface ItemRowProps {
  id: string;
  publicId: string;
  title: string;
  type: keyof typeof typeLabel;
  priority: keyof typeof priorityLabel;
  moduleName?: string | null;
  createdAt: string;
  showActions?: boolean;
}

export function ItemRow({ id, publicId, title, type, priority, moduleName, createdAt, showActions = true }: ItemRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  async function updateStatus(status: "RESOLVED" | "DISCARDED") {
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    });
  }

  if (done) return null;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted">{publicId}</span>
          <Badge colorVar={priorityColorVar[priority]}>{priorityLabel[priority]}</Badge>
          <span className="text-[11px] text-muted">{typeLabel[type]}</span>
          {moduleName && <span className="text-[11px] text-muted">· {moduleName}</span>}
        </div>
        <p className="truncate text-sm">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted">{relativeTime(createdAt)}</p>
      </div>
      {showActions && (
        <div className="flex shrink-0 gap-1">
          <button
            disabled={pending}
            onClick={() => updateStatus("RESOLVED")}
            className="rounded-lg p-2 text-status-resolved hover:bg-surface-hover disabled:opacity-40"
            aria-label="Resolver"
          >
            <Check size={16} />
          </button>
          <button
            disabled={pending}
            onClick={() => updateStatus("DISCARDED")}
            className="rounded-lg p-2 text-muted hover:bg-surface-hover disabled:opacity-40"
            aria-label="Descartar"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
