"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Send } from "lucide-react";

interface Project {
  id: string;
  name: string;
}
interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = ["¿Qué tengo pendiente?", "¿Qué cambió esta semana?", "¿Hay algo crítico sin resolver?"];

/** The model replies in Markdown-ish text (**bold**, "- " bullets) even though the
 * composer is plain text — render just enough of it so answers aren't full of raw
 * asterisks, without pulling in a Markdown parser for two symbols. */
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function MessageContent({ content }: { content: string }) {
  return (
    <>
      {content.split("\n").map((line, i) => {
        const trimmed = line.trimStart();
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (isBullet) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-muted">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </>
  );
}

export function ChatPanel({ projects, aiAvailable }: { projects: Project[]; aiAvailable: boolean }) {
  const [projectId, setProjectId] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMessage: Message = { role: "user", content };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
        aria-label="Contexto del proyecto"
        className="mb-3 self-start rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted focus-visible:outline-2 focus-visible:outline-accent"
      >
        <option value="">Preguntando sobre: todos los proyectos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            Preguntando sobre: {p.name}
          </option>
        ))}
      </select>

      <div ref={scrollRef} role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface p-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <MessageCircle size={22} strokeWidth={1.75} className="text-muted" />
            <p className="text-sm text-muted">Preguntá lo que necesites sobre tus proyectos.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx(
              "max-w-[85%] space-y-1 rounded-xl px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "ml-auto bg-accent text-accent-foreground" : "bg-surface-hover"
            )}
          >
            {m.role === "assistant" ? <MessageContent content={m.content} /> : m.content}
          </div>
        ))}
        {loading && (
          <div className="flex max-w-[85%] items-center gap-1.5 rounded-xl bg-surface-hover px-3 py-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" />
            Pensando…
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Escribí tu pregunta… (Shift+Enter para salto de línea)"
          rows={1}
          className="max-h-40 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-base text-foreground placeholder:text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
        />
        <Button type="button" variant="primary" onClick={() => void send()} disabled={loading || !input.trim()} aria-label="Enviar">
          <Send size={16} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}
