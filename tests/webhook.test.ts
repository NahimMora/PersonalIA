import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { verifyGithubSignature } from "@/lib/github/webhook";

describe("verifyGithubSignature", () => {
  const secret = "test-secret";
  const payload = JSON.stringify({ ref: "refs/heads/main" });

  it("accepts a correctly signed payload", () => {
    const signature = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    expect(verifyGithubSignature(payload, signature, secret)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const signature = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    expect(verifyGithubSignature(payload + "x", signature, secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyGithubSignature(payload, null, secret)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const signature = `sha256=${createHmac("sha256", "other-secret").update(payload).digest("hex")}`;
    expect(verifyGithubSignature(payload, signature, secret)).toBe(false);
  });
});
