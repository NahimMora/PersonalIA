import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateApiToken } from "@/lib/shortcuts-auth";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    return prisma.apiToken.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, scope: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  });
}

const createTokenSchema = z.object({ name: z.string().min(1).max(80) });

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const { name } = createTokenSchema.parse(await request.json());

    const { token, tokenHash } = generateApiToken();
    const record = await prisma.apiToken.create({
      data: { userId: session.user.id, name, tokenHash },
    });
    await recordAudit({ actorUserId: session.user.id, action: "token.created", entityType: "ApiToken", entityId: record.id });

    // The plaintext token is only ever shown here, once.
    return NextResponse.json({ id: record.id, name: record.name, token }, { status: 201 });
  });
}
