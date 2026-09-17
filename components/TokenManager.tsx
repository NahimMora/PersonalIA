"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { relativeTime } from "@/lib/ui-maps";

interface Token {
  id: string;
  name: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function TokenManager({ tokens }: { tokens: Token[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      setNewToken(data.token);
      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2 rounded-xl border border-border bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. iPhone Shortcuts)"
          required
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button disabled={loading} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40">
          Generar
        </button>
      </form>

      {newToken && (
        <div className="rounded-xl border border-status-resolved bg-status-resolved/10 p-4">
          <p className="mb-2 text-sm font-medium">Copiá este token ahora — no se vuelve a mostrar:</p>
          <code className="block break-all rounded-lg bg-surface p-2 text-xs">{newToken}</code>
        </div>
      )}

      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted">
                {t.revokedAt ? "Revocado" : t.lastUsedAt ? `Usado ${relativeTime(t.lastUsedAt)}` : "Sin usar"} · creado {relativeTime(t.createdAt)}
              </p>
            </div>
            {!t.revokedAt && <ConfirmButton label="Revocar" onConfirm={() => revoke(t.id)} />}
          </div>
        ))}
        {tokens.length === 0 && <p className="p-6 text-center text-sm text-muted">Sin tokens todavía.</p>}
      </div>
    </div>
  );
}
