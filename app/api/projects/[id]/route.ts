import { prisma } from "@/lib/db";
import { handleRoute, jsonError } from "@/lib/api-helpers";
import { ItemStatus } from "@prisma/client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { modules: { orderBy: { name: "asc" } } },
    });
    if (!project) return jsonError("Proyecto no encontrado", 404);

    const [pending, ideas, incidents, backlog, resolved, discarded] = await Promise.all([
      prisma.item.findMany({ where: { projectId: project.id, status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] }, type: { notIn: ["IDEA", "INCIDENT", "BACKLOG"] } }, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], include: { module: true } }),
      prisma.item.findMany({ where: { projectId: project.id, type: "IDEA", status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } }, orderBy: { createdAt: "desc" }, include: { module: true } }),
      prisma.item.findMany({ where: { projectId: project.id, type: "INCIDENT", status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } }, orderBy: { createdAt: "desc" }, include: { module: true } }),
      prisma.item.findMany({ where: { projectId: project.id, type: "BACKLOG", status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } }, orderBy: { createdAt: "desc" }, include: { module: true } }),
      prisma.item.findMany({ where: { projectId: project.id, status: ItemStatus.RESOLVED }, orderBy: { resolvedAt: "desc" }, take: 100, include: { module: true } }),
      prisma.item.findMany({ where: { projectId: project.id, status: ItemStatus.DISCARDED }, orderBy: { discardedAt: "desc" }, take: 100, include: { module: true } }),
    ]);

    return { project, pending, ideas, incidents, backlog, resolved, discarded };
  });
}
