import { activityStopSchema } from "@/lib/validation";
import { stopActivity } from "@/lib/services/activities";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = activityStopSchema.parse(await request.json().catch(() => ({})));
    const activity = await stopActivity(body.activityId);
    if (!activity) return jsonError("No hay ninguna actividad en curso", 404);
    return activity;
  });
}
