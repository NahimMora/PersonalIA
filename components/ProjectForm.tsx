"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProjectForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name, code: code.toUpperCase(), description: description || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      setName("");
      setCode("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm font-medium">Nuevo proyecto</p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. HolaSalta)"
          required
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Código (HS)"
          maxLength={10}
          required
          className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
        />
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-priority-critical">{error}</p>}
      <button disabled={loading} className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40">
        Crear proyecto
      </button>
    </form>
  );
}
