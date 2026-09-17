import { DocType, ItemType } from "@prisma/client";

export function classifyDocType(path: string): DocType {
  const base = path.split("/").pop()?.toUpperCase() ?? "";
  if (base === "README.MD") return DocType.README;
  if (base === "CLAUDE.MD") return DocType.CLAUDE_MD;
  if (base === "ARCHITECTURE.MD") return DocType.ARCHITECTURE;
  if (base === "BACKLOG.MD") return DocType.BACKLOG;
  if (base === "BUGS.MD") return DocType.BUGS;
  if (base === "INCIDENTS.MD") return DocType.INCIDENTS;
  if (base === "DECISIONS.MD") return DocType.DECISIONS;
  if (base === "ROADMAP.MD") return DocType.ROADMAP;
  if (base === "CHANGELOG.MD") return DocType.CHANGELOG;
  return DocType.OTHER;
}

const DOC_TYPE_TO_ITEM_TYPE: Partial<Record<DocType, ItemType>> = {
  [DocType.BUGS]: ItemType.BUG,
  [DocType.BACKLOG]: ItemType.BACKLOG,
  [DocType.INCIDENTS]: ItemType.INCIDENT,
  [DocType.DECISIONS]: ItemType.DECISION,
  [DocType.ROADMAP]: ItemType.IMPROVEMENT,
};

export interface ParsedDocItem {
  title: string;
  publicIdTag: string | null; // e.g. "HS-BUG-0012" if the line already references a known id
  itemType: ItemType;
}

/**
 * Extracts *pending* items from a structured doc using a deliberately simple
 * convention (documented in docs/GITHUB_INTEGRATION.md):
 *
 *   ## Pendientes | ## Pending
 *   - [ ] Title of the bug [OPTIONAL-ID-0001]
 *
 * Checked boxes (`- [x]`) and anything outside a "Pendientes/Pending" section
 * are ignored — resolved items are expected to move to CHANGELOG.md instead.
 * This is intentionally conservative: it never guesses at prose.
 */
export function parsePendingItemsFromDoc(docType: DocType, markdown: string): ParsedDocItem[] {
  const itemType = DOC_TYPE_TO_ITEM_TYPE[docType];
  if (!itemType) return [];

  const lines = markdown.split(/\r?\n/);
  const results: ParsedDocItem[] = [];
  let insidePendingSection = docType !== DocType.DECISIONS; // decisions have no pending/resolved split

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.*)$/);
    if (headingMatch) {
      const heading = headingMatch[1].toLowerCase();
      insidePendingSection = /pendient|pending|abiert|open/.test(heading);
      continue;
    }

    if (!insidePendingSection) continue;

    const checklistMatch = line.match(/^\s*-\s*\[ \]\s*(.+)$/);
    const bulletMatch = line.match(/^\s*-\s+(.+)$/);
    const raw = checklistMatch?.[1] ?? (docType === DocType.DECISIONS ? bulletMatch?.[1] : undefined);
    if (!raw) continue;

    const idTag = raw.match(/\[([A-Z]{2,6}-[A-Z]+-\d{4})\]/);
    const title = raw.replace(/\[([A-Z]{2,6}-[A-Z]+-\d{4})\]/, "").trim();

    if (title.length > 0) {
      results.push({ title: title.slice(0, 200), publicIdTag: idTag?.[1] ?? null, itemType });
    }
  }

  return results;
}
