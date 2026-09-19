"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { priorityColorVar, priorityLabel, typeLabel } from "@/lib/ui-maps";
import { ItemEditForm } from "@/components/ItemEditForm";
import { MoreHorizontal } from "lucide-react";

type ItemTypeKey = keyof typeof typeLabel;
type PriorityKey = keyof typeof priorityLabel;

interface BoardItem {
  id: string;
  publicId: string;
  title: string;
  description?: string | null;
  type: ItemTypeKey;
  priority: PriorityKey;
  moduleName?: string | null;
}

interface Column {
  key: string;
  label: string;
  targetType: ItemTypeKey;
  match: (type: ItemTypeKey) => boolean;
}

const CATCHALL_TYPES: ItemTypeKey[] = ["IDEA", "INCIDENT", "BACKLOG"];

const COLUMNS: Column[] = [
  { key: "pendientes", label: "Pendientes", targetType: "TASK", match: (t) => !CATCHALL_TYPES.includes(t) },
  { key: "ideas", label: "Ideas", targetType: "IDEA", match: (t) => t === "IDEA" },
  { key: "incidentes", label: "Incidentes", targetType: "INCIDENT", match: (t) => t === "INCIDENT" },
  { key: "backlog", label: "Backlog", targetType: "BACKLOG", match: (t) => t === "BACKLOG" },
];

export function ItemBoard({ items: initialItems }: { items: BoardItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function moveItem(id: string, targetType: ItemTypeKey) {
    const previous = items;
    setItems((current) => current.map((it) => (it.id === id ? { ...it, type: targetType } : it)));

    startTransition(async () => {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: targetType }),
      });
      if (!res.ok) {
        setItems(previous);
        return;
      }
      router.refresh();
    });
  }

  function editItem(id: string, saved: { title: string; description: string | null; priority: PriorityKey }) {
    setItems((current) => current.map((it) => (it.id === id ? { ...it, ...saved } : it)));
    router.refresh();
  }

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {COLUMNS.map((column) => {
        const columnItems = items.filter((it) => column.match(it.type));
        return (
          <div
            key={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(column.key);
            }}
            onDragLeave={() => setDragOverColumn((c) => (c === column.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) void moveItem(id, column.targetType);
            }}
            className={clsx(
              "w-64 shrink-0 rounded-xl border bg-surface p-2 transition-colors md:w-auto md:flex-1",
              dragOverColumn === column.key ? "border-accent bg-accent-soft" : "border-border"
            )}
          >
            <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
              <h3 className="text-sm font-medium">{column.label}</h3>
              <span className="text-xs text-muted">{columnItems.length}</span>
            </div>
            <div className="space-y-1.5">
              {columnItems.map((item) => (
                <BoardCard key={item.id} item={item} column={column} onMove={moveItem} onEdit={editItem} />
              ))}
              {columnItems.length === 0 && <p className="px-1.5 py-3 text-center text-xs text-muted">Vacío</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({
  item,
  column,
  onMove,
  onEdit,
}: {
  item: BoardItem;
  column: Column;
  onMove: (id: string, type: ItemTypeKey) => void;
  onEdit: (id: string, saved: { title: string; description: string | null; priority: PriorityKey }) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const targets = COLUMNS.filter((c) => c.key !== column.key);

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-background p-2.5">
        <p className="mb-1.5 font-mono text-[10px] text-muted">{item.publicId}</p>
        <ItemEditForm
          id={item.id}
          title={item.title}
          description={item.description}
          priority={item.priority}
          onCancel={() => setEditing(false)}
          onSaved={(saved) => {
            onEdit(item.id, saved);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group relative cursor-grab rounded-lg border border-border bg-background p-2.5 active:cursor-grabbing"
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <span className="font-mono text-[10px] text-muted">{item.publicId}</span>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          onBlur={(e) => {
            if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setMenuOpen(false);
          }}
          className="rounded p-0.5 text-muted opacity-0 group-hover:opacity-100 hover:bg-surface-hover focus-visible:opacity-100"
          aria-label={`Opciones de ${item.publicId}`}
          aria-expanded={menuOpen}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
      <p className="mb-1.5 text-sm leading-snug">{item.title}</p>
      <div className="flex flex-wrap items-center gap-1">
        <Badge colorVar={priorityColorVar[item.priority]}>{priorityLabel[item.priority]}</Badge>
        {item.moduleName && <span className="text-[11px] text-muted">{item.moduleName}</span>}
      </div>

      {menuOpen && (
        <div className="absolute top-7 right-1 z-10 min-w-32 rounded-lg border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setEditing(true);
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
          >
            Editar
          </button>
          <p className="px-3 pt-1.5 pb-1.5 text-[10px] font-medium tracking-wide text-muted uppercase">Mover a</p>
          {targets.map((t) => (
            <button
              key={t.key}
              type="button"
              onMouseDown={(e) => {
                // Selecting via mousedown (not click) so this fires before the
                // trigger's onBlur can unmount the menu out from under the click.
                e.preventDefault();
                onMove(item.id, t.targetType);
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
