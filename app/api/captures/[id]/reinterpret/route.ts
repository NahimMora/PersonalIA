import { NextResponse } from "next/server";
import { reinterpretCapture } from "@/lib/services/capture";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const interpretation = await reinterpretCapture(id);
    return NextResponse.json(interpretation, { status: 201 });
  });
}
