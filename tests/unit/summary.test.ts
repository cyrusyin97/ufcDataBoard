import { describe, expect, it } from "vitest";
import { fighterSummary } from "../../src/lib/data/summary";
import { profileBundle } from "../fixtures/fighter";
const asset = {
  sourceUrl: "https://example.test/headshot.png",
  sourceSha256: "0".repeat(64),
  role: "headshot" as const,
  reviewedAt: "2026-10-15",
  rightsStatus: "unknown" as const,
  variants: [160, 320, 520].map((width) => ({
    width,
    height: (width * 325) / 520,
    bytes: 10,
    mime: "image/webp" as const,
    sha256: "0".repeat(64),
    url: "/headshot.webp",
  })),
};
describe("ranking thumbnails", () => {
  it("selects the largest reviewed headshot while preserving the hero role", () => {
    const body = { ...asset, role: "half_body" as const };
    const summary = fighterSummary(profileBundle, {
      headshot: asset,
      half_body: body,
      full_body: null,
    });
    expect(summary.thumbnail).toBe(asset.variants[2]);
    expect(summary.figureRole).toBe("half_body");
  });
  it("uses initials instead of mixing a body image into the headshot list", () => {
    expect(
      fighterSummary(profileBundle, {
        headshot: null,
        half_body: { ...asset, role: "half_body" },
        full_body: null,
      }).thumbnail,
    ).toBeNull();
  });
});
