import { auth } from "@/lib/auth";
import { captureConfirmSchema } from "@/lib/validation";
import { confirmCapture } from "@/lib/services/capture";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const session = await auth();
    const body = captureConfirmSchema.parse(await request.json());
    return confirmCapture(id, body, session?.user?.id);
  });
}
