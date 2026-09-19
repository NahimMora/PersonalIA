import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { captureInterpretSchema } from "@/lib/validation";
import { interpretCapture } from "@/lib/services/capture";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = captureInterpretSchema.parse(await request.json());
    const result = await interpretCapture(body.text);
    return NextResponse.json(result, { status: 201 });
  });
}
