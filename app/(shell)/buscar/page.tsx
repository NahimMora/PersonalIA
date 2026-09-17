"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { priorityColorVar, priorityLabel } from "@/lib/ui-maps";

interface SearchItem {
  id: string;
  publicId: string;
  title: string;
  priority: keyof typeof priorityLabel;
  project: { name: string; slug: string };
}
interface SearchProject {
  id: string;
  name: string;
  slug: string;
  code: string;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [projects, setProjects] = useState<SearchProject[]>([]);

  const isSearchable = q.trim().length >= 2;

  useEffect(() => {
    if (!isSearchable) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setItems(data.items);
          setProjects(data.projects);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [q, isSearchable]);

  const displayItems = isSearchable ? items : [];
  const displayProjects = isSearchable ? projects : [];

  return (
    <div className="space-y-4">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por texto o ID (ej. HS-BUG-0014)..."
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
      />

      {displayProjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayProjects.map((p) => (
            <Link key={p.id} href={`/proyectos/${p.slug}`} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-hover">
              {p.name} ({p.code})
            </Link>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface">
        {displayItems.map((item) => (
          <Link key={item.id} href={`/proyectos/${item.project.slug}`} className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-surface-hover">
            <span className="font-mono text-[11px] text-muted">{item.publicId}</span>
            <Badge colorVar={priorityColorVar[item.priority]}>{priorityLabel[item.priority]}</Badge>
            <span className="truncate">{item.title}</span>
          </Link>
        ))}
        {isSearchable && displayItems.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">Sin resultados.</p>
        )}
      </div>
    </div>
  );
}
