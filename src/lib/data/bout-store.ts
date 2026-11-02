import type { Context, Stage } from "@/lib/performance/contracts";
import { idSchema } from "@/lib/domain/contracts";
import {
  boutBundleSchema,
  scoringReferenceSchema,
  type BoutBundle,
  type ScoringReference,
} from "@/lib/domain/bout-contracts";
export type BoutData = { bout: BoutBundle; reference: ScoringReference | null };
export class BoutRequestError extends Error {
  constructor(
    public reason:
      "unknown" | "period" | "participant" | "request" | "unsupported",
  ) {
    super(reason);
  }
}
export class BoutStore {
  private bouts = new Map<string, BoutData>();
  constructor(
    private version: string,
    private enabled: boolean,
    private request: typeof fetch = (input, init) => fetch(input, init),
    private sourceHash?: string,
  ) {}
  private async json(file: string, signal: AbortSignal, trace?: Context) {
    const stage: Stage = file.startsWith("fighters/")
      ? "fighter"
      : file.startsWith("bouts/")
        ? "bout"
        : file.startsWith("bout-references/")
          ? "reference"
          : file === "index.json"
            ? "index"
            : "media";
    const end = trace?.span(stage, "miss");
    try {
      const response = await this.request(`/data/v1/${this.version}/${file}`, {
        signal,
      });
      if (!response.ok)
        throw new BoutRequestError(
          response.status === 404 ? "unknown" : "request",
        );
      const json = await response.json();
      end?.();
      return json;
    } catch (error) {
      end?.(signal.aborted ? "cancelled" : "error");
      throw error;
    }
  }
  async load(
    id: string,
    fighter: string,
    round: number | "all" | "invalid",
    signal: AbortSignal,
    trace?: Context,
  ): Promise<BoutData> {
    if (!this.enabled) throw new BoutRequestError("unsupported");
    if (!idSchema.safeParse(id).success) throw new BoutRequestError("unknown");
    let data = this.bouts.get(id);
    if (data) trace?.span("bout", "hit")?.();
    if (!data) {
      const bout = boutBundleSchema.parse(
        await this.json(`bouts/${id}.json`, signal, trace),
      );
      if (bout.id !== id || bout.datasetVersion !== this.version)
        throw new Error("Bout identity mismatch");
      const reference = bout.referenceId
        ? scoringReferenceSchema.parse(
            await this.json(
              `bout-references/${bout.referenceId}.json`,
              signal,
              trace,
            ),
          )
        : null;
      if (
        reference &&
        (reference.id !== bout.referenceId ||
          reference.datasetVersion !== this.version ||
          reference.divisionId !== bout.divisionId ||
          reference.cutoffExclusive !== bout.eventDate ||
          reference.formulaVersion !== "1.1" ||
          reference.policyVersion !== "1" ||
          (this.sourceHash !== undefined &&
            reference.sourceDatabaseSha256 !== this.sourceHash))
      )
        throw new Error("Bout reference mismatch");
      signal.throwIfAborted();
      data = { bout, reference };
      this.bouts.set(id, data);
      if (this.bouts.size > 16)
        this.bouts.delete(this.bouts.keys().next().value!);
    }
    if (!data.bout.fighterIds.includes(fighter))
      throw new BoutRequestError("participant");
    if (
      round === "invalid" ||
      !data.bout.periods.some((p) => p.round === (round === "all" ? 0 : round))
    )
      throw new BoutRequestError("period");
    signal.throwIfAborted();
    return data;
  }
}
