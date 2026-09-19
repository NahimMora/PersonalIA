import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reinterpretCapture } from "@/lib/services/capture";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const { id } = await params;
    const interpretation = await reinterpretCapture(id);
    return NextResponse.json(interpretation, { status: 201 });
  });
}
