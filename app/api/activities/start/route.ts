import { NextResponse } from "next/server";
import { activityStartSchema } from "@/lib/validation";
import { startActivity } from "@/lib/services/activities";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = activityStartSchema.parse(await request.json());
    const activity = await startActivity({ ...body, source: "USER_CAPTURE" });
    return NextResponse.json(activity, { status: 201 });
  });
}
