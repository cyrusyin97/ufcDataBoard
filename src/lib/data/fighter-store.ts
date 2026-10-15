import {
  bundleSchema,
  idSchema,
  indexSchema,
  mediaSchema,
  type FighterBundle,
} from "@/lib/domain/contracts";
import type { RankingsData } from "@/components/rankings/types";
import { fighterSummary } from "./summary";
export class UnknownFighterError extends Error {
  constructor() {
    super("The fighter is not in this dataset.");
  }
}
export class FighterStore {
  private bundles = new Map<string, FighterBundle>();
  private index: Set<string> | null = null;
  private media: ReturnType<typeof mediaSchema.parse> | null = null;
  constructor(
    private data: RankingsData,
    private initial: FighterBundle | null,
    private request: typeof fetch = (input, init) => fetch(input, init),
  ) {}
  private async json(file: string, signal: AbortSignal) {
    const response = await this.request(
      `/data/v1/${this.data.datasetVersion}/${file}`,
      { signal },
    );
    if (!response.ok) throw new Error("Fighter request failed.");
    return response.json();
  }
  async load(
    id: string,
    signal: AbortSignal,
    full = true,
  ): Promise<FighterBundle> {
    if (!idSchema.safeParse(id).success) throw new UnknownFighterError();
    if (!this.data.fighters[id]) {
      if (!this.index) {
        const index = indexSchema.parse(await this.json("index.json", signal));
        if (index.datasetVersion !== this.data.datasetVersion)
          throw new Error("Archive version mismatch.");
        this.index = new Set(index.fighters.map((f) => f.id));
      }
      if (!this.index.has(id)) throw new UnknownFighterError();
    }
    const cached = this.bundles.get(id);
    if (cached) {
      this.bundles.delete(id);
      this.bundles.set(id, cached);
      return cached;
    }
    if (!full && this.initial?.profile.id === id) return this.initial;
    const bundle = bundleSchema.parse(
      await this.json(`fighters/${id}.json`, signal),
    );
    if (
      bundle.datasetVersion !== this.data.datasetVersion ||
      bundle.profile.id !== id ||
      bundle.records.some((r) => r.fighterId !== id)
    )
      throw new Error("Fighter bundle identity or version mismatch.");
    signal.throwIfAborted();
    this.bundles.set(id, bundle);
    if (this.bundles.size > 32)
      this.bundles.delete(this.bundles.keys().next().value!);
    return bundle;
  }
  async summary(bundle: FighterBundle, signal: AbortSignal) {
    const ranked = this.data.fighters[bundle.profile.id];
    if (ranked) return ranked;
    if (!this.media) {
      const media = mediaSchema.parse(await this.json("media.json", signal));
      if (media.datasetVersion !== this.data.datasetVersion)
        throw new Error("Media version mismatch.");
      this.media = media;
    }
    signal.throwIfAborted();
    return fighterSummary(bundle, this.media.fighters[bundle.profile.id]);
  }
}
