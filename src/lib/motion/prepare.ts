import type { Context } from "@/lib/performance/contracts";
import type { FighterSummary, Variant } from "@/components/rankings/types";
import { historyFigure } from "@/lib/data/summary";
// Keep only successful readiness and retain a small set of image resources.
// URLs are immutable and versioned. Failed/aborted attempts never enter this cache.
const readyImages = new Map<string, HTMLImageElement>();
const MAX_READY_IMAGES = 4;
async function decode(image: Variant, signal: AbortSignal, trace?: Context) {
  signal.throwIfAborted();
  const cached = readyImages.get(image.url);
  if (cached) {
    readyImages.delete(image.url);
    readyImages.set(image.url, cached);
    trace?.span("decode", "hit")?.();
    return true;
  }
  const end = trace?.span("decode", "miss");
  const element = new Image();
  element.src = image.url;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  let timedOut = false;
  try {
    const ready = await Promise.race([
      element.decode().then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          timedOut = true;
          resolve(false);
        }, 1500);
      }),
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
    signal.throwIfAborted();
    if (ready) {
      readyImages.set(image.url, element);
      if (readyImages.size > MAX_READY_IMAGES)
        readyImages.delete(readyImages.keys().next().value!);
    }
    end?.(
      ready ? "completed" : "error",
      ready ? undefined : timedOut ? "timeout" : "decode-failed",
    );
    return ready;
  } catch (error) {
    end?.(signal.aborted ? "cancelled" : "error");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
export async function prepareFighter(
  summary: FighterSummary,
  detail: boolean,
  signal: AbortSignal,
  trace?: Context,
) {
  signal.throwIfAborted();
  const fonts = trace?.span("fonts");
  let fontTimeout: ReturnType<typeof setTimeout> | undefined;
  let fontAbort = () => {};
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<never>((_, reject) => {
        fontTimeout = setTimeout(
          () => reject(new Error("Fonts are not ready. Retry preparation.")),
          1500,
        );
        fontAbort = () => reject(signal.reason);
        signal.addEventListener("abort", fontAbort, { once: true });
      }),
    ]);
    fonts?.();
  } catch (error) {
    fonts?.(signal.aborted ? "cancelled" : "error");
    throw error;
  } finally {
    clearTimeout(fontTimeout);
    signal.removeEventListener("abort", fontAbort);
  }
  signal.throwIfAborted();
  const fighter = detail ? historyFigure(summary) : summary;
  if (!fighter.figure || (await decode(fighter.figure, signal, trace)))
    return fighter;
  const headshot = fighter.headshotFallback;
  const available =
    headshot &&
    fighter.figureRole !== "headshot" &&
    (await decode(headshot, signal, trace));
  signal.throwIfAborted();
  return {
    ...fighter,
    figure: available ? headshot : null,
    figureRole: available ? ("headshot" as const) : null,
    fullBody: null,
  };
}
