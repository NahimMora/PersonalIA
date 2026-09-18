import Link from "next/link";
import { notFound } from "next/navigation";
import { clsx } from "clsx";
import { prisma } from "@/lib/db";
import { ItemStatus, ItemType } from "@prisma/client";
import { ItemRow } from "@/components/ItemRow";

const TABS = [
  { key: "pendientes", label: "Pendientes" },
  { key: "ideas", label: "Ideas" },
  { key: "incidentes", label: "Incidentes" },
  { key: "backlog", label: "Backlog" },
  { key: "documentacion", label: "Documentación" },
  { key: "historial", label: "Historial" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.find((t) => t.key === tabParam)?.key ?? "pendientes") as TabKey;

  const project = await prisma.project.findFirst({ where: { OR: [{ slug }, { id: slug }] }, include: { modules: true } });
  if (!project) notFound();

  const items = await loadTabItems(project.id, tab);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && <p className="text-sm text-muted">{project.description}</p>}
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-lg border border-border bg-surface p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/proyectos/${slug}?tab=${t.key}`}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                tab === t.key ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-hover"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {tab === "documentacion" ? (
        <ProjectDocs projectId={project.id} />
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">Nada acá.</p>
          ) : (
            items.map((item) => (
              <ItemRow
                key={item.id}
                id={item.id}
                publicId={item.publicId}
                title={item.title}
                type={item.type}
                priority={item.priority}
                moduleName={item.module?.name}
                createdAt={item.createdAt.toISOString()}
                showActions={tab !== "historial"}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

async function loadTabItems(projectId: string, tab: TabKey) {
  const activeStatus = { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] };

  switch (tab) {
    case "pendientes":
      return prisma.item.findMany({
        where: { projectId, status: activeStatus, type: { notIn: [ItemType.IDEA, ItemType.INCIDENT, ItemType.BACKLOG] } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: { module: true },
      });
    case "ideas":
      return prisma.item.findMany({ where: { projectId, status: activeStatus, type: ItemType.IDEA }, orderBy: { createdAt: "desc" }, include: { module: true } });
    case "incidentes":
      return prisma.item.findMany({ where: { projectId, status: activeStatus, type: ItemType.INCIDENT }, orderBy: { createdAt: "desc" }, include: { module: true } });
    case "backlog":
      return prisma.item.findMany({ where: { projectId, status: activeStatus, type: ItemType.BACKLOG }, orderBy: { createdAt: "desc" }, include: { module: true } });
    case "historial":
      return prisma.item.findMany({
        where: { projectId, status: { in: [ItemStatus.RESOLVED, ItemStatus.DISCARDED] } },
        orderBy: [{ resolvedAt: "desc" }, { discardedAt: "desc" }],
        take: 150,
        include: { module: true },
      });
    default:
      return [];
  }
}

async function ProjectDocs({ projectId }: { projectId: string }) {
  const documents = await prisma.repositoryDocument.findMany({
    where: { repository: { projectId } },
    include: { repository: true },
    orderBy: { path: "asc" },
  });

  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Sin documentación sincronizada todavía. Conectá un repositorio en Ajustes → Repositorios.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface divide-y divide-border">
      {documents.map((doc) => (
        <a
          key={doc.id}
          href={`https://github.com/${doc.repository.owner}/${doc.repository.name}/blob/${doc.repository.defaultBranch}/${doc.path}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-hover"
        >
          <span>{doc.path}</span>
          <span className="text-xs text-muted">{doc.docType}</span>
        </a>
      ))}
    </div>
  );
}
