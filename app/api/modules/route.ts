import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createModuleSchema } from "@/lib/validation";
import { slugify } from "@/lib/ids";
import { handleRoute, jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    if (!session?.user?.id) return jsonError("unauthorized", 401);
    const body = createModuleSchema.parse(await request.json());
    const createdModule = await prisma.module.create({
      data: { projectId: body.projectId, name: body.name, slug: slugify(body.name) },
    });
    return NextResponse.json(createdModule, { status: 201 });
  });
}
