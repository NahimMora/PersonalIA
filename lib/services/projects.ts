import { prisma } from "@/lib/db";
import { slugify } from "@/lib/ids";

const INBOX_CODE = "INBOX";

/**
 * Every capture needs a project (the Item schema requires one). Anything the
 * deterministic classifier and the AI both fail to place lands here instead
 * of blocking the flow — the user re-files it later from the dashboard.
 */
export async function getOrCreateInboxProject() {
  const existing = await prisma.project.findUnique({ where: { code: INBOX_CODE } });
  if (existing) return existing;

  const workspace = await getOrCreateDefaultWorkspace();
  return prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Inbox",
      slug: "inbox",
      code: INBOX_CODE,
      description: "Capturas sin clasificar. Reasigná el proyecto correcto cuando puedas.",
    },
  });
}

export async function getOrCreateDefaultWorkspace() {
  const existing = await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;

  return prisma.workspace.create({ data: { name: "Workspace", slug: "workspace" } });
}

export async function createProject(input: { workspaceId: string; name: string; code: string; description?: string }) {
  return prisma.project.create({
    data: {
      workspaceId: input.workspaceId,
      name: input.name,
      slug: slugify(input.name),
      code: input.code.toUpperCase(),
      description: input.description,
    },
  });
}
