import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CategoryDropdown,
  CategoryHeading,
} from "../../src/components/rankings/category";
import { RankingDial } from "../../src/components/rankings/dial";
import { describe, expect, it } from "vitest";
import {
  dialDistance,
  loopIndex,
  resolveSelection,
} from "../../src/lib/domain/selection";
import type { Division } from "../../src/lib/domain/selection";
import { snapshotAge, recordText } from "../../src/lib/domain/format";
const fixture = (id: string, length: number): Division => ({
  id,
  label: id,
  weightLb: 170,
  publicationState: "published",
  snapshotAt: "2026-10-14",
  sourceUrl: "https://www.ufc.com/rankings",
  defaultFighterId: "0000000000000000",
  entries: Array.from({ length }, (_, rank) => ({
    fighterId: rank.toString(16).padStart(16, "0"),
    rank,
    isChampion: rank === 0,
  })),
});
describe("configurable ranking selection", () => {
  it("resolves a third division and different list lengths with champion defaults", () => {
    const divisions = [
      fixture("featherweight", 16),
      fixture("lightweight", 16),
      fixture("welterweight", 5),
    ];
    const result = resolveSelection(
      divisions,
      "featherweight",
      "welterweight",
      "0000000000000004",
    );
    expect(result.division.id).toBe("welterweight");
    expect(result.entry.rank).toBe(4);
    expect(
      resolveSelection(divisions, "featherweight", "welterweight", null).entry
        .rank,
    ).toBe(0);
    expect(
      resolveSelection(divisions, "featherweight", "missing", "invalid")
        .division.id,
    ).toBe("featherweight");
  });
  it.each([1, 2, 5, 16, 23])(
    "loops and places the central row for %i entries",
    (length) => {
      expect(loopIndex(-1, length)).toBe(length - 1);
      expect(loopIndex(length, length)).toBe(0);
      for (let active = 0; active < length; active++) {
        expect(dialDistance(active, active, length)).toBe(0);
        expect(
          new Set(
            Array.from({ length }, (_, index) =>
              dialDistance(index, active, length),
            ),
          ).size,
        ).toBe(length);
      }
    },
  );
  it("keeps absent values and computes age at the ranking snapshot", () => {
    expect(
      recordText({ wins: null, losses: 0, draws: null, noContests: null }),
    ).toBe("—-0-—");
    expect(snapshotAge("1988-09-29", "2026-09-28")).toBe(37);
    expect(snapshotAge("1988-09-29", "2026-09-29")).toBe(38);
    expect(snapshotAge(null, "2026-10-14")).toBeNull();
  });
});

// Render the actual components with a third division. No production data changes.
it("renders the same category and dial components for an additional five-entry division", () => {
  const division = fixture("welterweight", 5);
  const fighters = Object.fromEntries(
    division.entries.map((entry) => [
      entry.fighterId,
      {
        id: entry.fighterId,
        name: `Fixture ${entry.rank}`,
        record: { wins: null, losses: null, draws: null, noContests: null },
        thumbnail: null,
        figure: null,
        fullBody: null,
        headshotFallback: null,
        figureRole: null,
      },
    ]),
  );
  const heading = renderToStaticMarkup(
    createElement(CategoryHeading, { division }),
  );
  expect(heading).toContain("welterweight");
  const dropdown = renderToStaticMarkup(
    createElement(CategoryDropdown, {
      divisions: [division],
      active: division.id,
      disabled: false,
      onChange: () => {},
    }),
  );
  expect(dropdown).toContain('aria-haspopup="menu"');
  expect(dropdown).toContain(division.label);
  const dial = renderToStaticMarkup(
    createElement(RankingDial, {
      division,
      fighters,
      selected: division.entries[4].fighterId,
      onSelect: () => {},
    }),
  );
  expect(dial.match(/role="option"/g)).toHaveLength(5);
  expect(dial).toContain('aria-setsize="5"');
  expect(dial).toContain('aria-activedescendant="fighter-0000000000000004"');
});
