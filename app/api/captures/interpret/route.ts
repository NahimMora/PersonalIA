import { NextResponse } from "next/server";
import { captureInterpretSchema } from "@/lib/validation";
import { interpretCapture } from "@/lib/services/capture";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = captureInterpretSchema.parse(await request.json());
    const result = await interpretCapture(body.text);
    return NextResponse.json(result, { status: 201 });
  });
}
