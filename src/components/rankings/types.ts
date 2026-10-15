import type { z } from "zod";
import type { FighterBundle, mediaAssetSchema } from "@/lib/domain/contracts";
import type { Division } from "@/lib/domain/selection";
export type Variant = z.infer<typeof mediaAssetSchema>["variants"][number];
export type FighterSummary = {
  id: string;
  name: string;
  record: FighterBundle["profile"]["careerRecord"];
  thumbnail: Variant | null;
  figure: Variant | null;
  fullBody: Variant | null;
  headshotFallback: Variant | null;
  figureRole: "half_body" | "full_body" | "headshot" | null;
};
export type RankingsData = {
  datasetVersion: string;
  defaultDivisionId: string;
  divisions: Division[];
  fighters: Record<string, FighterSummary>;
};
