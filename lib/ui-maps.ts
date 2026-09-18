import type { ItemPriority, ItemStatus, ItemType } from "@prisma/client";

export const priorityLabel: Record<ItemPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const priorityColorVar: Record<ItemPriority, string> = {
  LOW: "priority-low",
  MEDIUM: "priority-medium",
  HIGH: "priority-high",
  CRITICAL: "priority-critical",
};

export const statusLabel: Record<ItemStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En curso",
  RESOLVED: "Resuelto",
  DISCARDED: "Descartado",
};

export const statusColorVar: Record<ItemStatus, string> = {
  PENDING: "status-pending",
  IN_PROGRESS: "status-in-progress",
  RESOLVED: "status-resolved",
  DISCARDED: "status-discarded",
};

export const typeLabel: Record<ItemType, string> = {
  BUG: "Bug",
  IDEA: "Idea",
  TASK: "Tarea",
  NOTE: "Nota",
  IMPROVEMENT: "Mejora",
  INCIDENT: "Incidente",
  BACKLOG: "Backlog",
  RESEARCH: "Research",
  DECISION: "Decisión",
  REMINDER: "Recordatorio",
};

/** "1 pendiente" vs "3 pendientes" — count nouns pluralized correctly instead of always plural. */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `hace ${diffD} d`;
  return d.toLocaleDateString("es-AR");
}
