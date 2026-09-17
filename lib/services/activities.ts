import type { ItemSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

/**
 * Policy (see docs/DECISIONS.md): at most one active activity session at a
 * time. Starting a new one auto-closes whatever was still running — simpler
 * than tracking parallel sessions, and matches how a single person actually
 * works (you're not "programming" and "in a meeting" simultaneously in a way
 * worth measuring separately).
 */
export async function startActivity(input: {
  projectId: string;
  moduleId?: string;
  label?: string;
  source: ItemSource;
}) {
  const current = await getCurrentActivity();
  if (current) {
    await stopActivity(current.id);
  }

  const activity = await prisma.activitySession.create({
    data: {
      projectId: input.projectId,
      moduleId: input.moduleId,
      label: input.label,
      source: input.source,
    },
  });

  await recordAudit({ action: "activity.started", entityType: "ActivitySession", entityId: activity.id });
  return activity;
}

export async function stopActivity(activityId?: string) {
  const activity = activityId
    ? await prisma.activitySession.findUnique({ where: { id: activityId } })
    : await getCurrentActivity();

  if (!activity || activity.endedAt) return null;

  const endedAt = new Date();
  const durationSeconds = Math.round((endedAt.getTime() - activity.startedAt.getTime()) / 1000);

  const updated = await prisma.activitySession.update({
    where: { id: activity.id },
    data: { endedAt, durationSeconds },
  });

  await recordAudit({ action: "activity.stopped", entityType: "ActivitySession", entityId: activity.id, metadata: { durationSeconds } });
  return updated;
}

export function getCurrentActivity() {
  return prisma.activitySession.findFirst({ where: { endedAt: null }, orderBy: { startedAt: "desc" }, include: { project: true, module: true } });
}
