import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { quickEventSchema } from "@/lib/validation";
import { createQuickEvent } from "@/lib/services/events";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = quickEventSchema.parse(await request.json());
    const event = await createQuickEvent({ ...body, source: "USER_CAPTURE" });
    return NextResponse.json(event, { status: 201 });
  });
}
