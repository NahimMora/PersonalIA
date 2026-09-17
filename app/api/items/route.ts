import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createItemSchema } from "@/lib/validation";
import { listItems } from "@/lib/services/items";
import { createItem } from "@/lib/services/items";
import { handleRoute } from "@/lib/api-helpers";
import { ItemPriority, ItemStatus, ItemType } from "@prisma/client";

export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const items = await listItems({
      projectId: searchParams.get("projectId") ?? undefined,
      moduleId: searchParams.get("moduleId") ?? undefined,
      status: (searchParams.get("status") as ItemStatus | null) ?? undefined,
      type: (searchParams.get("type") as ItemType | null) ?? undefined,
      priority: (searchParams.get("priority") as ItemPriority | null) ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });
    return items;
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await auth();
    const body = createItemSchema.parse(await request.json());
    const item = await createItem({ ...body, source: "USER_CAPTURE", actorUserId: session?.user?.id });
    return NextResponse.json(item, { status: 201 });
  });
}
