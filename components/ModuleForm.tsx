"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModuleForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name }),
      });
      if (res.ok) {
        setName("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nuevo módulo..."
        className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
      />
      <button disabled={loading} className="rounded-lg border border-border px-2 py-1.5 text-xs disabled:opacity-40">
        Agregar
      </button>
    </form>
  );
}
