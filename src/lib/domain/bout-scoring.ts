import type { BoutMetric, BoutStats, ScoringReference } from "./bout-contracts";

export const formulaVersion = "1.1" as const;
export const axes = [
  "striking",
  "clinching",
  "grappling",
  "damage",
  "tank",
] as const;
export type BoutAxis = (typeof axes)[number];
const damage = [
  ["sig_landed", 0.75],
  ["kd", 0.25],
] as const;
export const axisWeights: Record<
  BoutAxis,
  readonly (readonly [BoutMetric, number])[]
> = {
  striking: [
    ["distance_landed", 0.7],
    ["distance_attempted", 0.3],
  ],
  clinching: [
    ["clinch_landed", 0.7],
    ["clinch_attempted", 0.3],
  ],
  grappling: [
    ["td_landed", 0.3],
    ["td_attempted", 0.1],
    ["sub_att", 0.2],
    ["ctrl_seconds", 0.25],
    ["ground_landed", 0.15],
  ],
  damage,
  tank: damage,
};
export type ComponentScore = {
  metric: BoutMetric;
  raw: number | null;
  rate: number | null;
  normalized: number | null;
  weight: number;
  contribution: number | null;
};
export type AxisScore = {
  axis: BoutAxis;
  total: number | null;
  components: ComponentScore[];
};
/** Caller validates bundle/reference identities and chooses the period before scoring. */
export function scoreBout(
  own: BoutStats | null,
  opponent: BoutStats | null,
  elapsedSeconds: number | null,
  reference: ScoringReference | null,
  period: "bout" | "round",
): AxisScore[] {
  const validTime =
    elapsedSeconds !== null &&
    Number.isFinite(elapsedSeconds) &&
    elapsedSeconds > 0;
  return axes.map((axis) => {
    const stats = axis === "tank" ? opponent : own;
    const components = axisWeights[axis].map(
      ([metric, weight]): ComponentScore => {
        const raw = stats?.[metric] ?? null;
        const validRaw = raw !== null && Number.isFinite(raw) && raw >= 0;
        const rate =
          validRaw && validTime
            ? (raw * (metric === "ctrl_seconds" ? 1 : 300)) / elapsedSeconds
            : null;
        const upper = reference?.periods[period].bounds[metric].upper;
        const normalized =
          reference?.status === "available" &&
          reference.formulaVersion === formulaVersion &&
          upper != null &&
          Number.isFinite(upper) &&
          upper > 0 &&
          rate !== null
            ? 100 * Math.max(0, Math.min(rate / upper, 1))
            : null;
        return {
          metric,
          raw,
          rate,
          normalized,
          weight,
          contribution: normalized === null ? null : weight * normalized,
        };
      },
    );
    return {
      axis,
      components,
      total: components.some((c) => c.contribution === null)
        ? null
        : components.reduce((sum, c) => sum + c.contribution!, 0),
    };
  });
}
