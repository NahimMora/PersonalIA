import Link from "next/link";
import { prisma } from "@/lib/db";
import { ItemStatus, ItemType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { priorityColorVar, priorityLabel } from "@/lib/ui-maps";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    where: { archivedAt: null },
    orderBy: { name: "asc" },
    include: {
      items: {
        where: { status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 3,
      },
      _count: {
        select: {
          items: { where: { status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } } },
        },
      },
    },
  });

  const projectStats = await Promise.all(
    projects.map(async (project) => {
      const [pending, ideas, incidents] = await Promise.all([
        prisma.item.count({ where: { projectId: project.id, status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] }, type: { notIn: [ItemType.IDEA, ItemType.INCIDENT] } } }),
        prisma.item.count({ where: { projectId: project.id, status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] }, type: ItemType.IDEA } }),
        prisma.item.count({ where: { projectId: project.id, status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] }, type: ItemType.INCIDENT } }),
      ]);
      return { ...project, pending, ideas, incidents };
    })
  );

  const withWork = projectStats.filter((p) => p.pending + p.ideas + p.incidents > 0 || p.code === "INBOX");
  const empty = projectStats.filter((p) => !withWork.includes(p));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Proyectos</h1>

      {withWork.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Todo al día. Usá &quot;Capturar&quot; para agregar algo nuevo.
        </p>
      )}

      <div className="space-y-3">
        {withWork.map((project) => (
          <Link
            key={project.id}
            href={`/proyectos/${project.slug}`}
            className="block rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-hover"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">{project.name}</h2>
              <span className="font-mono text-xs text-muted">{project.code}</span>
            </div>
            <div className="mb-3 flex gap-3 text-xs text-muted">
              <span>{project.pending} pendientes</span>
              <span>{project.ideas} ideas</span>
              {project.incidents > 0 && <span className="text-priority-critical">{project.incidents} incidentes</span>}
            </div>
            <div className="space-y-1.5">
              {project.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <Badge colorVar={priorityColorVar[item.priority]}>{priorityLabel[item.priority]}</Badge>
                  <span className="truncate text-muted">{item.publicId}</span>
                  <span className="truncate">{item.title}</span>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {empty.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <summary className="cursor-pointer">{empty.length} proyecto(s) sin pendientes</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {empty.map((p) => (
              <Link key={p.id} href={`/proyectos/${p.slug}`} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-hover">
                {p.name}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
