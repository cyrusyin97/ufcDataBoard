import type { z } from "zod";
import type { FighterBundle, mediaSchema } from "@/lib/domain/contracts";
import type { FighterSummary } from "@/components/rankings/types";
type Roles = z.infer<typeof mediaSchema>["fighters"][string];
export function fighterSummary(
  bundle: FighterBundle,
  roles: Roles | undefined,
): FighterSummary {
  return {
    id: bundle.profile.id,
    name: bundle.profile.displayName,
    record: bundle.profile.careerRecord,
    thumbnail: (roles?.headshot ?? roles?.half_body)?.variants[0] ?? null,
    figure:
      (roles?.half_body ?? roles?.full_body ?? roles?.headshot)?.variants.at(
        -1,
      ) ?? null,
    fullBody: roles?.full_body?.variants.at(-1) ?? null,
    headshotFallback: roles?.headshot?.variants.at(-1) ?? null,
    figureRole: roles?.half_body
      ? "half_body"
      : roles?.full_body
        ? "full_body"
        : roles?.headshot
          ? "headshot"
          : null,
  };
}
export function historyFigure(summary: FighterSummary): FighterSummary {
  return summary.fullBody
    ? { ...summary, figure: summary.fullBody, figureRole: "full_body" }
    : summary;
}
