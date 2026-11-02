import { LiveMetrics } from "./live";
import type { Recorder } from "./recorder";
export function observe(recorder: Recorder) {
  let frame = 0,
    previous: number | null = null,
    wheel: ReturnType<typeof setTimeout> | undefined,
    down = false,
    moved = false;
  let observer: PerformanceObserver | undefined;
  let disposed = false;
  let live: LiveMetrics | undefined;
  let taskObserver: PerformanceObserver | undefined;
  const fail = () => recorder.fault();
  recorder.onFailure = () => stop("collector");
  const tick = (at: number) => {
    if (disposed) return;
    frame = 0;
    try {
      live?.frame(at);
      recorder.frame(previous === null ? null : at - previous);
      previous = recorder.active.size ? at : null;
      if (recorder.active.size || live) frame = requestAnimationFrame(tick);
    } catch {
      fail();
    }
  };
  const startFrames = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  };
  const input = (event: Event) => {
    try {
      if (event.type === "pointerdown") {
        down = true;
        moved = false;
      }
      if (event.type === "pointermove" && !down) return;
      if (event.type === "pointermove") moved = true;
      const kind =
        event.type === "wheel"
          ? "wheel"
          : event.type === "keydown"
            ? "keyboard"
            : event.type === "pointermove"
              ? "drag"
              : event.type === "click"
                ? "click"
                : "pointer";
      recorder.inputEvent(kind, event.timeStamp, performance.timeOrigin);
      if (kind === "wheel") {
        clearTimeout(wheel);
        wheel = setTimeout(() => recorder.endGesture(), 200);
      }
      if (kind === "drag") startFrames();
    } catch {
      fail();
    }
  };
  const up = () => {
    down = false;
    if (moved) recorder.endGesture();
  };
  const hidden = () => {
    if (document.hidden) stop("hidden");
  };
  const resize = () => stop("resize");
  const events = ["click", "keydown", "wheel", "pointerdown", "pointermove"];
  function stop(
    reason: "stop" | "hidden" | "resize" | "unmount" | "collector" = "stop",
  ) {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    clearTimeout(wheel);
    observer?.disconnect();
    taskObserver?.disconnect();
    for (const event of events)
      document.removeEventListener(event, input, true);
    document.removeEventListener("pointerup", up, true);
    document.removeEventListener("pointercancel", up, true);
    document.removeEventListener("visibilitychange", hidden);
    window.removeEventListener("resize", resize);
    try {
      recorder.stop(reason);
    } catch {
      recorder.fault();
    }
    recorder.onFailure = undefined;
  }
  for (const event of events)
    document.addEventListener(event, input, { capture: true, passive: true });
  document.addEventListener("pointerup", up, { capture: true, passive: true });
  document.addEventListener("pointercancel", up, {
    capture: true,
    passive: true,
  });
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("resize", resize);
  try {
    if (
      typeof PerformanceObserver !== "undefined" &&
      PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")
    ) {
      observer = new PerformanceObserver((list) => {
        try {
          for (const e of list.getEntries())
            recorder.longFrame(e.startTime, e.duration);
        } catch {
          fail();
        }
      });
      observer.observe({ type: "long-animation-frame" });
    }
  } catch {
    recorder.losses.failures++;
  }
  // Scheduling is started by a captured action; idle capture does not poll frames.
  return {
    stop,
    liveSnapshot: () => live?.snapshot(performance.now()) ?? null,
    enableLive: () => {
      if (disposed || live) return;
      const supported =
        typeof PerformanceObserver !== "undefined" &&
        PerformanceObserver.supportedEntryTypes.includes("longtask");
      live = new LiveMetrics(supported);
      if (supported) {
        try {
          taskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              live?.task(entry.startTime, entry.duration);
          });
          taskObserver.observe({ type: "longtask" });
        } catch {
          live.longTasksSupported = false;
        }
      }
      startFrames();
    },
    wake: () => {
      if (!frame) previous = null;
      startFrames();
    },
  };
}
