import { homeUrl, resolveSelection, type Division } from "./selection";
type Context = { divisionId: string; fighterId: string };
export type ExperienceRoute = Context &
  (
    | { view: "rankings" | "history" }
    | { view: "bout"; boutId: string; round: number | "all" | "invalid" }
  );
export function detailUrl(divisionId: string, fighterId: string) {
  return `/rankings?${new URLSearchParams({ division: divisionId, fighter: fighterId, view: "history" })}`;
}
export function boutUrl(
  divisionId: string,
  fighterId: string,
  boutId: string,
  round: number | "all" | "invalid" = "all",
) {
  return `/rankings?${new URLSearchParams({ division: divisionId, fighter: fighterId, view: "bout", bout: boutId, round: String(round) })}`;
}
export function routeUrl(route: ExperienceRoute) {
  return route.view === "bout"
    ? boutUrl(route.divisionId, route.fighterId, route.boutId, route.round)
    : route.view === "history"
      ? detailUrl(route.divisionId, route.fighterId)
      : homeUrl(route.divisionId, route.fighterId);
}
export function parseRoute(
  query: URLSearchParams,
  divisions: readonly Division[],
  defaultId: string,
): ExperienceRoute {
  const { division, entry } = resolveSelection(
    divisions,
    defaultId,
    query.get("division"),
    query.get("selected"),
  );
  if (query.get("view") === "bout") {
    const round = query.get("round") ?? "all";
    return {
      view: "bout",
      divisionId: division.id,
      fighterId: query.get("fighter") ?? "",
      boutId: query.get("bout") ?? "",
      round:
        round === "all"
          ? "all"
          : /^[1-9]\d*$/.test(round) && Number.isSafeInteger(Number(round))
            ? Number(round)
            : "invalid",
    };
  }
  return query.get("view") === "history"
    ? {
        view: "history",
        divisionId: division.id,
        fighterId: query.get("fighter") ?? "",
      }
    : { view: "rankings", divisionId: division.id, fighterId: entry.fighterId };
}
export function returnRoute(
  route: ExperienceRoute,
  divisions: readonly Division[],
  defaultId: string,
): ExperienceRoute {
  const { division, entry } = resolveSelection(
    divisions,
    defaultId,
    route.divisionId,
    route.fighterId,
  );
  return {
    view: "rankings",
    divisionId: division.id,
    fighterId: entry.fighterId,
  };
}
export function sameRoute(a: ExperienceRoute, b: ExperienceRoute) {
  return (
    a.view === b.view &&
    a.divisionId === b.divisionId &&
    a.fighterId === b.fighterId &&
    (a.view !== "bout" ||
      b.view !== "bout" ||
      (a.boutId === b.boutId && a.round === b.round))
  );
}
