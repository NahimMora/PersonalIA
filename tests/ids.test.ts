import { describe, expect, it } from "vitest";
import { slugify, suggestProjectCode } from "@/lib/ids";

describe("slugify", () => {
  it("lowercases and strips accents", () => {
    expect(slugify("La Voz Riojana")).toBe("la-voz-riojana");
    expect(slugify("Autopublicación")).toBe("autopublicacion");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("  Hola Salta! ")).toBe("hola-salta");
  });
});

describe("suggestProjectCode", () => {
  it("uses the first 3 letters for single-word names", () => {
    expect(suggestProjectCode("HolaSalta")).toBe("HOL");
  });

  it("uses initials for multi-word names", () => {
    expect(suggestProjectCode("La Voz Riojana")).toBe("LVR");
  });
});
