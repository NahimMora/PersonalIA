"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/ui-maps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
}
interface Repository {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  tokenEnvVar: string;
  lastSyncedAt: string | null;
  project: { name: string } | null;
  _count: { documents: number };
}

export function RepositoryManager({ repositories, projects }: { repositories: Repository[]; projects: Project[] }) {
  const router = useRouter();
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [tokenEnvVar, setTokenEnvVar] = useState("GITHUB_TOKEN");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function addRepo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, name, defaultBranch, tokenEnvVar, projectId: projectId || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      setOwner("");
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function sync(id: string) {
    setSyncingId(id);
    setSyncError(null);
    try {
      const res = await fetch(`/api/repositories/${id}/sync`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al sincronizar");
      router.refresh();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addRepo} className="space-y-2 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium">Conectar repositorio</p>
        <div className="flex gap-2">
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" aria-label="Owner del repositorio" required className="flex-1" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="repo" aria-label="Nombre del repositorio" required className="flex-1" />
        </div>
        <div className="flex gap-2">
          <div className="w-28">
            <Input value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} placeholder="rama (main)" aria-label="Rama por defecto" />
          </div>
          <Input value={tokenEnvVar} onChange={(e) => setTokenEnvVar(e.target.value)} placeholder="Env var del token" aria-label="Variable de entorno del token" className="flex-1" />
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          aria-label="Proyecto asociado"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-accent"
        >
          <option value="">Sin proyecto asociado (solo guarda docs)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          El token nunca se guarda acá: se lee de la variable de entorno indicada (definila en .env / en el servidor).
        </p>
        {error && (
          <p role="alert" className="text-sm text-priority-critical">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? "Conectando…" : "Conectar"}
        </Button>
      </form>

      {syncError && (
        <p role="alert" className="text-sm text-priority-critical">
          {syncError}
        </p>
      )}

      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {repositories.map((repo) => (
          <div key={repo.id} className="flex items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {repo.owner}/{repo.name}
              </p>
              <p className="text-xs text-muted">
                {repo.project?.name ?? "Sin proyecto"} · {repo._count.documents} docs ·{" "}
                {repo.lastSyncedAt ? `sync ${relativeTime(repo.lastSyncedAt)}` : "nunca sincronizado"}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => sync(repo.id)} disabled={syncingId === repo.id} className="shrink-0">
              {syncingId === repo.id ? "Sincronizando…" : "Sincronizar"}
            </Button>
          </div>
        ))}
        {repositories.length === 0 && <p className="p-6 text-center text-sm text-muted">Sin repositorios conectados.</p>}
      </div>
    </div>
  );
}
