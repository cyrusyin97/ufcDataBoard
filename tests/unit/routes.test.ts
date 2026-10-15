import { describe, expect, it } from "vitest";
import { RouteController } from "../../src/lib/navigation/controller";
import {
  parseRoute,
  returnRoute,
  detailUrl,
  type ExperienceRoute,
} from "../../src/lib/domain/routes";
import type { Division } from "../../src/lib/domain/selection";
const champion = "0000000000000000",
  ranked = "0000000000000001",
  other = "0000000000000002";
const divisions: Division[] = ["featherweight", "lightweight"].map((id) => ({
  id,
  label: id,
  weightLb: 145,
  publicationState: "published",
  snapshotAt: "2026-10-14",
  sourceUrl: "https://www.ufc.com/rankings",
  defaultFighterId: champion,
  entries: [
    { fighterId: champion, rank: 0, isChampion: true },
    { fighterId: ranked, rank: 1, isChampion: false },
  ],
}));
function port(initialUrl: string) {
  const entries = [
    { url: "/external", state: { external: true } },
    {
      url: initialUrl,
      state: { __NA: true, framework: "preserved" } as Record<string, unknown>,
    },
  ];
  let index = 1;
  const browser = {
    location: {
      pathname: new URL(initialUrl, "http://local").pathname,
      search: new URL(initialUrl, "http://local").search,
    },
    history: {
      get state() {
        return entries[index].state;
      },
      replaceState(
        state: Record<string, unknown>,
        _unused: string,
        url?: string | URL | null,
      ) {
        entries[index] = { state, url: url ? String(url) : entries[index].url };
        update();
      },
      pushState(
        state: Record<string, unknown>,
        _unused: string,
        url?: string | URL | null,
      ) {
        entries.splice(index + 1);
        entries.push({ state, url: String(url) });
        index++;
        update();
      },
      back() {
        if (index > 0) {
          index--;
          update();
        }
      },
    },
    forward() {
      if (index < entries.length - 1) {
        index++;
        update();
      }
    },
    get entries() {
      return entries;
    },
  };
  function update() {
    const url = new URL(entries[index].url, "http://local");
    browser.location.pathname = url.pathname;
    browser.location.search = url.search;
  }
  return browser;
}
const historyRoute = (id: string): ExperienceRoute => ({
  view: "history",
  divisionId: "lightweight",
  fighterId: id,
});
describe("persistent route history", () => {
  it("keeps one detail entry and computes the latest ranked or unranked return", () => {
    const browser = port("/rankings?division=lightweight");
    const controller = new RouteController(browser, divisions, "featherweight");
    controller.initialize();
    controller.commit(historyRoute(champion));
    controller.commit(historyRoute(other));
    controller.commit(historyRoute(ranked));
    expect(browser.entries).toHaveLength(3);
    expect(controller.traverse()).toBeNull();
    expect(browser.history.state.framework).toBe("preserved");
    browser.history.back();
    expect(controller.traverse()).toEqual({
      view: "rankings",
      divisionId: "lightweight",
      fighterId: ranked,
    });
    browser.forward();
    expect(controller.traverse()).toEqual(historyRoute(ranked));
    controller.commit(historyRoute(other));
    controller.returnHome();
    expect(controller.traverse()?.fighterId).toBe(champion);
    browser.history.back();
    expect(controller.traverse()).toBeNull();
    expect(browser.location.pathname).toBe("/external");
  });
  it("seeds a direct detail visit once and reuses ownership on refresh", () => {
    const browser = port(detailUrl("lightweight", other));
    new RouteController(browser, divisions, "featherweight").initialize();
    expect(browser.entries).toHaveLength(3);
    const refreshed = new RouteController(browser, divisions, "featherweight");
    expect(refreshed.initialize()).toEqual(historyRoute(other));
    expect(browser.entries).toHaveLength(3);
    refreshed.returnHome();
    expect(refreshed.traverse()?.fighterId).toBe(champion);
  });
  it("preserves unknown detail IDs and resolves invalid home values safely", () => {
    expect(
      parseRoute(
        new URLSearchParams("view=history&fighter=invalid"),
        divisions,
        "featherweight",
      ).fighterId,
    ).toBe("invalid");
    expect(
      parseRoute(
        new URLSearchParams("division=invalid&selected=invalid"),
        divisions,
        "featherweight",
      ).fighterId,
    ).toBe(champion);
    expect(
      returnRoute(historyRoute(other), divisions, "featherweight").fighterId,
    ).toBe(champion);
  });
});
