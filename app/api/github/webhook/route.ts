import { prisma } from "@/lib/db";
import { verifyGithubSignature } from "@/lib/github/webhook";
import { syncRepository } from "@/lib/github/sync";
import { jsonError } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { SyncTrigger } from "@prisma/client";

interface PushPayload {
  ref: string;
  repository: { name: string; owner: { login: string } };
}

// Public endpoint (excluded from the auth middleware) — authenticated instead
// via the per-repository webhook secret and HMAC signature GitHub sends.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");

  let payload: PushPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonError("invalid payload", 400);
  }

  const repository = await prisma.repository.findUnique({
    where: { owner_name: { owner: payload.repository.owner.login, name: payload.repository.name } },
  });
  if (!repository) return jsonError("repository not configured", 404);

  const secretEnvVar = repository.webhookSecretEnvVar;
  const secret = secretEnvVar ? process.env[secretEnvVar] : undefined;
  if (!secret || !verifyGithubSignature(rawBody, signature, secret)) {
    return jsonError("invalid signature", 401);
  }

  if (event !== "push" || !payload.ref.endsWith(repository.defaultBranch)) {
    return NextResponse.json({ ignored: true });
  }

  await syncRepository(repository, SyncTrigger.WEBHOOK);
  return NextResponse.json({ ok: true });
}
