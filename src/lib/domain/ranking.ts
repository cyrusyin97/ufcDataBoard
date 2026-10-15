import { z } from "zod";

export const fighterIdSchema = z.string().regex(/^[a-f0-9]{16}$/);
export const rankingEntrySchema = z.object({
  id: fighterIdSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  rank: z.number().int().min(0),
});
export type RankingEntry = z.infer<typeof rankingEntrySchema>;

export const rankingSnapshotSchema = z
  .object({
    snapshotAt: z.iso.date(),
    division: z.string().regex(/^[a-z][a-z0-9-]*$/),
    source: z.url(),
    fighters: z.array(rankingEntrySchema).min(1),
  })
  .superRefine((snapshot, context) => {
    if (!snapshot.fighters.some((fighter) => fighter.rank === 0)) {
      context.addIssue({ code: "custom", message: "Missing champion" });
    }
    for (const field of ["id", "rank", "slug"] as const) {
      if (
        new Set(snapshot.fighters.map((fighter) => fighter[field])).size !==
        snapshot.fighters.length
      ) {
        context.addIssue({
          code: "custom",
          message: `Duplicate ranking ${field}`,
        });
      }
    }
  });

export function resolveReturnSelection(
  detailId: string,
  roster: readonly RankingEntry[],
): RankingEntry {
  const selected = roster.find((fighter) => fighter.id === detailId);
  const champion = roster.find((fighter) => fighter.rank === 0);
  if (!champion) throw new Error("The ranking has no champion.");
  return selected ?? champion;
}

export function resolveHomeSelection(
  selectedId: string | null,
  roster: readonly RankingEntry[],
): RankingEntry {
  const selected = roster.find((fighter) => fighter.id === selectedId);
  const initial = roster.find((fighter) => fighter.rank === 0);
  if (!initial) throw new Error("The ranking has no champion.");
  return selected ?? initial;
}
