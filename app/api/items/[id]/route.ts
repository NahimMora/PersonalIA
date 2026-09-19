import { auth } from "@/lib/auth";
import { patchItemSchema } from "@/lib/validation";
import { patchItem } from "@/lib/services/items";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const { id } = await params;
    const body = patchItemSchema.parse(await request.json());
    return patchItem(id, body, session.user.id);
  });
}
