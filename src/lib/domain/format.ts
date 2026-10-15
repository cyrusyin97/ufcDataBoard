import type { FighterBundle } from "./contracts";
export function recordText(record: FighterBundle["profile"]["careerRecord"]) {
  return [record.wins, record.losses, record.draws]
    .map((n) => n ?? "—")
    .join("-");
}
export function snapshotAge(birthDate: string | null, asOf: string) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`),
    date = new Date(`${asOf}T00:00:00Z`);
  return (
    date.getUTCFullYear() -
    birth.getUTCFullYear() -
    (asOf.slice(5) < birthDate.slice(5) ? 1 : 0)
  );
}
function inches(cm: number | null) {
  return cm === null ? null : Math.round((cm / 2.54) * 10) / 10;
}
export function heightText(cm: number | null) {
  const height = inches(cm);
  return height === null
    ? "—"
    : `${Math.floor(height / 12)}′ ${+(height % 12).toFixed(1)}″`;
}
export function reachText(cm: number | null) {
  const reach = inches(cm);
  return reach === null ? "—" : `${reach}″`;
}
