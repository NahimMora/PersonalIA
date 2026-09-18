import { prisma } from "@/lib/db";
import { RepositoryManager } from "@/components/RepositoryManager";

export default async function RepositoriesPage() {
  const [repositories, projects] = await Promise.all([
    prisma.repository.findMany({
      include: { project: true, _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const serialized = repositories.map((r) => ({ ...r, lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Repositorios GitHub</h1>
      <RepositoryManager repositories={serialized} projects={projects} />
    </div>
  );
}
