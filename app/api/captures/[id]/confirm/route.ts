import { auth } from "@/lib/auth";
import { captureConfirmSchema } from "@/lib/validation";
import { confirmCapture } from "@/lib/services/capture";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const { id } = await params;
    const body = captureConfirmSchema.parse(await request.json());
    return confirmCapture(id, body, session.user.id);
  });
}
