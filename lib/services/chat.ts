import { ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ai } from "@/lib/ai";

const MAX_ITEMS_IN_CONTEXT = 40;

/**
 * Builds the context passed to the model with plain SQL — never the whole
 * database, never whole repositories. See docs/AI.md ("Chat contextual").
 */
async function buildContext(projectId?: string): Promise<string> {
  const project = projectId ? await prisma.project.findUnique({ where: { id: projectId } }) : null;

  const pending = await prisma.item.findMany({
    where: { projectId, status: { in: [ItemStatus.PENDING, ItemStatus.IN_PROGRESS] } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: MAX_ITEMS_IN_CONTEXT,
    include: { module: true },
  });

  const recentlyResolved = await prisma.item.findMany({
    where: { projectId, status: ItemStatus.RESOLVED },
    orderBy: { resolvedAt: "desc" },
    take: 10,
  });

  const lines: string[] = [];
  lines.push(project ? `Proyecto: ${project.name} (${project.code})` : "Alcance: todos los proyectos");
  lines.push("");
  lines.push(`Pendientes (${pending.length}):`);
  for (const item of pending) {
    lines.push(`- [${item.publicId}] (${item.type}/${item.priority}) ${item.title}${item.module ? ` — módulo ${item.module.name}` : ""}`);
  }
  lines.push("");
  lines.push(`Resueltos recientemente (${recentlyResolved.length}):`);
  for (const item of recentlyResolved) {
    lines.push(`- [${item.publicId}] ${item.title} (resuelto ${item.resolvedAt?.toISOString().slice(0, 10)})`);
  }

  return lines.join("\n");
}

export async function sendChatMessage(input: { userId: string; conversationId?: string; projectId?: string; message: string; voice?: boolean }) {
  const conversation = input.conversationId
    ? await prisma.chatConversation.findUniqueOrThrow({ where: { id: input.conversationId }, include: { messages: true } })
    : await prisma.chatConversation.create({
        data: { userId: input.userId, projectId: input.projectId, title: input.message.slice(0, 60) },
        include: { messages: true },
      });

  await prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "USER", content: input.message } });

  const context = await buildContext(input.projectId ?? conversation.projectId ?? undefined);

  // The Shortcuts/Siri channel feeds the reply straight into text-to-speech —
  // no client renders markdown there, so "**[HS-BUG-0014]**" gets read aloud
  // literally as punctuation. The web chat keeps the id-heavy, scannable style.
  const formatInstructions = input.voice
    ? `Tu respuesta va a ser leída en voz alta por un asistente de voz (Siri), no leída en pantalla.
No uses markdown ni símbolos (nada de asteriscos, guiones de lista, corchetes ni numeración). Escribí en oraciones naturales,
como si se lo contaras a alguien en voz alta. Mencioná el id de un item solo si hace falta para poder buscarlo después, y
decilo de forma natural dentro de la oración (ej. "el bug con id HS-BUG-0014"), nunca como una lista de ids.`
    : `Cuando menciones un item, incluí su id (ej. HS-BUG-0014).`;

  const systemPrompt = `Sos el asistente del "Segundo Cerebro" personal del usuario. Respondé en español, de forma breve y concreta,
basándote ÚNICAMENTE en el contexto provisto a continuación. Si algo no está en el contexto, decilo en vez de inventar.
${formatInstructions}

Contexto actual:
${context}`;

  const history = [...conversation.messages, { role: "USER" as const, content: input.message }].map((m) => ({
    role: (m.role === "ASSISTANT" ? "assistant" : "user") as "assistant" | "user",
    content: m.content,
  }));

  const reply = await ai.chat([{ role: "system", content: systemPrompt }, ...history]);

  await prisma.chatMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply } });

  return { conversationId: conversation.id, reply };
}
