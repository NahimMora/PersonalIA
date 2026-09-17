import { createHmac, timingSafeEqual } from "crypto";

/** Verifies the `X-Hub-Signature-256` header GitHub sends on every webhook delivery. */
export function verifyGithubSignature(payload: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
