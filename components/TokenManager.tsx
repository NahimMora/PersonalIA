"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/ui-maps";
import { Check, Copy } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

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
      setCopied(false);
      setName("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revoke(id: string) {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex gap-2 rounded-xl border border-border bg-surface p-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. iPhone Shortcuts)"
          aria-label="Nombre del token"
          required
          className="flex-1"
        />
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Generando…" : "Generar"}
        </Button>
      </form>

      {newToken && (
        <div className="rounded-xl border border-status-resolved bg-status-resolved/10 p-4">
          <p className="mb-2 text-sm font-medium">Copiá este token ahora — no se vuelve a mostrar:</p>
          <div className="flex items-center gap-2">
            <code className="block flex-1 truncate rounded-lg bg-surface p-2 text-xs">{newToken}</code>
            <Button type="button" variant="secondary" size="sm" onClick={copyToken} aria-label="Copiar token">
              {copied ? <Check size={14} className="text-status-resolved" /> : <Copy size={14} />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
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
