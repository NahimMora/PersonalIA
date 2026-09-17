import type { ItemType, Prisma, PrismaClient } from "@prisma/client";

/**
 * Builds human-readable ids like "HS-BUG-0014".
 *
 * The counter lives in `item_sequences`, keyed by (projectId, itemType), and is
 * incremented inside the same transaction that creates the Item so two
 * concurrent captures can never collide on the same number (upsert + atomic
 * increment is race-safe under Postgres' default read-committed isolation
 * because the upsert itself takes a row lock).
 */
export async function nextItemPublicId(
  tx: Prisma.TransactionClient | PrismaClient,
  projectId: string,
  projectCode: string,
  itemType: ItemType
): Promise<string> {
  const sequence = await tx.itemSequence.upsert({
    where: { projectId_itemType: { projectId, itemType } },
    create: { projectId, itemType, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  const padded = String(sequence.lastValue).padStart(4, "0");
  return `${projectCode}-${itemType}-${padded}`;
}

/** Normalizes a free-form project name into a short, uppercase code (e.g. "HolaSalta" -> "HS"). */
export function suggestProjectCode(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
