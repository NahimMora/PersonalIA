"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { priorityColorVar, priorityLabel, typeLabel } from "@/lib/ui-maps";
import { Loader2, Search } from "lucide-react";

interface SearchItem {
  id: string;
  publicId: string;
  title: string;
  type: keyof typeof typeLabel;
  priority: keyof typeof priorityLabel;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "DISCARDED";
  project: { name: string; slug: string };
}
interface SearchProject {
  id: string;
  name: string;
  slug: string;
  code: string;
}

type Result = { key: string; href: string; kind: "project"; project: SearchProject } | { key: string; href: string; kind: "item"; item: SearchItem };

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [projects, setProjects] = useState<SearchProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  const isSearchable = q.trim().length >= 2;

  useEffect(() => {
    if (!isSearchable) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          setItems(data.items);
          setProjects(data.projects);
          setSelected(0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [q, isSearchable]);

  const results = useMemo<Result[]>(() => {
    if (!isSearchable) return [];
    const projectResults: Result[] = projects.map((p) => ({ key: `p-${p.id}`, href: `/proyectos/${p.slug}`, kind: "project", project: p }));
    const itemResults: Result[] = items.map((it) => ({ key: `i-${it.id}`, href: `/proyectos/${it.project.slug}`, kind: "item", item: it }));
    return [...projectResults, ...itemResults];
  }, [isSearchable, projects, items]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) setSelected((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) setSelected((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      const target = results[selected];
      if (target) router.push(target.href);
    } else if (e.key === "Escape") {
      if (q) {
        setQ("");
      } else {
        inputRef.current?.blur();
      }
    }
  }

  const projectResults = results.filter((r) => r.kind === "project");
  const itemResults = results.filter((r) => r.kind === "item");

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <Input
          ref={inputRef}
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Buscar por texto o ID (ej. HS-BUG-0014)…"
          className="pl-9"
          aria-label="Buscar"
          role="combobox"
          aria-expanded={isSearchable && results.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={results[selected]?.key}
        />
        {loading && <Loader2 size={15} className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-muted" />}
      </div>

      {!isSearchable && (
        <p className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-muted">
          Escribí al menos 2 caracteres para buscar
          <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
          navegar
          <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">Enter</kbd>
          abrir
          <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">esc</kbd>
          limpiar
        </p>
      )}

      {isSearchable && (
        <div id="search-results" role="listbox" aria-label="Resultados de búsqueda" className="max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface">
          {results.length === 0 && !loading && <p className="p-6 text-center text-sm text-muted">Sin resultados para &quot;{q}&quot;.</p>}

          {projectResults.length > 0 && <p className="px-4 pt-3 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">Proyectos</p>}
          {projectResults.map((r) => {
            if (r.kind !== "project") return null;
            const index = results.indexOf(r);
            return (
              <Link
                key={r.key}
                id={r.key}
                role="option"
                aria-selected={index === selected}
                href={r.href}
                onMouseEnter={() => setSelected(index)}
                className={clsx(
                  "flex items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0",
                  index === selected ? "bg-surface-hover" : "hover:bg-surface-hover"
                )}
              >
                <span className="font-medium">{r.project.name}</span>
                <span className="font-mono text-xs text-muted">{r.project.code}</span>
              </Link>
            );
          })}

          {itemResults.length > 0 && <p className="px-4 pt-3 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">Items</p>}
          {itemResults.map((r) => {
            if (r.kind !== "item") return null;
            const index = results.indexOf(r);
            const item = r.item;
            const isInactive = item.status === "RESOLVED" || item.status === "DISCARDED";
            return (
              <Link
                key={r.key}
                id={r.key}
                role="option"
                aria-selected={index === selected}
                href={r.href}
                onMouseEnter={() => setSelected(index)}
                className={clsx(
                  "flex items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0",
                  index === selected ? "bg-surface-hover" : "hover:bg-surface-hover",
                  isInactive && "opacity-60"
                )}
              >
                <span className="shrink-0 font-mono text-[11px] text-muted">{item.publicId}</span>
                <Badge colorVar={priorityColorVar[item.priority]}>{priorityLabel[item.priority]}</Badge>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="hidden shrink-0 text-xs text-muted sm:inline">{typeLabel[item.type]}</span>
                <span className="shrink-0 text-xs text-muted">{item.project.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
