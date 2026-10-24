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
      go(delta: number) {
        const target = index + delta;
        if (target >= 0 && target < entries.length) {
          index = target;
          update();
        }
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

describe("bout parent history", () => {
  const bout: ExperienceRoute = {
    view: "bout",
    divisionId: "lightweight",
    fighterId: champion,
    boutId: "a".repeat(16),
    round: "all",
  };
  it("pushes one bout, replaces periods and fighters, and returns to latest participant history", () => {
    const browser = port("/rankings?division=lightweight");
    const controller = new RouteController(browser, divisions, "featherweight");
    controller.initialize();
    controller.commit(historyRoute(champion));
    controller.commit(bout);
    expect(browser.entries).toHaveLength(4);
    controller.commit({ ...bout, round: 3, fighterId: ranked });
    expect(browser.entries).toHaveLength(4);
    controller.returnHistory();
    expect(controller.traverse()).toEqual(historyRoute(ranked));
    browser.forward();
    expect(controller.traverse()).toEqual({
      ...bout,
      round: 3,
      fighterId: ranked,
    });
    expect(browser.history.state.framework).toBe("preserved");
  });
  it("seeds direct bout context once and reloads without extra entries", () => {
    const browser = port(
      "/rankings?division=lightweight&view=bout&fighter=" +
        other +
        "&bout=" +
        "a".repeat(16) +
        "&round=2",
    );
    new RouteController(browser, divisions, "featherweight").initialize();
    expect(browser.entries).toHaveLength(4);
    const refreshed = new RouteController(browser, divisions, "featherweight");
    refreshed.initialize();
    expect(browser.entries).toHaveLength(4);
    refreshed.returnHistory();
    expect(refreshed.traverse()).toEqual(historyRoute(other));
    refreshed.returnHome();
    expect(refreshed.traverse()?.fighterId).toBe(champion);
  });
  it("preserves malformed periods for an explicit error instead of choosing All", () => {
    const route = parseRoute(
      new URLSearchParams("view=bout&fighter=x&bout=y&round=0"),
      divisions,
      "featherweight",
    );
    expect(route).toMatchObject({
      view: "bout",
      fighterId: "x",
      boutId: "y",
      round: "invalid",
    });
  });
});

it("returns directly from a bout to the owned home using the latest ranked participant", () => {
  const browser = port("/rankings?division=lightweight");
  const controller = new RouteController(browser, divisions, "featherweight");
  controller.initialize();
  controller.commit(historyRoute(champion));
  controller.commit({
    view: "bout",
    divisionId: "lightweight",
    fighterId: ranked,
    boutId: "a".repeat(16),
    round: 3,
  });
  expect(controller.returnHome()).toBeNull();
  expect(controller.traverse()).toEqual({
    view: "rankings",
    divisionId: "lightweight",
    fighterId: ranked,
  });
  expect(browser.entries).toHaveLength(4);
});

it("recent form from rankings keeps a fighter history parent before bout detail", () => {
  const browser = port("/rankings?division=lightweight");
  const controller = new RouteController(browser, divisions, "featherweight");
  controller.initialize();
  controller.commit({
    view: "bout",
    divisionId: "lightweight",
    fighterId: champion,
    boutId: "a".repeat(16),
    round: "all",
  });
  expect(browser.entries).toHaveLength(4);
  controller.returnHistory();
  expect(controller.traverse()).toEqual(historyRoute(champion));
  browser.forward();
  expect(controller.traverse()).toMatchObject({
    view: "bout",
    boutId: "a".repeat(16),
  });
});
