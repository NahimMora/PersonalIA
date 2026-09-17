import type { ItemSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createQuickEvent(input: {
  eventType: string;
  value?: number;
  unit?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  source: ItemSource;
}) {
  return prisma.quickEvent.create({
    data: {
      eventType: input.eventType,
      value: input.value,
      unit: input.unit,
      projectId: input.projectId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      source: input.source,
    },
  });
}
