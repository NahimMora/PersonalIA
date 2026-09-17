import { getCurrentActivity } from "@/lib/services/activities";
import { handleRoute } from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const activity = await getCurrentActivity();
    return { activity };
  });
}
