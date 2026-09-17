import { prisma } from "@/lib/db";
import { handleRoute } from "@/lib/api-helpers";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!q) return { items: [], projects: [] };

    const [items, projects] = await Promise.all([
      prisma.item.findMany({
        where: {
          OR: [
            { publicId: { equals: q.toUpperCase() } },
            { title: { contains: q } },
            { description: { contains: q } },
          ],
        },
        include: { project: true },
        take: 30,
      }),
      prisma.project.findMany({
        // MySQL's default collation (utf8mb4_*_ci) is already case-insensitive,
        // unlike Postgres — no `mode` option needed/available here.
        where: { OR: [{ name: { contains: q } }, { code: { equals: q.toUpperCase() } }] },
        take: 10,
      }),
    ]);

    return { items, projects };
  });
}
