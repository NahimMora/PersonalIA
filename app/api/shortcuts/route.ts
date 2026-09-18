import { z } from "zod";
import { NextResponse } from "next/server";
import { verifyShortcutsRequest } from "@/lib/shortcuts-auth";
import { quickCapture, interpretCapture } from "@/lib/services/capture";
import { startActivity, stopActivity } from "@/lib/services/activities";
import { createQuickEvent } from "@/lib/services/events";
import { sendChatMessage } from "@/lib/services/chat";
import { prisma } from "@/lib/db";
import { handleRoute, jsonError } from "@/lib/api-helpers";

// Single entry point for Apple Shortcuts / NFC automations (see
// docs/SHORTCUTS_FUTURE.md). One bearer token, one URL, dispatched by
// `action` so a single "Personal AI" Shortcut can grow new buttons without
// the app needing new endpoints or the Shortcut needing new auth setup.
const shortcutRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("capture"), content: z.string().min(1).max(5000), mode: z.enum(["quick", "interpret"]).default("quick") }),
  z.object({ action: z.literal("activity_start"), projectCode: z.string(), moduleSlug: z.string().optional(), label: z.string().optional() }),
  z.object({ action: z.literal("activity_stop") }),
  z.object({ action: z.literal("event"), eventType: z.string(), value: z.number().optional(), unit: z.string().optional(), projectCode: z.string().optional() }),
  z.object({ action: z.literal("chat"), message: z.string().min(1).max(4000), projectCode: z.string().optional() }),
]);

export async function POST(request: Request) {
  const apiToken = await verifyShortcutsRequest(request);
  if (!apiToken) return jsonError("unauthorized", 401);

  return handleRoute(async () => {
    const body = shortcutRequestSchema.parse(await request.json());

    switch (body.action) {
      case "capture": {
        if (body.mode === "interpret") {
          const result = await interpretCapture(body.content);
          return NextResponse.json(result, { status: 201 });
        }
        const result = await quickCapture({ text: body.content, source: "IPHONE_SHORTCUT" });
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
    }
  });
}
