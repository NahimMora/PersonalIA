import { ItemPriority, ItemStatus, ItemType, type ItemSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { nextItemPublicId } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";

export interface ListItemsFilters {
  projectId?: string;
  moduleId?: string;
  status?: ItemStatus | ItemStatus[];
  type?: ItemType;
  priority?: ItemPriority;
  q?: string;
  limit?: number;
}

export async function listItems(filters: ListItemsFilters) {
  return prisma.item.findMany({
    where: {
      projectId: filters.projectId,
      moduleId: filters.moduleId,
      status: filters.status ? { in: Array.isArray(filters.status) ? filters.status : [filters.status] } : undefined,
      type: filters.type,
      priority: filters.priority,
      // MySQL's default collation (utf8mb4_*_ci) is already case-insensitive,
      // unlike Postgres — no `mode` option needed/available here.
      OR: filters.q
        ? [
            { title: { contains: filters.q } },
            { description: { contains: filters.q } },
            { publicId: { contains: filters.q } },
          ]
        : undefined,
    },
    include: { project: true, module: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: filters.limit ?? 200,
  });
}

export async function createItem(input: {
  projectId: string;
  moduleId?: string | null;
  type: ItemType;
  title: string;
  description?: string;
  priority?: ItemPriority;
  source?: ItemSource;
  actorUserId?: string;
}) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: input.projectId } });

  const item = await prisma.$transaction(async (tx) => {
    const publicId = await nextItemPublicId(tx, project.id, project.code, input.type);
    return tx.item.create({
      data: {
        publicId,
        projectId: project.id,
        moduleId: input.moduleId ?? null,
        type: input.type,
        title: input.title,
        description: input.description,
        priority: input.priority ?? ItemPriority.MEDIUM,
        source: input.source,
      },
    });
  });

  await recordAudit({
    actorUserId: input.actorUserId,
    action: "item.created",
    entityType: "Item",
    entityId: item.id,
    metadata: { publicId: item.publicId },
  });

  return item;
}

export async function patchItem(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    type?: ItemType;
    priority?: ItemPriority;
    status?: ItemStatus;
    moduleId?: string | null;
  },
  actorUserId?: string
) {
  const extra: { resolvedAt?: Date | null; discardedAt?: Date | null } = {};
  if (patch.status === ItemStatus.RESOLVED) extra.resolvedAt = new Date();
  if (patch.status === ItemStatus.DISCARDED) extra.discardedAt = new Date();
  if (patch.status === ItemStatus.PENDING || patch.status === ItemStatus.IN_PROGRESS) {
    extra.resolvedAt = null;
    extra.discardedAt = null;
  }

  const item = await prisma.item.update({ where: { id }, data: { ...patch, ...extra } });

  await recordAudit({
    actorUserId,
    action: patch.status ? `item.${patch.status.toLowerCase()}` : "item.updated",
    entityType: "Item",
    entityId: item.id,
    metadata: { publicId: item.publicId, patch },
  });

  return item;
}
