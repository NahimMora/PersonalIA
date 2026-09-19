import { z } from "zod";
import { NextResponse } from "next/server";
import { verifyShortcutsRequest } from "@/lib/shortcuts-auth";
import { quickCapture, interpretAndAutoConfirm } from "@/lib/services/capture";
import { startActivity, stopActivity } from "@/lib/services/activities";
import { createQuickEvent } from "@/lib/services/events";
import { sendChatMessage } from "@/lib/services/chat";
import { listItems, patchItem } from "@/lib/services/items";
import { prisma } from "@/lib/db";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { ItemStatus } from "@prisma/client";

// Single entry point for Apple Shortcuts / NFC automations, and now also for
// Claude Code sessions working in other repos (see docs/SHORTCUTS_FUTURE.md
// and docs/CROSS_REPO_AGENTS.md). One bearer token, one URL, dispatched by
// `action` so new callers can grow new buttons without the app needing new
// endpoints or new auth setup.
const shortcutRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("capture"),
    content: z.string().min(1).max(5000),
    mode: z.enum(["quick", "interpret"]).default("quick"),
    projectCode: z.string().optional(),
    moduleSlug: z.string().optional(),
  }),
  z.object({ action: z.literal("activity_start"), projectCode: z.string(), moduleSlug: z.string().optional(), label: z.string().optional() }),
  z.object({ action: z.literal("activity_stop") }),
  z.object({ action: z.literal("event"), eventType: z.string(), value: z.number().optional(), unit: z.string().optional(), projectCode: z.string().optional() }),
  z.object({ action: z.literal("chat"), message: z.string().min(1).max(4000), projectCode: z.string().optional() }),
  z.object({
    action: z.literal("list_items"),
    projectCode: z.string(),
    moduleSlug: z.string().optional(),
    status: z.enum(["PENDING", "IN_PROGRESS", "ALL"]).default("PENDING"),
  }),
  z.object({ action: z.literal("resolve_item"), publicId: z.string() }),
]);

async function resolveProjectAndModule(projectCode: string, moduleSlug?: string) {
  const project = await prisma.project.findUnique({ where: { code: projectCode.toUpperCase() } });
  if (!project) return { project: null, moduleRecord: null };
  const moduleRecord = moduleSlug
    ? await prisma.module.findUnique({ where: { projectId_slug: { projectId: project.id, slug: moduleSlug } } })
    : null;
  return { project, moduleRecord };
}

export async function POST(request: Request) {
  const apiToken = await verifyShortcutsRequest(request);
  if (!apiToken) return jsonError("unauthorized", 401);

  return handleRoute(async () => {
    const body = shortcutRequestSchema.parse(await request.json());

    switch (body.action) {
      case "capture": {
        let override: { projectId?: string; moduleId?: string } | undefined;
        if (body.projectCode) {
          const { project, moduleRecord } = await resolveProjectAndModule(body.projectCode, body.moduleSlug);
          if (!project) return jsonError(`Proyecto "${body.projectCode}" no encontrado`, 404);
          override = { projectId: project.id, moduleId: moduleRecord?.id };
        }

        if (body.mode === "interpret") {
          const result = await interpretAndAutoConfirm(body.content, apiToken.userId, override);
          return NextResponse.json(result, { status: 201 });
        }
        const result = await quickCapture({ text: body.content, source: "IPHONE_SHORTCUT", projectId: override?.projectId, moduleId: override?.moduleId });
        return NextResponse.json(result, { status: 201 });
      }
      case "activity_start": {
        const project = await prisma.project.findUnique({ where: { code: body.projectCode.toUpperCase() } });
        if (!project) return jsonError(`Proyecto "${body.projectCode}" no encontrado`, 404);
        const targetModule = body.moduleSlug
          ? await prisma.module.findUnique({ where: { projectId_slug: { projectId: project.id, slug: body.moduleSlug } } })
          : null;
        const activity = await startActivity({ projectId: project.id, moduleId: targetModule?.id, label: body.label, source: "IPHONE_SHORTCUT" });
        return NextResponse.json(activity, { status: 201 });
      }
      case "activity_stop": {
        const activity = await stopActivity();
        if (!activity) return jsonError("No hay ninguna actividad en curso", 404);
        return activity;
      }
      case "event": {
        const project = body.projectCode
          ? await prisma.project.findUnique({ where: { code: body.projectCode.toUpperCase() } })
          : null;
        const event = await createQuickEvent({
          eventType: body.eventType,
          value: body.value,
          unit: body.unit,
          projectId: project?.id,
          source: "IPHONE_SHORTCUT",
        });
        return NextResponse.json(event, { status: 201 });
      }
      case "chat": {
        const project = body.projectCode
          ? await prisma.project.findUnique({ where: { code: body.projectCode.toUpperCase() } })
          : null;
        return sendChatMessage({ userId: apiToken.userId, projectId: project?.id, message: body.message, voice: true });
      }
      case "list_items": {
        const { project, moduleRecord } = await resolveProjectAndModule(body.projectCode, body.moduleSlug);
        if (!project) return jsonError(`Proyecto "${body.projectCode}" no encontrado`, 404);
        const items = await listItems({
          projectId: project.id,
          moduleId: moduleRecord?.id,
          status: body.status === "ALL" ? undefined : body.status === "IN_PROGRESS" ? ItemStatus.IN_PROGRESS : [ItemStatus.PENDING, ItemStatus.IN_PROGRESS],
        });
        return { items };
      }
      case "resolve_item": {
        const item = await prisma.item.findUnique({ where: { publicId: body.publicId.toUpperCase() } });
        if (!item) return jsonError(`Item "${body.publicId}" no encontrado`, 404);
        const updated = await patchItem(item.id, { status: ItemStatus.RESOLVED }, apiToken.userId);
        return updated;
      }
    }
  });
}
