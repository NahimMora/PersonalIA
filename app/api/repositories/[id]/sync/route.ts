import { prisma } from "@/lib/db";
import { syncRepository } from "@/lib/github/sync";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { SyncTrigger } from "@prisma/client";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const repository = await prisma.repository.findUnique({ where: { id } });
    if (!repository) return jsonError("Repositorio no encontrado", 404);

    await syncRepository(repository, SyncTrigger.MANUAL);
    return prisma.repositorySync.findFirst({ where: { repositoryId: id }, orderBy: { startedAt: "desc" } });
  });
}
