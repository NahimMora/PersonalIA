import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

const TOKEN_PREFIX = "sc_";

/** Generates a new personal access token. Returns the plaintext (shown once) and its hash (stored). */
export function generateApiToken() {
  const secret = randomBytes(32).toString("hex");
  const token = `${TOKEN_PREFIX}${secret}`;
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Validates the `Authorization: Bearer <token>` header used by Apple Shortcuts / NFC calls. */
export async function verifyShortcutsRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  const tokenHash = hashToken(token);
  const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!apiToken || apiToken.revokedAt) return null;

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return apiToken;
}
