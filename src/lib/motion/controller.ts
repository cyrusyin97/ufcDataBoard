import gsap from "gsap";
import type { ExperienceRoute } from "@/lib/domain/routes";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
};
type Kind =
  | "category"
  | "opponent"
  | "open"
  | "return"
  | "selection"
  | "initial"
  | "bout-open"
  | "bout-return";
function measure(element: Element): Rect {
  const r = element.getBoundingClientRect(),
    s = getComputedStyle(element);
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    fontSize: parseFloat(s.fontSize),
    color: s.color,
  };
}
function visiblePortrait(element: HTMLElement): Rect {
  const rect = measure(element);
  if (
    element instanceof HTMLImageElement &&
    element.naturalWidth &&
    getComputedStyle(element).objectFit === "contain"
  ) {
    const scale = Math.min(
      rect.width / element.naturalWidth,
      rect.height / element.naturalHeight,
    );
    const width = element.naturalWidth * scale,
      height = element.naturalHeight * scale;
    return {
      ...rect,
      x: rect.x + (rect.width - width) / 2,
      y: rect.y + rect.height - height,
      width,
      height,
    };
  }
  return rect;
}
function leftAway(element: HTMLElement) {
  const rect = measure(element);
  const scale = element.offsetWidth ? rect.width / element.offsetWidth : 1;
  return -(rect.x + rect.width + 24) / Math.max(scale, 0.01);
}
function glyphs(root: Element) {
  return new Map(
    Array.from(root.querySelectorAll<HTMLElement>("[data-motion-glyph]")).map(
      (el) => [el.dataset.motionGlyph!, measure(el)],
    ),
  );
}
export class MotionController {
  private root: HTMLElement | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private touched = new Set<HTMLElement>();
  private overlays: HTMLElement[] = [];
  private floating = new Set<HTMLElement>();
  private slots = new Set<HTMLElement>();
  private viewport: { x: number; y: number } | null = null;
  private resolveDeparture: ((complete: boolean) => void) | null = null;
  private source = new Map<string, Rect>();
  private previewId: string | null = null;
  private figure: Rect | null = null;
  private kind: Kind = "initial";
  private portrait: Rect | null = null;
  private activeBout: string | null = null;
  private returningFighter: string | null = null;
  private historyPositions = new Map<string, number>();
  get historyRestore() {
    if (this.kind !== "bout-return" || !this.activeBout) return null;
    return {
      id: this.activeBout,
      scrollTop:
        this.historyPositions.get(
          `${this.returningFighter}:${this.activeBout}`,
        ) ?? null,
    };
  }
  private boutFades() {
    return this.nodes(
      "[data-bout-fade], [data-profile-fighter], [data-figure-heading], [data-figure-caption]",
    ).filter((el) => el.dataset.boutTitle !== this.activeBout);
  }
  private skipNext = false;
  private dispose: (() => void) | null = null;
  private abortCleanup: (() => void) | null = null;
  private onDone: (() => void) | null = null;
  attach(root: HTMLElement) {
    this.root = root;
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    root.dataset.motionStage = "idle";
    const resize = () => {
      this.skipNext = true;
      this.settle(true);
    };
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    window.addEventListener("resize", resize);
    media.addEventListener("change", resize);
    this.dispose = () => {
      window.removeEventListener("resize", resize);
      media.removeEventListener("change", resize);
      this.settle(false);
      history.scrollRestoration = restoration;
      root.style.removeProperty("min-height");
      this.root = null;
    };
    return () => this.dispose?.();
  }
  get categoryBusy() {
    return this.kind === "category" && !!this.timeline;
  }
  private reduced() {
    return (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      innerWidth <= 900
    );
  }
  capturePreview(id: string) {
    const preview = this.root?.querySelector(`[data-preview-fighter="${id}"]`);
    this.source = preview ? glyphs(preview) : new Map();
    this.previewId = preview ? id : null;
  }
  private track(elements: HTMLElement[]) {
    elements.forEach((el) => this.touched.add(el));
    return elements;
  }
  private nodes(selector: string) {
    return Array.from(this.root?.querySelectorAll<HTMLElement>(selector) ?? []);
  }
  private clear() {
    this.floating.forEach((el) =>
      gsap.set(el, {
        clearProps: "position,left,top,width,height,maxWidth,maxHeight,zIndex",
      }),
    );
    this.floating.clear();
    this.slots.forEach((el) => gsap.set(el, { clearProps: "width,height" }));
    this.slots.clear();
    this.touched.forEach((el) => {
      gsap.killTweensOf(el);
      gsap.set(el, {
        clearProps: "transform,opacity,color,visibility",
      });
    });
    this.touched.clear();
    this.overlays.forEach((el) => el.remove());
    this.overlays = [];
  }
  settle(complete: boolean) {
    this.root?.dispatchEvent(new Event("ufc:motion-settle"));
    this.abortCleanup?.();
    this.abortCleanup = null;
    this.timeline?.kill();
    this.timeline = null;
    this.clear();
    const resolve = this.resolveDeparture;
    this.resolveDeparture = null;
    if (this.root) this.root.dataset.motionStage = "idle";
    resolve?.(complete);
    const done = this.onDone;
    this.onDone = null;
    done?.();
  }
  cancel() {
    this.skipNext = false;
    this.settle(false);
  }
  async depart(
    from: ExperienceRoute,
    to: ExperienceRoute,
    signal: AbortSignal,
  ) {
    const preview =
      to.view !== "rankings" && this.previewId === to.fighterId
        ? this.source
        : new Map<string, Rect>();
    this.settle(false);
    const boutOpen =
      from.view === "history" &&
      to.view === "bout" &&
      from.fighterId === to.fighterId;
    const boutReturn =
      from.view === "bout" &&
      to.view === "history" &&
      from.fighterId === to.fighterId;
    this.kind = boutOpen
      ? "bout-open"
      : boutReturn
        ? "bout-return"
        : from.view !== "rankings" &&
            to.view !== "rankings" &&
            from.fighterId === to.fighterId
          ? "initial"
          : from.divisionId !== to.divisionId
            ? "category"
            : (from.view === "rankings") !== (to.view === "rankings")
              ? to.view !== "rankings"
                ? "open"
                : "return"
              : to.view !== "rankings"
                ? "opponent"
                : "selection";
    this.source = preview;
    this.activeBout =
      to.view === "bout"
        ? to.boutId
        : from.view === "bout"
          ? from.boutId
          : null;
    this.returningFighter = to.fighterId;
    if (boutOpen || boutReturn) {
      const title = this.root?.querySelector(
        `[data-bout-title="${this.activeBout}"]`,
      );
      this.source = title ? glyphs(title) : new Map();
      const portrait = this.root?.querySelector<HTMLElement>(
        "[data-media-role] > img, [data-media-role] > span",
      );
      this.portrait = portrait ? visiblePortrait(portrait) : null;
      if (boutOpen) {
        const scroll = this.root?.querySelector<HTMLElement>(
          "[data-history-scroll]",
        );
        if (scroll && this.activeBout) {
          this.historyPositions.set(
            `${from.fighterId}:${this.activeBout}`,
            scroll.scrollTop,
          );
          if (this.historyPositions.size > 32)
            this.historyPositions.delete(
              this.historyPositions.keys().next().value!,
            );
        }
      }
    }
    this.previewId = null;
    this.figure = this.root?.querySelector("[data-selected-fighter]")
      ? measure(this.root.querySelector("[data-selected-fighter]")!)
      : null;
    if (!this.figure) this.kind = "initial";
    if (
      !["category", "open", "return", "bout-open", "bout-return"].includes(
        this.kind,
      ) ||
      this.reduced() ||
      this.skipNext
    )
      return true;
    const heading = this.nodes("[data-motion=category-heading]"),
      rows = this.nodes("[data-row-drawer]").filter(
        (el) => getComputedStyle(el).visibility !== "hidden",
      ),
      profile = this.nodes("[data-profile-fighter]");
    const image = this.nodes(
      "[data-media-role] > img, [data-media-role] > span, [data-figure-heading], [data-figure-caption]",
    );
    this.track([...heading, ...rows, ...profile, ...image]);
    this.root!.dataset.motionStage = "departing";
    this.root!.dataset.motionKind = this.kind;
    const tl = gsap.timeline({ defaults: { ease: "power2.in" } });
    this.timeline = tl;
    if (this.kind === "bout-open" || this.kind === "bout-return") {
      const fading = this.track(this.boutFades());
      if (fading.length) tl.to(fading, { opacity: 0, duration: 0.18 }, 0);
      else tl.to({}, { duration: 0.01 });
    } else if (this.kind === "category") {
      [...heading, ...rows].forEach((el) =>
        tl.to(el, { x: leftAway(el), duration: 0.34 }, 0),
      );
      profile.forEach((el) =>
        tl.to(el, { x: innerWidth - measure(el).x + 24, duration: 0.4 }, 0),
      );
      tl.to(image, { opacity: 0, duration: 0.22 }, 0.1);
      tl.to({}, { duration: 0.06 }, 0.4);
    } else if (this.kind === "open") {
      rows.forEach((el, index) =>
        tl.to(
          el,
          {
            x: leftAway(el),
            opacity: 0,
            duration: 0.6,
          },
          Math.min(index, 3) * 0.035,
        ),
      );
      if (!rows.length) tl.to({}, { duration: 0.01 });
    } else {
      const card = this.track(this.nodes("[data-history-fighter]"));
      if (card.length) tl.to(card, { opacity: 0, x: 42, duration: 0.26 }, 0);
    }
    return new Promise<boolean>((resolve) => {
      this.resolveDeparture = resolve;
      const abort = () => this.settle(false);
      signal.addEventListener("abort", abort, { once: true });
      this.abortCleanup = () => signal.removeEventListener("abort", abort);
      tl.eventCallback("onComplete", () => {
        // Keep the fully departed layout through a painted frame before React commits.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (this.timeline !== tl) return;
            this.abortCleanup?.();
            this.abortCleanup = null;
            this.resolveDeparture = null;
            this.timeline = null;
            resolve(true);
          }),
        );
      });
    });
  }
  beforeCommit() {
    this.viewport =
      this.kind === "bout-return" ? { x: scrollX, y: scrollY } : null;
    if (this.viewport && this.root) {
      // The shorter history layout must still support the current viewport.
      // Keep this floor after arrival; removing it would clamp scrollY again.
      const documentTop = this.root.getBoundingClientRect().top + scrollY;
      this.root.style.minHeight = `${Math.ceil(scrollY + innerHeight - documentTop)}px`;
    }
    // Only image pixels are copied. Final live text supplies every moving glyph.
    if (
      !this.reduced() &&
      !this.skipNext &&
      this.kind !== "category" &&
      this.kind !== "bout-open" &&
      this.kind !== "bout-return"
    ) {
      const old = this.root?.querySelector<HTMLImageElement>(
        "[data-media-role] > img",
      );
      if (old?.complete && old.naturalWidth) {
        const r = old.getBoundingClientRect(),
          clone = old.cloneNode() as HTMLImageElement;
        clone.alt = "";
        clone.removeAttribute("id");
        clone.setAttribute("aria-hidden", "true");
        clone.dataset.motionOverlay = "image";
        Object.assign(clone.style, {
          position: "fixed",
          left: `${r.x}px`,
          top: `${r.y}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          maxWidth: "none",
          maxHeight: "none",
          pointerEvents: "none",
          zIndex: "35",
          objectFit: "contain",
          objectPosition: "center bottom",
          opacity: "1",
        });
        this.root!.append(clone);
        this.overlays.push(clone);
      }
    }
    // Remove outgoing drawer offsets before measuring the committed layout.
    this.touched.forEach((el) =>
      gsap.set(el, {
        clearProps: "transform,opacity,color,visibility",
      }),
    );
    this.touched.clear();
  }
  arrive(done: () => void) {
    const root = this.root;
    if (!root) {
      done();
      return;
    }
    if (this.viewport) {
      window.scrollTo({
        left: this.viewport.x,
        top: this.viewport.y,
        behavior: "instant",
      });
      this.viewport = null;
    }
    root.dataset.motionKind = this.kind;
    if (this.reduced() || this.skipNext || this.kind === "initial") {
      this.skipNext = false;
      this.clear();
      root.dataset.motionStage = "idle";
      done();
      return;
    }
    this.onDone = done;
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => this.settle(true),
    });
    this.timeline = tl;
    if (this.kind === "bout-open" || this.kind === "bout-return") {
      // Animate the final live pixels and glyphs from their previous geometry.
      // The portrait container never owns opacity or an entrance animation.
      const portraits = this.track(
        this.nodes("[data-media-role] > img, [data-media-role] > span"),
      );
      portraits.forEach((el) => {
        const target = visiblePortrait(el),
          source = this.portrait;
        if (!source || !target.height) return;
        this.floating.add(el);
        gsap.set(el, {
          position: "fixed",
          left: target.x,
          top: target.y,
          width: target.width,
          height: target.height,
          maxWidth: "none",
          maxHeight: "none",
          zIndex: 80,
        });
        tl.fromTo(
          el,
          {
            x: source.x - target.x,
            y: source.y - target.y,
            scale: source.height / target.height,
          },
          { x: 0, y: 0, scale: 1, duration: 1, ease: "power3.inOut" },
          0,
        );
      });
      const title = root.querySelector(
        `[data-bout-title="${this.activeBout}"]`,
      );
      const moving = title
        ? Array.from(title.querySelectorAll<HTMLElement>("[data-motion-glyph]"))
        : [];
      const flights = moving.map((el) => ({
        el,
        source: this.source.get(el.dataset.motionGlyph!),
        target: measure(el),
      }));
      flights.forEach(({ el, source, target }) => {
        if (!source || !target.width || !target.height) return;
        this.track([el]);
        const slot = el.parentElement;
        if (slot?.dataset.motionSlot) {
          this.slots.add(slot);
          gsap.set(slot, { width: target.width, height: target.height });
        }
        this.floating.add(el);
        gsap.set(el, {
          position: "fixed",
          left: target.x,
          top: target.y,
          width: target.width,
          height: target.height,
          zIndex: 80,
        });
        tl.fromTo(
          el,
          {
            x: source.x - target.x,
            y: source.y - target.y,
            scale: source.fontSize / target.fontSize,
            color: source.color,
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            color: target.color,
            duration: 1,
            ease: "power3.inOut",
          },
          0,
        );
      });
      const fading = this.track(this.boutFades());
      if (fading.length)
        tl.fromTo(fading, { opacity: 0 }, { opacity: 1, duration: 0.42 }, 0.12);
      // Maintain a bounded transaction even when source media or title is absent.
      tl.to({}, { duration: 1 }, 0);
      root.dataset.motionStage = "arriving";
      root.dataset.motionStart = String(performance.now());
      return;
    }
    const images = this.track(
      this.nodes("[data-media-role] > img, [data-media-role] > span"),
    );
    const heading = this.nodes("[data-motion=category-heading]"),
      rows = this.nodes("[data-row-drawer]").filter(
        (el) => getComputedStyle(el).visibility !== "hidden",
      ),
      profile = this.nodes("[data-profile-fighter]");
    if (this.kind === "category") {
      this.track([...heading, ...rows, ...profile]);
      [...heading, ...rows].forEach((el, index) =>
        tl.fromTo(
          el,
          { x: leftAway(el) },
          { x: 0, duration: 0.56 },
          index === 0 ? 0 : (index - 1) * 0.035,
        ),
      );
      profile.forEach((el) =>
        tl.fromTo(
          el,
          { x: innerWidth - measure(el).x + 24 },
          { x: 0, duration: 0.62 },
          0.02,
        ),
      );
      const center = this.track(
        this.nodes("[data-figure-heading], [data-figure-caption]"),
      );
      tl.fromTo(
        [...images, ...center],
        { opacity: 0 },
        { opacity: 1, duration: 0.42 },
        0.1,
      );
    } else {
      if (this.kind === "opponent" && this.source.size) {
        const finalGlyphs = this.nodes("[data-final-text] [data-motion-glyph]");
        const flights = finalGlyphs.map((el) => ({
          el,
          source: this.source.get(el.dataset.motionGlyph!),
          target: measure(el),
        }));
        for (const { el, source, target } of flights) {
          if (!source || !source.width || !target.width) continue;
          this.track([el]);
          tl.fromTo(
            el,
            {
              x: source.x - target.x,
              y: source.y - target.y,
              scale: source.fontSize / target.fontSize,
              color: source.color,
            },
            { x: 0, y: 0, scale: 1, color: target.color, duration: 1 },
            0,
          );
        }
      }
      if (this.kind === "open" || this.kind === "return") {
        const figure = this.nodes("[data-selected-fighter]");
        this.track(figure);
        if (this.figure)
          figure.forEach((el) =>
            tl.fromTo(
              el,
              {
                x: this.figure!.x - measure(el).x,
                y: this.figure!.y - measure(el).y,
              },
              { x: 0, y: 0, duration: 0.85 },
              0,
            ),
          );
        const history = this.track(this.nodes("[data-history-fighter]"));
        if (history.length)
          tl.fromTo(
            history,
            { opacity: 0, x: 42, scale: 0.965 },
            { opacity: 1, x: 0, scale: 1, duration: 0.75 },
            0.15,
          );
        const selector = this.track(
          this.nodes("[aria-label='Ranking selector']"),
        );
        selector.forEach((el) =>
          tl.fromTo(el, { x: leftAway(el) }, { x: 0, duration: 0.72 }, 0),
        );
      }
      tl.fromTo(images, { opacity: 0 }, { opacity: 1, duration: 0.62 }, 0.18);
      if (this.overlays.length)
        tl.to(this.overlays, { opacity: 0, duration: 0.26 }, 0);
      if (this.kind === "opponent") tl.to({}, { duration: 1 }, 0);
    }
    root.dataset.motionStage = "arriving";
    root.dataset.motionStart = String(performance.now());
  }
}
