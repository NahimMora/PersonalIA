"use client";

import { useState } from "react";
import { clsx } from "clsx";

interface Project {
  id: string;
  name: string;
}
interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel({ projects, aiAvailable }: { projects: Project[]; aiAvailable: boolean }) {
  const [projectId, setProjectId] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, projectId: projectId || undefined, conversationId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${error instanceof Error ? error.message : "desconocido"}` }]);
    } finally {
      setLoading(false);
    }
  }

  if (!aiAvailable) {
    return <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">Falta configurar GEMINI_API_KEY para habilitar el chat.</p>;
  }

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col">
      <select
        value={projectId}
        onChange={(e) => {
          setProjectId(e.target.value);
          setConversationId(undefined);
          setMessages([]);
        }}
        className="mb-3 rounded-lg border border-border bg-surface px-2 py-2 text-sm"
      >
        <option value="">Todos los proyectos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-3">
        {messages.length === 0 && <p className="text-sm text-muted">Preguntá, por ejemplo: &quot;¿Qué tengo pendiente?&quot;</p>}
        {messages.map((m, i) => (
          <div key={i} className={clsx("max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap", m.role === "user" ? "ml-auto bg-accent text-accent-foreground" : "bg-surface-hover")}>
            {m.content}
          </div>
        ))}
        {loading && <div className="max-w-[85%] rounded-xl bg-surface-hover px-3 py-2 text-sm text-muted">Pensando...</div>}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribí tu pregunta..."
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base focus:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
        />
        <button onClick={send} disabled={loading} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-40">
          Enviar
        </button>
      </div>
    </div>
  );
}
