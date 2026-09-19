import { CaptureMode, CaptureStatus, ItemPriority, ItemType, type ItemSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { classifyDeterministic } from "@/lib/classify";
import { ai, isAIConfigured } from "@/lib/ai";
import { createItem } from "@/lib/services/items";
import { getOrCreateInboxProject } from "@/lib/services/projects";
import { recordAudit } from "@/lib/audit";

/**
 * Quick capture: no AI, no review step. Resolves project via configured
 * aliases only (instant, free) and falls back to Inbox. Always type=NOTE —
 * the point is speed; reclassify later from the dashboard if needed.
 */
export async function quickCapture(input: { text: string; source: ItemSource }) {
  const capture = await prisma.capture.create({
    data: { rawText: input.text, mode: CaptureMode.QUICK, status: CaptureStatus.CONFIRMED, source: input.source },
  });

  const match = await classifyDeterministic(input.text);
  const project = match.projectId
    ? await prisma.project.findUnique({ where: { id: match.projectId } })
    : await getOrCreateInboxProject();

  const item = await createItem({
    projectId: (project ?? (await getOrCreateInboxProject())).id,
    moduleId: match.moduleId,
    type: ItemType.NOTE,
    title: input.text.slice(0, 120),
    description: input.text.length > 120 ? input.text : undefined,
    priority: ItemPriority.MEDIUM,
    source: input.source,
  });

  await prisma.capture.update({ where: { id: capture.id }, data: { resultItemId: item.id } });

  return { capture, item };
}

/**
 * Reviewed capture, step 1: ask the AI to interpret the text and return a
 * suggestion. Nothing is saved as an Item yet — the caller must confirm.
 */
export async function interpretCapture(text: string) {
  const capture = await prisma.capture.create({
    data: { rawText: text, mode: CaptureMode.REVIEWED, status: CaptureStatus.PENDING_REVIEW },
  });

  if (!isAIConfigured()) {
    return { capture, interpretation: null, aiAvailable: false as const };
  }

  const [projects, modules] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true, code: true } }),
    prisma.module.findMany({ select: { id: true, projectId: true, name: true } }),
  ]);

  const suggestion = await ai.classifyCapture({ text, projects, modules });

  const interpretation = await prisma.aIInterpretation.create({
    data: {
      captureId: capture.id,
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      suggestedProjectId: suggestion.projectId,
      suggestedModuleId: suggestion.moduleId,
      suggestedType: suggestion.type,
      suggestedPriority: suggestion.priority,
      suggestedTitle: suggestion.title,
      confidence: suggestion.confidence,
    },
  });

  return { capture, interpretation, aiAvailable: true as const };
}

export async function reinterpretCapture(captureId: string) {
  const capture = await prisma.capture.findUniqueOrThrow({ where: { id: captureId } });
  return interpretCaptureExisting(capture.id, capture.rawText);
}

async function interpretCaptureExisting(captureId: string, text: string) {
  const [projects, modules] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true, code: true } }),
    prisma.module.findMany({ select: { id: true, projectId: true, name: true } }),
  ]);

  const suggestion = await ai.classifyCapture({ text, projects, modules });

  return prisma.aIInterpretation.create({
    data: {
      captureId,
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      suggestedProjectId: suggestion.projectId,
      suggestedModuleId: suggestion.moduleId,
      suggestedType: suggestion.type,
      suggestedPriority: suggestion.priority,
      suggestedTitle: suggestion.title,
      confidence: suggestion.confidence,
    },
  });
}

export async function confirmCapture(
  captureId: string,
  fields: {
    projectId: string;
    moduleId?: string | null;
    type: ItemType;
    priority: ItemPriority;
    title: string;
    description?: string;
  },
  actorUserId?: string,
  source: ItemSource = "USER_CAPTURE"
) {
  const item = await createItem({ ...fields, source, actorUserId });

  await prisma.capture.update({
    where: { id: captureId },
    data: { status: CaptureStatus.CONFIRMED, resultItemId: item.id },
  });

  return item;
}

/**
 * Shortcuts-only: classify with AI and confirm immediately, no human review
 * step in between — Shortcuts/Siri has no UI to show a suggestion for
 * approval before saving. Falls back to Inbox/NOTE/MEDIUM (same defaults as
 * quickCapture) for whatever the AI didn't confidently suggest, since
 * there's nobody there to fill the gaps by hand.
 */
export async function interpretAndAutoConfirm(text: string, actorUserId?: string) {
  const { capture, interpretation, aiAvailable } = await interpretCapture(text);

  if (!aiAvailable || !interpretation) {
    throw new Error("La IA no está configurada (falta GEMINI_API_KEY).");
  }

  const project = interpretation.suggestedProjectId
    ? await prisma.project.findUnique({ where: { id: interpretation.suggestedProjectId } })
    : null;

  const item = await confirmCapture(
    capture.id,
    {
      projectId: (project ?? (await getOrCreateInboxProject())).id,
      moduleId: interpretation.suggestedModuleId,
      type: interpretation.suggestedType ?? ItemType.NOTE,
      priority: interpretation.suggestedPriority ?? ItemPriority.MEDIUM,
      title: interpretation.suggestedTitle ?? text.slice(0, 80),
      description: text.length > 120 ? text : undefined,
    },
    actorUserId,
    "IPHONE_SHORTCUT"
  );

  // confirmCapture() updated the row (status, resultItemId) — the `capture`
  // object above is the pre-confirm snapshot, so refetch before returning it.
  const confirmedCapture = await prisma.capture.findUniqueOrThrow({ where: { id: capture.id } });

  return { capture: confirmedCapture, item, interpretation };
}

export async function discardCapture(captureId: string, actorUserId?: string) {
  await prisma.capture.update({ where: { id: captureId }, data: { status: CaptureStatus.DISCARDED } });
  await recordAudit({ actorUserId, action: "capture.discarded", entityType: "Capture", entityId: captureId });
}
