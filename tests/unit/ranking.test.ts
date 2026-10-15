import { describe, expect, it } from "vitest";
import source from "../../src/data/roster.json";
import {
  rankingSnapshotSchema,
  resolveHomeSelection,
  resolveReturnSelection,
} from "../../src/lib/domain/ranking";
const { fighters } = rankingSnapshotSchema.parse(source);

describe("ranking selection contract", () => {
  it("keeps each ranked fighter after return", () => {
    for (const fighter of fighters) {
      expect(resolveReturnSelection(fighter.id, fighters)).toEqual(fighter);
    }
  });
  it("returns an unranked fighter to the champion", () => {
    expect(resolveReturnSelection("0000000000000000", fighters).rank).toBe(0);
  });
  it("selects the champion for fresh or invalid home state", () => {
    expect(resolveHomeSelection(null, fighters).slug).toBe(
      "alexander-volkanovski",
    );
    expect(resolveHomeSelection("invalid", fighters).slug).toBe(
      "alexander-volkanovski",
    );
  });
  it("preserves an explicit home selection", () => {
    expect(resolveHomeSelection(fighters[3].id, fighters)).toEqual(fighters[3]);
  });
  it("accepts another division and shorter ranking", () => {
    expect(
      rankingSnapshotSchema.parse({
        ...source,
        division: "womens-strawweight",
        fighters: fighters.slice(0, 3),
      }).fighters,
    ).toHaveLength(3);
  });
  it("rejects duplicate identity and incomplete rankings", () => {
    expect(
      rankingSnapshotSchema.safeParse({
        ...source,
        fighters: [...fighters.slice(1), fighters[1]],
      }).success,
    ).toBe(false);
    expect(
      rankingSnapshotSchema.safeParse({
        ...source,
        fighters: fighters.slice(1),
      }).success,
    ).toBe(false);
  });
});
