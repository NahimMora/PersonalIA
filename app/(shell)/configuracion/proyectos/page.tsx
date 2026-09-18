import { prisma } from "@/lib/db";
import { getOrCreateDefaultWorkspace } from "@/lib/services/projects";
import { ProjectForm } from "@/components/ProjectForm";
import { ModuleForm } from "@/components/ModuleForm";

export default async function ProjectsSettingsPage() {
  const workspace = await getOrCreateDefaultWorkspace();
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: { modules: { orderBy: { name: "asc" } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Proyectos y módulos</h1>
      <ProjectForm workspaceId={workspace.id} />

      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">{project.name}</p>
              <span className="font-mono text-xs text-muted">{project.code}</span>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {project.modules.map((m) => (
                <span key={m.id} className="rounded-full border border-border px-2 py-0.5 text-xs">
                  {m.name}
                </span>
              ))}
            </div>
            <ModuleForm projectId={project.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
