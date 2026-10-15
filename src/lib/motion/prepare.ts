import type { FighterSummary, Variant } from "@/components/rankings/types";
import { historyFigure } from "@/lib/data/summary";
async function decode(image: Variant, signal: AbortSignal) {
  signal.throwIfAborted();
  const element = new Image();
  element.src = image.url;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abort = () => {};
  try {
    return await Promise.race([
      element.decode().then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => resolve(false), 1500);
      }),
      new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
export async function prepareFighter(
  summary: FighterSummary,
  detail: boolean,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
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
  } finally {
    clearTimeout(fontTimeout);
    signal.removeEventListener("abort", fontAbort);
  }
  signal.throwIfAborted();
  const fighter = detail ? historyFigure(summary) : summary;
  if (!fighter.figure || (await decode(fighter.figure, signal))) return fighter;
  const headshot = fighter.headshotFallback;
  const available =
    headshot &&
    fighter.figureRole !== "headshot" &&
    (await decode(headshot, signal));
  signal.throwIfAborted();
  return {
    ...fighter,
    figure: available ? headshot : null,
    figureRole: available ? ("headshot" as const) : null,
    fullBody: null,
  };
}
