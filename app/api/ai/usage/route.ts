import { prisma } from "@/lib/db";
import { handleRoute } from "@/lib/api-helpers";

export async function GET() {
  return handleRoute(async () => {
    const logs = await prisma.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    const totalCostUsd = logs.reduce((sum, l) => sum + (l.costEstimateUsd ?? 0), 0);
    const byOperation = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.operation] = (acc[l.operation] ?? 0) + 1;
      return acc;
    }, {});
    return { logs, totalCostUsd, byOperation, count: logs.length };
  });
}
