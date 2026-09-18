import Link from "next/link";
import { prisma } from "@/lib/db";
import { ItemPriority, ItemStatus, ItemType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { priorityColorVar, priorityLabel, countLabel } from "@/lib/ui-maps";
import { AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const [projects, attention] = await Promise.all([
    prisma.project.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      include: {
        items: {
          where: { status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 3,
        },
      },
    }),
    // Cross-project, so "what needs attention today" doesn't depend on
    // remembering which project it was in.
    prisma.item.findMany({
      where: {
        status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] },
        priority: { in: [ItemPriority.CRITICAL, ItemPriority.HIGH] },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { project: true },
    }),
  ]);

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
  const allCaughtUp = withWork.every((p) => p.pending + p.ideas + p.incidents === 0) && attention.length === 0;

  return (
    <div className="space-y-8">
      {attention.length > 0 && (
        <section>
          <h2 className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-priority-critical">
            <AlertTriangle size={15} strokeWidth={2.25} />
            Necesita atención
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {attention.map((item) => (
              <Link
                key={item.id}
                href={`/proyectos/${item.project.slug}`}
                className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm last:border-0 hover:bg-surface-hover"
              >
                <Badge colorVar={priorityColorVar[item.priority]}>{priorityLabel[item.priority]}</Badge>
                <span className="shrink-0 font-mono text-[11px] text-muted">{item.publicId}</span>
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="shrink-0 text-xs text-muted">{item.project.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">Proyectos</h1>

        {allCaughtUp && (
          <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
            Todo al día. Usá <span className="font-medium text-foreground">Capturar</span> para agregar algo nuevo.
          </p>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {withWork.map((project) => (
            <Link
              key={project.id}
              href={`/proyectos/${project.slug}`}
              className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-medium">{project.name}</h2>
                <span className="font-mono text-xs text-muted">{project.code}</span>
              </div>
              <div className="mb-3 flex gap-3 text-xs text-muted">
                <span>{countLabel(project.pending, "pendiente", "pendientes")}</span>
                <span>{countLabel(project.ideas, "idea", "ideas")}</span>
                {project.incidents > 0 && (
                  <span className="text-priority-critical">{countLabel(project.incidents, "incidente", "incidentes")}</span>
                )}
              </div>
              {project.items.length > 0 && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  {project.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <Badge colorVar={priorityColorVar[item.priority]}>{priorityLabel[item.priority]}</Badge>
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {empty.length > 0 && (
        <details className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <summary className="cursor-pointer select-none">
            {empty.length} proyecto{empty.length === 1 ? "" : "s"} sin pendientes
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
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
