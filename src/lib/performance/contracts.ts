import type { ExperienceRoute } from "../domain/routes";
export type Outcome =
  "completed" | "cancelled" | "error" | "ignored" | "incomplete";
export type Reason =
  | "superseded"
  | "resize"
  | "hidden"
  | "stop"
  | "unmount"
  | "timeout"
  | "duplicate"
  | "busy"
  | "request"
  | "collector"
  | "return";
export type Stage =
  | "prepare"
  | "fighter"
  | "index"
  | "media"
  | "bout"
  | "reference"
  | "decode"
  | "fonts"
  | "departure"
  | "commit"
  | "arrival";
export type Cache = "hit" | "miss" | "unknown";
export type Input =
  | "click"
  | "keyboard"
  | "wheel"
  | "drag"
  | "pointer"
  | "traverse"
  | "programmatic";
export type RouteInfo = {
  view: ExperienceRoute["view"];
  division: string | null;
  fighter: string | null;
  bout: string | null;
  period: number | "all" | null;
};
export type Span = {
  stage: Stage;
  start: number;
  end: number | null;
  cache: Cache;
  outcome: Outcome | null;
  detail: "timeout" | "decode-failed" | null;
};
export type TraceRecord = {
  id: number;
  generation: number | null;
  gestureId: number | null;
  parentId: number | null;
  scene:
    | "navigation"
    | "division"
    | "dial"
    | "history-open"
    | "history-return"
    | "bout-open"
    | "bout-return"
    | "participant"
    | "period"
    | "opponent"
    | "preview";
  input: Input;
  from: RouteInfo | null;
  to: RouteInfo | null;
  start: number;
  end: number | null;
  outcome: Outcome | null;
  reason: Reason | null;
  handlerDelay: number | null;
  marks: Partial<Record<"pendingProxy" | "targetProxy" | "committed", number>>;
  spans: Span[];
  frames: number[];
  frameTruncated: number;
  spanTruncated: number;
  longFrames: { count: number; duration: number } | null;
};
export type Context = {
  mark(name: "pending" | "target" | "committed"): void;
  span(
    stage: Stage,
    cache?: Cache,
  ):
    | ((outcome?: Outcome, detail?: "timeout" | "decode-failed") => void)
    | undefined;
  end(outcome: Outcome, reason?: Reason): void;
  generation(value: number): void;
};
export type Gesture = {
  id: number;
  input: Input;
  start: number;
  end: number | null;
  count: number;
  latest: number | null;
  outcome: Outcome | null;
};
export const LIMITS = {
  records: 200,
  active: 16,
  spans: 64,
  frames: 4096,
  window: 30000,
} as const;
export function routeInfo(route: ExperienceRoute): RouteInfo {
  const id = (v: string) => (/^[a-f0-9]{16}$/.test(v) ? v : null);
  return {
    view: route.view,
    division: /^[a-z-]{1,48}$/.test(route.divisionId) ? route.divisionId : null,
    fighter: id(route.fighterId),
    bout: route.view === "bout" ? id(route.boutId) : null,
    period:
      route.view === "bout" && route.round !== "invalid" ? route.round : null,
  };
}
