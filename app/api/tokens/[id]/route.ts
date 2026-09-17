import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);

    const token = await prisma.apiToken.findFirst({ where: { id, userId: session.user.id } });
    if (!token) return jsonError("Token no encontrado", 404);

    await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
    await recordAudit({ actorUserId: session.user.id, action: "token.revoked", entityType: "ApiToken", entityId: id });
    return { ok: true };
  });
}
