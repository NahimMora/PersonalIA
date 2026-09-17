import { auth } from "@/lib/auth";
import { discardCapture } from "@/lib/services/capture";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const session = await auth();
    await discardCapture(id, session?.user?.id);
    return { ok: true };
  });
}
