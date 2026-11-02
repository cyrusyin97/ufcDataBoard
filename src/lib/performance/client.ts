import type { ExperienceRoute } from "../domain/routes";
import type { Context } from "./contracts";
import type { Recorder } from "./recorder";
import type { observe } from "./frames";
let recorder: Recorder | undefined;
let observer: ReturnType<typeof observe> | undefined;
let version = 0;
export function beginMeasurement(
  from: ExperienceRoute | null,
  to: ExperienceRoute | null,
  preview = false,
  traversal = false,
): Context | undefined {
  if (!recorder?.enabled) return;
  try {
    const context = recorder.begin(from, to, preview, traversal);
    if (context) observer?.wake();
    return context;
  } catch {
    recorder.fault();
    return;
  }
}
export function installPerformance(datasetVersion: string) {
  const installation = ++version;
  let request = 0;
  let environment: {
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    reducedMotion: boolean;
    browserLabel: null;
  } | null = null;
  const api = {
    async start() {
      if (recorder?.enabled) return recorder.status();
      const ticket = ++request;
      const [{ Recorder }, { observe }] = await Promise.all([
        import("./recorder"),
        import("./frames"),
      ]);
      if (version !== installation || ticket !== request || document.hidden)
        return { enabled: false };
      if (recorder?.enabled) return recorder.status();
      recorder = new Recorder(
        undefined,
        typeof PerformanceObserver !== "undefined" &&
          PerformanceObserver.supportedEntryTypes.includes(
            "long-animation-frame",
          ),
      );
      environment = {
        viewport: { width: innerWidth, height: innerHeight },
        devicePixelRatio,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        browserLabel: null,
      };
      recorder.start();
      observer = observe(recorder);
      return recorder.status();
    },
    enableLive() {
      observer?.enableLive();
    },
    snapshot() {
      const last = recorder?.records.at(-1);
      const duration = (stage: string) =>
        last?.spans.reduce(
          (sum, span) =>
            span.stage === stage && span.end !== null
              ? sum + span.end - span.start
              : sum,
          0,
        ) ?? null;
      return {
        status: api.status(),
        live: observer?.liveSnapshot() ?? null,
        last: last
          ? {
              scene: last.scene,
              outcome: last.outcome,
              total: last.end === null ? null : last.end - last.start,
              prepare: duration("prepare"),
              animation:
                (duration("departure") ?? 0) + (duration("arrival") ?? 0),
            }
          : null,
        datasetVersion,
        buildId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "unknown",
      };
    },
    stop() {
      request++;
      observer?.stop();
      return api.status();
    },
    status() {
      return recorder?.status() ?? { enabled: false, active: 0, retained: 0 };
    },
    clear() {
      recorder?.clear();
    },
    export() {
      if (!recorder) throw new Error("Start and stop a capture before export.");
      return {
        ...recorder.export(),
        buildId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "unknown",
        datasetVersion,
        runLabel: null,
        exportedAt: new Date().toISOString(),
        environment: environment ? structuredClone(environment) : null,
        capabilities: {
          longAnimationFrame:
            typeof PerformanceObserver !== "undefined" &&
            PerformanceObserver.supportedEntryTypes.includes(
              "long-animation-frame",
            ),
        },
      };
    },
  };
  window.__ufcPerf = api;
  return () => {
    if (version === installation) {
      ++version;
      observer?.stop("unmount");
      observer = undefined;
      recorder = undefined;
      delete window.__ufcPerf;
    }
  };
}
declare global {
  interface Window {
    __ufcPerf?: {
      start(): Promise<unknown>;
      enableLive(): void;
      snapshot(): PerformanceSnapshot;
      stop(): unknown;
      status(): unknown;
      clear(): void;
      export(): unknown;
    };
  }
}

export type PerformanceSnapshot = {
  status: {
    enabled: boolean;
    active: number;
    retained: number;
    losses?: {
      evicted: number;
      skipped: number;
      failures: number;
      gestures: number;
      frames: number;
    };
  };
  live: ReturnType<import("./live").LiveMetrics["snapshot"]> | null;
  last: {
    scene: string;
    outcome: string | null;
    total: number | null;
    prepare: number | null;
    animation: number;
  } | null;
  datasetVersion: string;
  buildId: string;
};
