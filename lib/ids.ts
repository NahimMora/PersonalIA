import { randomUUID } from "crypto";
import type { ItemType, Prisma, PrismaClient } from "@prisma/client";

/**
 * Builds human-readable ids like "HS-BUG-0014".
 *
 * The counter lives in `item_sequences`, keyed by (projectId, itemType).
 * Prisma's `upsert()` on MySQL is NOT a single atomic statement (it does a
 * SELECT then INSERT/UPDATE), so under real concurrency two requests can both
 * see "no row yet" and both try to INSERT, and one loses with a unique
 * constraint error instead of blocking safely (confirmed by the concurrency
 * test in tests/items.integration.test.ts once we moved from Postgres to
 * MySQL). Raw `INSERT ... ON DUPLICATE KEY UPDATE ... LAST_INSERT_ID(...)` is
 * MySQL's actual atomic upsert-and-return-the-new-value primitive, so we use
 * that instead — see docs/DECISIONS.md.
 */
export async function nextItemPublicId(
  tx: Prisma.TransactionClient | PrismaClient,
  projectId: string,
  projectCode: string,
  itemType: ItemType
): Promise<string> {
  // LAST_INSERT_ID(1) on the INSERT branch (not just the UPDATE branch) is
  // required too — this table's `id` isn't AUTO_INCREMENT, so without it
  // LAST_INSERT_ID() would stay whatever a previous, unrelated query left it
  // at on the very first row for a given (project, type).
  await tx.$executeRaw`
    INSERT INTO item_sequences (id, projectId, itemType, lastValue)
    VALUES (${randomUUID()}, ${projectId}, ${itemType}, LAST_INSERT_ID(1))
    ON DUPLICATE KEY UPDATE lastValue = LAST_INSERT_ID(lastValue + 1)
  `;
  const rows = await tx.$queryRaw<{ v: bigint }[]>`SELECT LAST_INSERT_ID() as v`;
  const lastValue = Number(rows[0].v);

  const padded = String(lastValue).padStart(4, "0");
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
