import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { TokenManager } from "@/components/TokenManager";

export default async function TokensPage() {
  const session = await auth();
  const tokens = session?.user?.id
    ? await prisma.apiToken.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, lastUsedAt: true, revokedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const serialized = tokens.map((t) => ({
    ...t,
    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    revokedAt: t.revokedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Tokens (Apple Shortcuts / NFC)</h1>
      <p className="text-sm text-muted">Ver docs/SHORTCUTS_FUTURE.md para configurar el Shortcut con este token.</p>
      <TokenManager tokens={serialized} />
    </div>
  );
}
