import { NextResponse } from "next/server";
import { captureQuickSchema } from "@/lib/validation";
import { quickCapture } from "@/lib/services/capture";
import { handleRoute } from "@/lib/api-helpers";
import type { ItemSource } from "@prisma/client";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = captureQuickSchema.parse(await request.json());
    const result = await quickCapture({ text: body.text, source: body.source as ItemSource });
    return NextResponse.json(result, { status: 201 });
  });
}
