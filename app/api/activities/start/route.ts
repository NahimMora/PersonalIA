import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { activityStartSchema } from "@/lib/validation";
import { startActivity } from "@/lib/services/activities";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = activityStartSchema.parse(await request.json());
    const activity = await startActivity({ ...body, source: "USER_CAPTURE" });
    return NextResponse.json(activity, { status: 201 });
  });
}
