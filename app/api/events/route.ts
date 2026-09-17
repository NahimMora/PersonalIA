import { NextResponse } from "next/server";
import { quickEventSchema } from "@/lib/validation";
import { createQuickEvent } from "@/lib/services/events";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = quickEventSchema.parse(await request.json());
    const event = await createQuickEvent({ ...body, source: "USER_CAPTURE" });
    return NextResponse.json(event, { status: 201 });
  });
}
