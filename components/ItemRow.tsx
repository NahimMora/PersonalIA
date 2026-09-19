"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { priorityColorVar, priorityLabel, relativeTime, typeLabel } from "@/lib/ui-maps";
import { Check, Pencil, X } from "lucide-react";
import { clsx } from "clsx";
import { ItemEditForm } from "@/components/ItemEditForm";

interface ItemRowProps {
  id: string;
  publicId: string;
  title: string;
  description?: string | null;
  type: keyof typeof typeLabel;
  priority: keyof typeof priorityLabel;
  moduleName?: string | null;
  createdAt: string;
  showActions?: boolean;
  status?: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "DISCARDED";
}

export function ItemRow({
  id,
  publicId,
  title,
  description,
  type,
  priority,
  moduleName,
  createdAt,
  showActions = true,
  status,
}: ItemRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [display, setDisplay] = useState({ title, description, priority });

  async function updateStatus(newStatus: "RESOLVED" | "DISCARDED") {
    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeaving(true);
        setTimeout(() => {
          setGone(true);
          router.refresh();
        }, 150);
      }
    });
  }

  if (gone) return null;

  const canExpand = Boolean(display.description && display.description !== display.title);
  const isDiscarded = status === "DISCARDED";

  if (editing) {
    return (
      <div className="border-b border-l-[3px] border-border py-2.5 pr-3 pl-3.5 last:border-b-0" style={{ borderLeftColor: `var(--${priorityColorVar[display.priority]})` }}>
        <p className="mb-1.5 font-mono text-[11px] text-muted">{publicId}</p>
        <ItemEditForm
          id={id}
          title={display.title}
          description={display.description}
          priority={display.priority}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            setDisplay(saved);
            setEditing(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "border-b border-l-[3px] border-border py-2.5 pr-3 pl-3.5 transition-all duration-150 last:border-b-0 hover:bg-surface-hover",
        isDiscarded && "opacity-60",
        leaving && "scale-[0.98] opacity-0"
      )}
      style={{ borderLeftColor: `var(--${priorityColorVar[display.priority]})` }}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => canExpand && setExpanded((v) => !v)}
          className={clsx("min-w-0 flex-1 text-left", canExpand ? "cursor-pointer" : "cursor-default")}
        >
          <p className="truncate text-sm leading-snug text-foreground">{display.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted">{publicId}</span>
            <Badge colorVar={priorityColorVar[display.priority]}>{priorityLabel[display.priority]}</Badge>
            <span className="text-[11px] text-muted">{typeLabel[type]}</span>
            {moduleName && <span className="text-[11px] text-muted">· {moduleName}</span>}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[11px] text-muted sm:inline">{relativeTime(createdAt)}</span>
          {!showActions && (status === "RESOLVED" || status === "DISCARDED") && (
            <span
              className={clsx(
                "hidden items-center gap-1 text-[11px] sm:flex",
                status === "RESOLVED" ? "text-status-resolved" : "text-muted"
              )}
            >
              {status === "RESOLVED" ? <Check size={12} /> : <X size={12} />}
              {status === "RESOLVED" ? "Resuelto" : "Descartado"}
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-sunken"
            aria-label={`Editar ${publicId}`}
          >
            <Pencil size={15} />
          </button>
          {showActions && (
            <>
              <button
                disabled={pending}
                onClick={() => updateStatus("RESOLVED")}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-status-resolved hover:bg-status-resolved/10 disabled:opacity-40"
                aria-label={`Resolver ${publicId}`}
              >
                <Check size={16} />
              </button>
              <button
                disabled={pending}
                onClick={() => updateStatus("DISCARDED")}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-sunken disabled:opacity-40"
                aria-label={`Descartar ${publicId}`}
              >
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && display.description && (
        <p className="mt-2 whitespace-pre-wrap border-t border-border pt-2 text-sm text-muted">{display.description}</p>
      )}
    </div>
  );
}
