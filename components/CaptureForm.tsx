"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { priorityLabel, typeLabel } from "@/lib/ui-maps";

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

  function reset() {
    setText("");
    setCaptureId(null);
    setInterpretation(null);
  }

  async function submitQuick() {
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
      setSuccessMessage(`Guardado como ${data.item.publicId}`);
      reset();
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function submitInterpret() {
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
      setSuccessMessage(`Guardado como ${item.publicId}`);
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

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-border bg-surface p-1 text-sm">
        <button
          className={clsx("flex-1 rounded-md py-1.5", mode === "quick" ? "bg-accent text-accent-foreground" : "text-muted")}
          onClick={() => {
            setMode("quick");
            reset();
          }}
        >
          Rápida
        </button>
        <button
          disabled={!aiAvailable}
          className={clsx(
            "flex-1 rounded-md py-1.5",
            mode === "reviewed" ? "bg-accent text-accent-foreground" : "text-muted",
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí una idea, bug, tarea, nota o recordatorio..."
            rows={5}
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent"
            autoFocus
          />
          <button
            disabled={loading || text.trim().length === 0}
            onClick={mode === "quick" ? submitQuick : submitInterpret}
            className="w-full rounded-lg bg-accent px-3 py-2.5 font-medium text-accent-foreground disabled:opacity-40"
          >
            {loading ? "Guardando..." : mode === "quick" ? "Guardar" : "Interpretar con IA"}
          </button>
        </>
      )}

      {interpretation && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-muted">
            Confianza de la IA: {Math.round((interpretation.confidence ?? 0) * 100)}%
          </p>

          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Título"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, moduleId: "" }))}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="">Proyecto...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={form.moduleId}
              onChange={(e) => setForm((f) => ({ ...f, moduleId: e.target.value }))}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
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
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
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
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
            >
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={confirm} disabled={loading} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40">
              Confirmar
            </button>
            <button onClick={reinterpret} disabled={loading} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-40">
              Reinterpretar
            </button>
            <button onClick={discard} disabled={loading} className="rounded-lg border border-border px-3 py-2 text-sm text-priority-critical disabled:opacity-40">
              Descartar
            </button>
          </div>
        </div>
      )}

      {successMessage && <p className="text-sm text-status-resolved">{successMessage}</p>}
      {errorMessage && <p className="text-sm text-priority-critical">{errorMessage}</p>}
    </div>
  );
}
