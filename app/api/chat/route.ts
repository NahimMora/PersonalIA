import { auth } from "@/lib/auth";
import { chatSchema } from "@/lib/validation";
import { sendChatMessage } from "@/lib/services/chat";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = chatSchema.parse(await request.json());
    return sendChatMessage({ userId: session.user.id, conversationId: body.conversationId, projectId: body.projectId, message: body.message });
  });
}
