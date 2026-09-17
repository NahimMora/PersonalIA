import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createItem, patchItem } from "@/lib/services/items";
import { classifyDeterministic } from "@/lib/classify";
import { ItemPriority, ItemStatus, ItemType } from "@prisma/client";

// Integration tests against the real (local) Postgres — see docker-compose.yml.
// Everything created here lives under one throwaway workspace, deleted in
// afterAll via cascade, so it never pollutes real data.
const suffix = Date.now().toString(36);
let workspaceId: string;
let projectId: string;
let projectCode: string;

beforeAll(async () => {
  const workspace = await prisma.workspace.create({ data: { name: `Test WS ${suffix}`, slug: `test-ws-${suffix}` } });
  workspaceId = workspace.id;
  projectCode = `T${suffix.slice(-3).toUpperCase()}`;
  const project = await prisma.project.create({
    data: { workspaceId, name: `Test Project ${suffix}`, slug: `test-project-${suffix}`, code: projectCode },
  });
  projectId = project.id;
  await prisma.alias.create({ data: { term: `alias-${suffix}`, projectId } });
});

afterAll(async () => {
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await prisma.$disconnect();
});

describe("createItem / public ids", () => {
  it("builds ids as CODE-TYPE-0001 and increments per (project,type)", async () => {
    const first = await createItem({ projectId, type: ItemType.BUG, title: "Bug 1" });
    const second = await createItem({ projectId, type: ItemType.BUG, title: "Bug 2" });
    const otherType = await createItem({ projectId, type: ItemType.IDEA, title: "Idea 1" });

    expect(first.publicId).toBe(`${projectCode}-BUG-0001`);
    expect(second.publicId).toBe(`${projectCode}-BUG-0002`);
    expect(otherType.publicId).toBe(`${projectCode}-IDEA-0001`);
  });

  it("never reuses an id even after concurrent creation", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createItem({ projectId, type: ItemType.TASK, title: `Task ${i}` }))
    );
    const ids = results.map((r) => r.publicId);
    expect(new Set(ids).size).toBe(5);
  });
});

describe("patchItem status transitions", () => {
  it("sets resolvedAt when moving to RESOLVED and clears it when reopened", async () => {
    const item = await createItem({ projectId, type: ItemType.TASK, title: "Transition test" });

    const resolved = await patchItem(item.id, { status: ItemStatus.RESOLVED });
    expect(resolved.resolvedAt).not.toBeNull();

    const reopened = await patchItem(item.id, { status: ItemStatus.PENDING });
    expect(reopened.resolvedAt).toBeNull();
  });

  it("sets discardedAt when discarded", async () => {
    const item = await createItem({ projectId, type: ItemType.NOTE, title: "Discard test", priority: ItemPriority.LOW });
    const discarded = await patchItem(item.id, { status: ItemStatus.DISCARDED });
    expect(discarded.discardedAt).not.toBeNull();
  });
});

describe("classifyDeterministic", () => {
  it("resolves a project from a configured alias, case-insensitively and accent-insensitively", async () => {
    const result = await classifyDeterministic(`algo pasó en Alias-${suffix.toUpperCase()} ayer`);
    expect(result.projectId).toBe(projectId);
  });

  it("returns nulls when nothing matches", async () => {
    const result = await classifyDeterministic("texto totalmente random sin alias xk9z");
    expect(result.projectId).toBeNull();
  });
});
