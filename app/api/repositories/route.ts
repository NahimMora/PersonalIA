import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRepositorySchema } from "@/lib/validation";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";

export async function GET() {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    return prisma.repository.findMany({
      include: { project: true, _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = createRepositorySchema.parse(await request.json());
    const repository = await prisma.repository.create({ data: body });
    await recordAudit({ actorUserId: session.user.id, action: "repository.created", entityType: "Repository", entityId: repository.id });
    return NextResponse.json(repository, { status: 201 });
  });
}
