import { homeUrl, resolveSelection, type Division } from "./selection";
export type ExperienceRoute = {
  view: "rankings" | "history";
  divisionId: string;
  fighterId: string;
};
export function detailUrl(divisionId: string, fighterId: string) {
  return `/rankings?${new URLSearchParams({ division: divisionId, fighter: fighterId, view: "history" })}`;
}
export function routeUrl(route: ExperienceRoute) {
  return route.view === "history"
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
    a.fighterId === b.fighterId
  );
}
