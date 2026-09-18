"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { priorityLabel, typeLabel } from "@/lib/ui-maps";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  code: string;
}
interface Module {
  id: string;
  projectId: string;
  name: string;
}

interface Interpretation {
  id: string;
  suggestedProjectId: string | null;
  suggestedModuleId: string | null;
  suggestedType: string | null;
  suggestedPriority: string | null;
  suggestedTitle: string | null;
  confidence: number | null;
}

type Mode = "quick" | "reviewed";

export function CaptureForm({ projects, modules, aiAvailable }: { projects: Project[]; modules: Module[]; aiAvailable: boolean }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<Mode>("quick");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [captureId, setCaptureId] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    moduleId: "",
    type: "NOTE",
    priority: "MEDIUM",
    title: "",
    description: "",
  });

  // Success is a quiet pulse, not a wall you have to dismiss — it clears on
  // its own so the field is always ready for the next capture.
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  function reset() {
    setText("");
    setCaptureId(null);
    setInterpretation(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function submitQuick() {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, source: "USER_CAPTURE" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al capturar");
      const data = await res.json();
      const project = projects.find((p) => p.id === data.item.projectId);
      setSuccessMessage(`${data.item.publicId}${project ? ` en ${project.name}` : ""}`);
      reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function submitInterpret() {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/captures/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al interpretar");
      const data = await res.json();
      if (!data.aiAvailable) {
        setErrorMessage("La IA no está configurada (falta GEMINI_API_KEY). Usá captura rápida.");
        return;
      }
      setCaptureId(data.capture.id);
      applyInterpretation(data.interpretation);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function applyInterpretation(i: Interpretation) {
    setInterpretation(i);
    setForm({
      projectId: i.suggestedProjectId ?? "",
      moduleId: i.suggestedModuleId ?? "",
      type: i.suggestedType ?? "NOTE",
      priority: i.suggestedPriority ?? "MEDIUM",
      title: i.suggestedTitle ?? text.slice(0, 80),
      description: text,
    });
  }

  async function reinterpret() {
    if (!captureId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/captures/${captureId}/reinterpret`, { method: "POST" });
      const data = await res.json();
      applyInterpretation(data);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!captureId || !form.projectId) {
      setErrorMessage("Elegí un proyecto antes de confirmar.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/captures/${captureId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: form.projectId,
          moduleId: form.moduleId || null,
          type: form.type,
          priority: form.priority,
          title: form.title,
          description: form.description || undefined,
          interpretationId: interpretation?.id,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error al confirmar");
      const item = await res.json();
      const project = projects.find((p) => p.id === item.projectId);
      setSuccessMessage(`${item.publicId}${project ? ` en ${project.name}` : ""}`);
      reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function discard() {
    if (!captureId) return;
    setLoading(true);
    try {
      await fetch(`/api/captures/${captureId}/discard`, { method: "POST" });
      reset();
    } finally {
      setLoading(false);
    }
  }

  const availableModules = modules.filter((m) => m.projectId === form.projectId);
  const confidencePct = interpretation ? Math.round((interpretation.confidence ?? 0) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border border-border bg-surface p-1 text-sm">
        <button
          type="button"
          className={clsx(
            "flex-1 rounded-md py-1.5 font-medium transition-colors",
            mode === "quick" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
          )}
          onClick={() => {
            setMode("quick");
            reset();
          }}
        >
          Rápida
        </button>
        <button
          type="button"
          disabled={!aiAvailable}
          className={clsx(
            "flex-1 rounded-md py-1.5 font-medium transition-colors",
            mode === "reviewed" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            !aiAvailable && "opacity-40"
          )}
          onClick={() => {
            setMode("reviewed");
            reset();
          }}
          title={!aiAvailable ? "Falta configurar GEMINI_API_KEY" : undefined}
        >
          Revisada (IA)
        </button>
      </div>

      {!interpretation && (
        <>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (mode === "quick") void submitQuick();
                else void submitInterpret();
              }
            }}
            placeholder="Escribí una idea, bug, tarea, nota o recordatorio…"
            rows={5}
            autoFocus
          />
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={loading || text.trim().length === 0}
            onClick={mode === "quick" ? submitQuick : submitInterpret}
          >
            {loading ? "Guardando…" : mode === "quick" ? "Guardar" : "Interpretar con IA"}
            <kbd className="ml-1 hidden rounded border border-accent-foreground/25 px-1 font-mono text-[10px] opacity-70 sm:inline-block">
              ⌘Enter
            </kbd>
          </Button>
        </>
      )}

      {interpretation && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Sugerencia de la IA</p>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                confidencePct >= 70
                  ? "bg-status-resolved/15 text-status-resolved"
                  : confidencePct >= 40
                    ? "bg-priority-high/15 text-priority-high"
                    : "bg-surface-sunken text-muted"
              )}
            >
              {confidencePct}% confianza
            </span>
          </div>

          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Título"
            aria-label="Título del item"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, moduleId: "" }))}
              aria-label="Proyecto"
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">Proyecto…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={form.moduleId}
              onChange={(e) => setForm((f) => ({ ...f, moduleId: e.target.value }))}
              aria-label="Módulo"
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
            >
              <option value="">Sin módulo</option>
              {availableModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              aria-label="Tipo"
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
            >
              {Object.entries(typeLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              aria-label="Prioridad"
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
            >
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="primary" className="flex-1" onClick={confirm} disabled={loading}>
              Confirmar
            </Button>
            <Button type="button" variant="secondary" onClick={reinterpret} disabled={loading}>
              Reinterpretar
            </Button>
            <Button type="button" variant="danger" onClick={discard} disabled={loading}>
              Descartar
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {successMessage && (
          <p className="flex items-center gap-1.5 text-sm text-status-resolved">
            <CheckCircle2 size={15} strokeWidth={2.25} />
            Guardado como {successMessage}
          </p>
        )}
        {errorMessage && <p className="text-sm text-priority-critical">{errorMessage}</p>}
      </div>
    </div>
  );
}
