import type { DivisionRegistry } from "./contracts";

export type Division = DivisionRegistry["divisions"][number];
export function loopIndex(index: number, length: number) {
  if (length < 1)
    throw new Error("A ranking must contain at least one fighter.");
  return ((index % length) + length) % length;
}
export function dialDistance(index: number, active: number, length: number) {
  return (
    loopIndex(index - active + Math.floor(length / 2), length) -
    Math.floor(length / 2)
  );
}
export function resolveSelection(
  divisions: readonly Division[],
  defaultId: string,
  divisionId: string | null,
  selectedId: string | null,
) {
  const division =
    divisions.find((d) => d.id === divisionId) ??
    divisions.find((d) => d.id === defaultId) ??
    divisions[0];
  if (!division) throw new Error("No published division exists.");
  const entry =
    division.entries.find((e) => e.fighterId === selectedId) ??
    division.entries.find(
      (e) => e.isChampion && e.fighterId === division.defaultFighterId,
    );
  if (!entry) throw new Error("The division has no valid champion.");
  return { division, entry };
}
export function homeUrl(divisionId: string, fighterId: string) {
  return `/rankings?${new URLSearchParams({ division: divisionId, selected: fighterId })}`;
}
