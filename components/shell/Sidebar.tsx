import Link from "next/link";
import { Home, Search, MessageCircle, Settings, Plus, Circle } from "lucide-react";
import { prisma } from "@/lib/db";
import { NavLink } from "@/components/shell/NavLink";
import { ActivityStopButton } from "@/components/shell/ActivityStopButton";
import { getCurrentActivity } from "@/lib/services/activities";
import { relativeTime } from "@/lib/ui-maps";
import { ItemStatus } from "@prisma/client";

export async function Sidebar() {
  const [projects, activity] = await Promise.all([
    prisma.project.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { items: { where: { status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } } } },
        },
      },
    }),
    getCurrentActivity(),
  ]);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
            SC
          </span>
          Segundo Cerebro
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <Link
          href="/capturar"
          className="mb-4 flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus size={16} strokeWidth={2.5} />
          Capturar
          <kbd className="ml-auto hidden rounded border border-accent-foreground/25 px-1.5 py-0.5 font-mono text-[10px] opacity-80 lg:inline-block">
            C
          </kbd>
        </Link>

        <nav className="space-y-0.5">
          <NavLink href="/" label="Inicio" icon={<Home size={17} strokeWidth={2} />} exact />
          <NavLink href="/buscar" label="Buscar" icon={<Search size={17} strokeWidth={2} />} hint="⌘K" />
          <NavLink href="/chat" label="Chat" icon={<MessageCircle size={17} strokeWidth={2} />} />
        </nav>

        <div className="mt-5">
          <p className="px-2.5 text-xs font-medium text-muted">Proyectos</p>
          <nav className="mt-1.5 space-y-0.5">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/proyectos/${project.slug}`}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <Circle size={7} strokeWidth={0} className="shrink-0 fill-current opacity-40" />
                <span className="flex-1 truncate">{project.name}</span>
                {project._count.items > 0 && (
                  <span className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted">
                    {project._count.items}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="shrink-0 border-t border-border p-3">
        {activity && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-sunken px-2.5 py-2 text-xs">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-status-in-progress" />
            <span className="min-w-0 flex-1 truncate text-foreground">
              {activity.project.name}
              {activity.label ? ` · ${activity.label}` : ""}
            </span>
            <span className="shrink-0 text-muted">{relativeTime(activity.startedAt)}</span>
            <ActivityStopButton />
          </div>
        )}
        <NavLink href="/configuracion" label="Ajustes" icon={<Settings size={17} strokeWidth={2} />} />
      </div>
    </aside>
  );
}
