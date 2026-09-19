"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { priorityLabel } from "@/lib/ui-maps";

type PriorityKey = keyof typeof priorityLabel;

interface Saved {
  title: string;
  description: string | null;
  priority: PriorityKey;
}

export function ItemEditForm({
  id,
  title,
  description,
  priority,
  onSaved,
  onCancel,
}: {
  id: string;
  title: string;
  description?: string | null;
  priority: PriorityKey;
  onSaved: (saved: Saved) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ title, description: description ?? "", priority });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, description: form.description || null, priority: form.priority }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al guardar");
      onSaved({ title: form.title, description: form.description || null, priority: form.priority });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-sunken p-2.5">
      <Input
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void save();
          if (e.key === "Escape") onCancel();
        }}
        aria-label="Título"
        autoFocus
      />
      <Textarea
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        placeholder="Descripción (opcional)"
        rows={2}
        aria-label="Descripción"
      />
      <select
        value={form.priority}
        onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as PriorityKey }))}
        aria-label="Prioridad"
        className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
      >
        {Object.entries(priorityLabel).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-priority-critical">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="primary" size="sm" onClick={() => void save()} disabled={saving || !form.title.trim()} className="flex-1">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
