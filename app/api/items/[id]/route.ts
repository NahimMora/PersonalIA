import { auth } from "@/lib/auth";
import { patchItemSchema } from "@/lib/validation";
import { patchItem } from "@/lib/services/items";
import { handleRoute } from "@/lib/api-helpers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const session = await auth();
    const body = patchItemSchema.parse(await request.json());
    return patchItem(id, body, session?.user?.id);
  });
}
