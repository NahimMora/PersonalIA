import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createModuleSchema } from "@/lib/validation";
import { slugify } from "@/lib/ids";
import { handleRoute } from "@/lib/api-helpers";

export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = createModuleSchema.parse(await request.json());
    const createdModule = await prisma.module.create({
      data: { projectId: body.projectId, name: body.name, slug: slugify(body.name) },
    });
    return NextResponse.json(createdModule, { status: 201 });
  });
}
