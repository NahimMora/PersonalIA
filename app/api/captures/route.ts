import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { captureQuickSchema } from "@/lib/validation";
import { quickCapture } from "@/lib/services/capture";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import type { ItemSource } from "@prisma/client";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = captureQuickSchema.parse(await request.json());
    const result = await quickCapture({ text: body.text, source: body.source as ItemSource });
    return NextResponse.json(result, { status: 201 });
  });
}
