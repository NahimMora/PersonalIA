import { auth } from "@/lib/auth";
import { getCurrentActivity } from "@/lib/services/activities";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const activity = await getCurrentActivity();
    return { activity };
  });
}
