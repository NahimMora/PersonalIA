import { prisma } from "@/lib/db";
import { ChatPanel } from "@/components/ChatPanel";
import { isAIConfigured } from "@/lib/ai";

export default async function ChatPage() {
  const projects = await prisma.project.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
      <ChatPanel projects={projects} aiAvailable={isAIConfigured()} />
    </div>
  );
}
