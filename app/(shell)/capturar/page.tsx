import { prisma } from "@/lib/db";
import { CaptureForm } from "@/components/CaptureForm";
import { isAIConfigured } from "@/lib/ai";

export default async function CapturePage() {
  const [projects, modules] = await Promise.all([
    prisma.project.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.module.findMany({ orderBy: { name: "asc" }, select: { id: true, projectId: true, name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Capturar</h1>
      <CaptureForm projects={projects} modules={modules} aiAvailable={isAIConfigured()} />
    </div>
  );
}
