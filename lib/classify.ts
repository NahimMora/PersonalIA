import { prisma } from "@/lib/db";

export interface DeterministicClassification {
  projectId: string | null;
  moduleId: string | null;
  matchedTerm: string | null;
}

/**
 * Tries to resolve a project/module from configured aliases before ever
 * calling the AI. This keeps classification free and instant for anything
 * the user has already taught the system (see `aliases` table).
 */
export async function classifyDeterministic(rawText: string): Promise<DeterministicClassification> {
  const aliases = await prisma.alias.findMany({
    include: { project: true, module: true },
  });

  const normalized = normalize(rawText);

  // Longest alias term first, so "hola salta wordpress" matches a module alias
  // before falling back to the shorter project-only alias.
  const sorted = [...aliases].sort((a, b) => b.term.length - a.term.length);

  for (const alias of sorted) {
    const term = normalize(alias.term);
    if (term.length >= 2 && normalized.includes(term)) {
      return {
        projectId: alias.projectId ?? alias.module?.projectId ?? null,
        moduleId: alias.moduleId ?? null,
        matchedTerm: alias.term,
      };
    }
  }

  return { projectId: null, moduleId: null, matchedTerm: null };
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
