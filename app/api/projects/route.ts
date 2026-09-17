import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validation";
import { createProject } from "@/lib/services/projects";
import { handleRoute } from "@/lib/api-helpers";
import { recordAudit } from "@/lib/audit";
import { ItemStatus } from "@prisma/client";

export async function GET() {
  return handleRoute(async () => {
    const projects = await prisma.project.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { items: { where: { status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } } } },
        },
      },
    });
    return projects;
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    const body = createProjectSchema.parse(await request.json());
    const project = await createProject(body);
    await recordAudit({ actorUserId: session?.user?.id, action: "project.created", entityType: "Project", entityId: project.id });
    return NextResponse.json(project, { status: 201 });
  });
}
