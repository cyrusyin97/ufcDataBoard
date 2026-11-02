import {
  LIMITS,
  routeInfo,
  type Context,
  type TraceRecord,
  type Outcome,
  type Reason,
  type Input,
  type Gesture,
} from "./contracts";
import type { ExperienceRoute } from "../domain/routes";
import { summarize, distribution } from "./export";
export class Recorder {
  enabled = false;
  onFailure?: () => void;
  records: TraceRecord[] = [];
  active = new Map<number, TraceRecord>();
  gestures: Gesture[] = [];
  losses = { evicted: 0, skipped: 0, failures: 0, gestures: 0, frames: 0 };
  private serial = 0;
  private origin = 0;
  private frames: number[] = [];
  private pending = new Map<number, Set<"pendingProxy" | "targetProxy">>();
  private gesture: Gesture | null = null;
  private input: { kind: Input; at: number; delay: number | null } | null =
    null;
  constructor(
    private clock: () => number = () => performance.now(),
    private loaf = false,
  ) {}
  now() {
    return this.clock() - this.origin;
  }
  start() {
    if (this.enabled) return;
    this.origin = this.clock();
    this.clear();
    this.enabled = true;
  }
  clear() {
    if (this.enabled && this.active.size)
      throw new Error("Stop capture before clearing active records.");
    this.records = [];
    this.gestures = [];
    this.frames = [];
    this.pending.clear();
    this.input = null;
    this.gesture = null;
    this.losses = {
      evicted: 0,
      skipped: 0,
      failures: 0,
      gestures: 0,
      frames: 0,
    };
  }
  inputEvent(kind: Input, timestamp: number, epoch: number) {
    if (!this.enabled) return;
    const now = this.clock();
    const stamp = timestamp > 1e12 ? timestamp - epoch : timestamp;
    this.input = {
      kind,
      at: this.now(),
      delay:
        stamp > 0 && stamp <= now && now - stamp < 30000 ? now - stamp : null,
    };
    if (kind === "wheel" || kind === "drag") {
      if (this.gesture?.input !== kind) {
        this.endGesture();
        this.gesture = {
          id: ++this.serial,
          input: kind,
          start: this.now(),
          end: null,
          count: 0,
          latest: null,
          outcome: null,
        };
      }
      this.gesture.count++;
    }
  }
  endGesture() {
    if (!this.gesture) return;
    this.gesture.end = this.now();
    const record = this.records.find((r) => r.id === this.gesture!.latest);
    this.gesture.outcome = record?.outcome ?? null;
    this.gestures.push(this.gesture);
    this.gesture = null;
    if (this.gestures.length > LIMITS.records) {
      this.gestures.shift();
      this.losses.gestures++;
    }
  }
  begin(
    from: ExperienceRoute | null,
    to: ExperienceRoute | null,
    preview = false,
    traversal = false,
  ): Context | undefined {
    if (!this.enabled) return;
    if (this.active.size >= LIMITS.active) {
      this.losses.skipped++;
      return;
    }
    const start = this.now();
    const event = this.input && start - this.input.at < 100 ? this.input : null;
    let scene: TraceRecord["scene"] = "navigation";
    if (preview) scene = "preview";
    else if (from && to) {
      if (from.divisionId !== to.divisionId) scene = "division";
      else if (from.view === "rankings" && to.view === "rankings")
        scene = "dial";
      else if (from.view === "bout" && to.view === "history")
        scene = "bout-return";
      else if (from.view !== "bout" && to.view === "bout") scene = "bout-open";
      else if (from.view === "bout" && to.view === "bout")
        scene = from.fighterId !== to.fighterId ? "participant" : "period";
      else if (to.view === "rankings") scene = "history-return";
      else scene = from.view === "rankings" ? "history-open" : "opponent";
    }
    const r: TraceRecord = {
      id: ++this.serial,
      generation: null,
      gestureId: this.gesture?.id ?? null,
      parentId: null,
      scene,
      input: traversal && !event ? "traverse" : (event?.kind ?? "programmatic"),
      from: from ? routeInfo(from) : null,
      to: to ? routeInfo(to) : null,
      start,
      end: null,
      outcome: null,
      reason: null,
      handlerDelay: event?.delay ?? null,
      marks: {},
      spans: [],
      frames: [],
      frameTruncated: 0,
      spanTruncated: 0,
      longFrames: this.loaf ? { count: 0, duration: 0 } : null,
    };

    this.active.set(r.id, r);
    const alive = () => this.enabled && this.active.get(r.id) === r;
    const safe = (fn: () => void) => {
      try {
        fn();
      } catch {
        this.fault();
      }
    };
    return {
      mark: (name) =>
        safe(() => {
          if (!alive()) return;
          if (name === "committed") r.marks.committed = this.now();
          else {
            let set = this.pending.get(r.id);
            if (!set) {
              set = new Set();
              this.pending.set(r.id, set);
            }
            set.add(name === "pending" ? "pendingProxy" : "targetProxy");
          }
        }),
      generation: (value) =>
        safe(() => {
          if (alive()) {
            r.generation = value;
            if (this.gesture?.id === r.gestureId) this.gesture.latest = r.id;
            for (const g of this.gestures)
              if (g.id === r.gestureId) g.latest = r.id;
          }
        }),
      span: (stage, cache = "unknown") => {
        try {
          if (!alive()) return;
          if (r.spans.length >= LIMITS.spans) {
            r.spanTruncated++;
            return;
          }
          const span = {
            stage,
            cache,
            start: this.now(),
            end: null as number | null,
            outcome: null as Outcome | null,
            detail: null as "timeout" | "decode-failed" | null,
          };
          r.spans.push(span);
          return (outcome = "completed", detail) =>
            safe(() => {
              if (alive() && span.end === null) {
                span.end = this.now();
                span.outcome = outcome;
                span.detail = detail ?? null;
              }
            });
        } catch {
          this.fault();
          return;
        }
      },
      end: (outcome, reason) =>
        safe(() => {
          if (alive()) this.finish(r, outcome, reason);
        }),
    };
  }
  fault() {
    this.losses.failures++;
    this.losses.skipped += this.active.size;
    this.enabled = false;
    this.active.clear();
    this.pending.clear();
    this.gesture = null;
    try {
      this.onFailure?.();
    } catch {
      /* Diagnostic cleanup must not escape into application code. */
    }
  }
  private finish(r: TraceRecord, outcome: Outcome, reason?: Reason) {
    r.end = this.now();
    r.outcome = outcome;
    r.reason = reason ?? null;
    // Unfinished stages are not reported as completed resource work.
    for (const s of r.spans)
      if (s.end === null) {
        s.end = r.end;
        s.outcome = outcome === "completed" ? "incomplete" : outcome;
      }
    this.active.delete(r.id);
    if (outcome !== "completed") this.pending.delete(r.id);
    this.records.push(r);
    for (const g of this.gestures) if (g.latest === r.id) g.outcome = outcome;
    if (this.records.length > LIMITS.records) {
      const evicted = this.records.shift();
      if (evicted) this.pending.delete(evicted.id);
      this.losses.evicted++;
    }
  }
  frame(interval: number | null) {
    if (!this.enabled) return;
    const now = this.now();
    if (interval !== null && this.active.size) {
      if (this.frames.length < LIMITS.frames) this.frames.push(interval);
      else this.losses.frames++;
    }
    for (const [id, marks] of this.pending) {
      const record =
        this.active.get(id) ?? this.records.find((r) => r.id === id);
      if (record)
        for (const mark of marks)
          if (record.marks[mark] === undefined) record.marks[mark] = now;
    }
    this.pending.clear();
    for (const r of this.active.values()) {
      for (const mark of this.pending.get(r.id) ?? [])
        if (r.marks[mark] === undefined) r.marks[mark] = now;
      this.pending.delete(r.id);
      if (interval !== null && now - interval >= r.start) {
        if (r.frames.length < LIMITS.frames) r.frames.push(interval);
        else r.frameTruncated++;
      }
      if (now - r.start >= LIMITS.window)
        this.finish(r, "incomplete", "timeout");
    }
  }
  longFrame(start: number, duration: number) {
    if (!this.enabled) return;
    const relative = start - this.origin;
    for (const r of [...this.active.values(), ...this.records])
      if (
        r.longFrames &&
        relative + duration > r.start &&
        relative < (r.end ?? this.now())
      ) {
        r.longFrames.count++;
        r.longFrames.duration += duration;
      }
  }
  stop(reason: Reason = "stop") {
    this.endGesture();
    for (const r of this.active.values()) this.finish(r, "incomplete", reason);
    this.enabled = false;
    this.pending.clear();
    this.input = null;
  }
  status() {
    return {
      enabled: this.enabled,
      active: this.active.size,
      retained: this.records.length,
      losses: { ...this.losses },
    };
  }
  export() {
    if (this.enabled) throw new Error("Stop capture before export.");
    return structuredClone({
      schemaVersion: 1,
      metricDefinitionVersion: 1,
      mode: "diagnostic",
      percentileMethod: "nearest-rank",
      records: this.records.map(summarize),
      gestures: this.gestures,
      runFrameSummary: distribution(this.frames),
      losses: this.losses,
    });
  }
}
