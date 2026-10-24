import {
  parseRoute,
  sameRoute,
  returnRoute,
  routeUrl,
  type ExperienceRoute,
} from "@/lib/domain/routes";
import type { Division } from "@/lib/domain/selection";
const ownershipKey = "ufcRankingsV1";
type OwnedEntry = {
  version: 1 | 2;
  kind: "rankings" | "history" | "bout";
  parentKey?: string;
  key: string;
  homeKey: string | null;
  homeSelection: string;
  divisionId: string;
};
type BrowserPort = {
  history: Pick<History, "state" | "replaceState" | "pushState" | "back"> &
    Partial<Pick<History, "go">>;
  location: Pick<Location, "pathname" | "search">;
};
function owner(state: unknown): OwnedEntry | null {
  const value = (state as Record<string, unknown> | null)?.[ownershipKey] as
    OwnedEntry | undefined;
  return (value?.version === 1 || value?.version === 2) &&
    (value.kind === "rankings" ||
      value.kind === "history" ||
      (value.version === 2 &&
        value.kind === "bout" &&
        typeof value.parentKey === "string")) &&
    typeof value.key === "string" &&
    typeof value.divisionId === "string" &&
    typeof value.homeSelection === "string" &&
    (value.homeKey === null || typeof value.homeKey === "string")
    ? value
    : null;
}
export class RouteController {
  current: ExperienceRoute;
  private entry: OwnedEntry | null = null;
  constructor(
    private browser: BrowserPort,
    private divisions: readonly Division[],
    private defaultId: string,
  ) {
    this.current = this.read();
  }
  private read() {
    return parseRoute(
      new URLSearchParams(this.browser.location.search),
      this.divisions,
      this.defaultId,
    );
  }
  private state(entry: OwnedEntry) {
    return { ...this.browser.history.state, [ownershipKey]: entry };
  }
  private homeEntry(route: ExperienceRoute): OwnedEntry {
    return {
      version: 1,
      kind: "rankings",
      key: crypto.randomUUID(),
      homeKey: null,
      homeSelection: route.fighterId,
      divisionId: route.divisionId,
    };
  }
  initialize() {
    const existing = owner(this.browser.history.state);
    if (
      existing?.kind === this.current.view &&
      existing.divisionId === this.current.divisionId
    ) {
      this.entry = existing;
      return this.current;
    }
    if (this.current.view === "rankings") {
      this.entry = this.homeEntry(this.current);
      this.browser.history.replaceState(this.state(this.entry), "");
    } else {
      const home = returnRoute(this.current, this.divisions, this.defaultId);
      const homeEntry = this.homeEntry(home);
      this.browser.history.replaceState(
        this.state(homeEntry),
        "",
        routeUrl(home),
      );
      this.entry = {
        ...homeEntry,
        kind: "history",
        key: crypto.randomUUID(),
        homeKey: homeEntry.key,
      };
      const historyRoute: ExperienceRoute = {
        view: "history",
        divisionId: this.current.divisionId,
        fighterId: this.current.fighterId,
      };
      this.browser.history.pushState(
        this.state(this.entry),
        "",
        routeUrl(historyRoute),
      );
      if (this.current.view === "bout") {
        this.entry = {
          ...this.entry,
          version: 2,
          kind: "bout",
          key: crypto.randomUUID(),
          parentKey: this.entry.key,
        };
        this.browser.history.pushState(
          this.state(this.entry),
          "",
          routeUrl(this.current),
        );
      }
    }
    return this.current;
  }
  commit(route: ExperienceRoute) {
    const home = returnRoute(route, this.divisions, this.defaultId);
    if (route.view === "bout") {
      if (this.current.view === "rankings") {
        this.commit({
          view: "history",
          divisionId: route.divisionId,
          fighterId: route.fighterId,
        });
      }
      const previous =
        this.entry ?? owner(this.browser.history.state) ?? this.homeEntry(home);
      if (this.current.view !== "bout") {
        this.entry = {
          ...previous,
          version: 2,
          kind: "bout",
          key: crypto.randomUUID(),
          parentKey: previous.key,
          divisionId: route.divisionId,
          homeSelection: home.fighterId,
        };
        this.browser.history.pushState(
          this.state(this.entry),
          "",
          routeUrl(route),
        );
      } else {
        this.entry = {
          ...previous,
          version: 2,
          kind: "bout",
          divisionId: route.divisionId,
          homeSelection: home.fighterId,
        };
        this.browser.history.replaceState(
          this.state(this.entry),
          "",
          routeUrl(route),
        );
      }
      this.current = route;
      return;
    }
    if (route.view === "history" && this.current.view === "rankings") {
      const homeEntry =
        owner(this.browser.history.state) ?? this.homeEntry(this.current);
      this.entry = {
        ...homeEntry,
        kind: "history",
        key: crypto.randomUUID(),
        homeKey: homeEntry.key,
        homeSelection: home.fighterId,
        divisionId: route.divisionId,
      };
      this.browser.history.pushState(
        this.state(this.entry),
        "",
        routeUrl(route),
      );
    } else {
      this.entry =
        route.view === "rankings"
          ? {
              ...(owner(this.browser.history.state) ?? this.homeEntry(home)),
              kind: "rankings",
              homeKey: null,
              homeSelection: home.fighterId,
              divisionId: route.divisionId,
            }
          : {
              ...(this.entry ?? this.homeEntry(home)),
              kind: "history",
              homeSelection: home.fighterId,
              divisionId: route.divisionId,
            };
      this.browser.history.replaceState(
        this.state(this.entry),
        "",
        routeUrl(route),
      );
    }
    this.current = route;
  }
  traverse(): ExperienceRoute | null {
    if (this.browser.location.pathname !== "/rankings") return null;
    const previous = this.current;
    const previousEntry = this.entry;
    let route = this.read();
    this.entry = owner(this.browser.history.state);
    if (
      previous.view === "bout" &&
      this.entry?.kind === "history" &&
      this.entry.key === previousEntry?.parentKey
    ) {
      route = {
        view: "history",
        divisionId: previous.divisionId,
        fighterId: previous.fighterId,
      };
      this.browser.history.replaceState(
        this.state(this.entry),
        "",
        routeUrl(route),
      );
    }
    if (
      previous.view !== "rankings" &&
      this.entry?.kind === "rankings" &&
      this.entry.key === previousEntry?.homeKey
    ) {
      route = returnRoute(previous, this.divisions, this.defaultId);
      this.entry = {
        ...this.entry,
        homeSelection: route.fighterId,
        divisionId: route.divisionId,
      };
      this.browser.history.replaceState(
        this.state(this.entry),
        "",
        routeUrl(route),
      );
    }
    this.current = route;
    return sameRoute(previous, route) ? null : route;
  }
  returnHistory(): ExperienceRoute | null {
    const history: ExperienceRoute = {
      view: "history",
      divisionId: this.current.divisionId,
      fighterId: this.current.fighterId,
    };
    if (this.current.view === "bout" && this.entry?.parentKey) {
      this.browser.history.back();
      return null;
    }
    this.commit(history);
    return history;
  }
  returnHome(): ExperienceRoute | null {
    const home = returnRoute(this.current, this.divisions, this.defaultId);
    const existing = owner(this.browser.history.state);
    if (
      this.current.view === "bout" &&
      existing?.homeKey &&
      this.browser.history.go
    ) {
      this.browser.history.go(-2);
      return null;
    }
    if (
      this.current.view === "history" &&
      existing?.kind === "history" &&
      existing.homeKey
    ) {
      this.browser.history.back();
      return null;
    }
    this.commit(home);
    return home;
  }
}
