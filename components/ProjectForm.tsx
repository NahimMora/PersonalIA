"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        <div className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (ej. HolaSalta)"
            aria-label="Nombre del proyecto"
            required
          />
        </div>
        <div className="w-24">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código (HS)"
            aria-label="Código del proyecto"
            maxLength={10}
            required
            className="uppercase"
          />
        </div>
      </div>
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        aria-label="Descripción del proyecto"
      />
      {error && (
        <p role="alert" className="text-sm text-priority-critical">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Creando…" : "Crear proyecto"}
      </Button>
    </form>
  );
}
