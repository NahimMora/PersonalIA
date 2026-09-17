import { describe, expect, it } from "vitest";
import { classifyDocType, parsePendingItemsFromDoc } from "@/lib/github/docs-parser";
import { DocType, ItemType } from "@prisma/client";

describe("classifyDocType", () => {
  it("recognizes standard doc filenames", () => {
    expect(classifyDocType("BUGS.md")).toBe(DocType.BUGS);
    expect(classifyDocType("docs/BACKLOG.md")).toBe(DocType.BACKLOG);
    expect(classifyDocType("CLAUDE.md")).toBe(DocType.CLAUDE_MD);
    expect(classifyDocType("notes.md")).toBe(DocType.OTHER);
  });
});

describe("parsePendingItemsFromDoc", () => {
  it("extracts unchecked items from a Pendientes section only", () => {
    const markdown = `# Bugs

## Pendientes
- [ ] El boton de publicar no responde en mobile
- [x] Bug ya resuelto, no debería contar

## Resueltos
- [ ] Este no cuenta porque está fuera de Pendientes
`;
    const result = parsePendingItemsFromDoc(DocType.BUGS, markdown);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("El boton de publicar no responde en mobile");
    expect(result[0].itemType).toBe(ItemType.BUG);
  });

  it("captures an explicit id tag and strips it from the title", () => {
    const markdown = `## Pending\n- [ ] Something broken [HS-BUG-0012]`;
    const result = parsePendingItemsFromDoc(DocType.BUGS, markdown);
    expect(result[0].publicIdTag).toBe("HS-BUG-0012");
    expect(result[0].title).toBe("Something broken");
  });

  it("returns nothing for doc types with no item mapping", () => {
    expect(parsePendingItemsFromDoc(DocType.README, "## Pendientes\n- [ ] x")).toHaveLength(0);
  });
});
