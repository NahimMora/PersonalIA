import { describe, expect, it } from "vitest";
import { generateApiToken, hashToken } from "@/lib/shortcuts-auth";

describe("generateApiToken", () => {
  it("produces a token whose hash matches hashToken()", () => {
    const { token, tokenHash } = generateApiToken();
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("never generates the same token twice", () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a.token).not.toBe(b.token);
  });

  it("uses the sc_ prefix so tokens are recognizable", () => {
    const { token } = generateApiToken();
    expect(token.startsWith("sc_")).toBe(true);
  });
});
