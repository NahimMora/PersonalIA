"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Global shortcuts: ⌘K/Ctrl+K → Buscar, "c" → Capturar (only when not typing).
 * Kept intentionally small — discoverable via the sidebar's own kbd hints,
 * not a hidden pile of shortcuts nobody remembers.
 */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/buscar");
        return;
      }
      if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        router.push("/capturar");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return null;
}
