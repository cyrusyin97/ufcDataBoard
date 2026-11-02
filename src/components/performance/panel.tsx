"use client";
import { useEffect, useRef, useState } from "react";
import type { PerformanceSnapshot } from "@/lib/performance/client";
const number = (value: number | null | undefined, suffix = "") =>
  value == null ? "N/A" : `${value.toFixed(1)}${suffix}`;
export default function PerformancePanel({ onClose }: { onClose(): void }) {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const alive = useRef(false);
  const close = useRef<HTMLButtonElement>(null);
  const sample = () => {
    const api = window.__ufcPerf;
    if (!api || !alive.current) return;
    let next: PerformanceSnapshot;
    try {
      next = api.snapshot();
    } catch {
      api.stop();
      setError("Diagnostics stopped after a sampling error.");
      return;
    }
    setSnapshot(next);
    if (next.status.enabled && next.live?.mean != null)
      setHistory((old) => [...old.slice(-39), next.live!.mean!]);
  };
  useEffect(() => {
    alive.current = true;
    close.current?.focus({ preventScroll: true });
    const api = window.__ufcPerf;
    void api
      ?.start()
      .then(() => {
        if (!alive.current) return;
        api.enableLive();
        sample();
        setBusy(false);
      })
      .catch(() => {
        if (alive.current) {
          setError("Could not start diagnostics. Try again.");
          setBusy(false);
        }
      });
    const timer = setInterval(() => {
      if (!document.hidden) sample();
    }, 500);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.__ufcPerf?.stop();
    };
    // The panel owns one capture lifecycle, independent of product rerenders.
  }, []);
  const live = snapshot?.live;
  const running = snapshot?.status.enabled;
  const panel = useRef<HTMLElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    const clamp = () => {
      const el = panel.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      el.style.left = `${Math.max(8, Math.min(box.left, innerWidth - box.width - 8))}px`;
      el.style.top = `${Math.max(8, Math.min(box.top, innerHeight - box.height - 8))}px`;
      el.style.right = "auto";
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
  return (
    <aside
      ref={panel}
      data-performance-ui
      aria-label="Stats for nerds"
      className="fixed top-4 right-4 z-[100] max-h-[calc(100dvh-32px)] w-[280px] max-w-[calc(100vw-32px)] overflow-y-auto border border-line bg-[#19191a]/75 p-3 text-[10px] leading-relaxed text-[#eeeae2] shadow-2xl"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        data-performance-drag
        className="mb-2 flex touch-none cursor-grab items-center justify-between border-b border-line pb-2 select-none active:cursor-grabbing"
        role="group"
        aria-label="Move diagnostics"
        tabIndex={0}
        title="Drag to move; arrow keys move 10 pixels"
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as Element).closest("button"))
            return;
          const box = panel.current!.getBoundingClientRect();
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const d = drag.current,
            el = panel.current;
          if (!d || d.id !== event.pointerId || !el) return;
          el.style.left = `${Math.max(8, Math.min(d.left + event.clientX - d.x, innerWidth - d.width - 8))}px`;
          el.style.top = `${Math.max(8, Math.min(d.top + event.clientY - d.y, innerHeight - d.height - 8))}px`;
          el.style.right = "auto";
        }}
        onPointerUp={(event) => {
          drag.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          )
            return;
          event.preventDefault();
          const el = panel.current!,
            box = el.getBoundingClientRect();
          el.style.left = `${Math.max(8, Math.min(box.left + (event.key === "ArrowLeft" ? -10 : event.key === "ArrowRight" ? 10 : 0), innerWidth - box.width - 8))}px`;
          el.style.top = `${Math.max(8, Math.min(box.top + (event.key === "ArrowUp" ? -10 : event.key === "ArrowDown" ? 10 : 0), innerHeight - box.height - 8))}px`;
          el.style.right = "auto";
        }}
      >
        <h2 className="font-display text-base uppercase">Stats for nerds</h2>
        <button
          ref={close}
          className="cursor-pointer px-2 text-sm text-muted hover:text-white"
          aria-label="Close diagnostics"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="mb-2 text-[9px] tracking-wider uppercase">
        {busy
          ? "Starting"
          : running
            ? "Live · local only"
            : "Paused · reopen to capture"}
      </p>
      <dl className="space-y-1">
        {row("FPS estimate · last 1s", number(live?.fps))}
        {row(
          "Frame mean / P95 · 10s",
          `${number(live?.mean)} / ${number(live?.p95)} ms`,
        )}
        {row(
          "Long tasks ≥50ms · 10s",
          live?.longTasks ? String(live.longTasks.count) : "N/A",
        )}
        {row(
          "Long tasks total / max",
          live?.longTasks
            ? `${number(live.longTasks.total)} / ${number(live.longTasks.max)} ms`
            : "N/A",
        )}
        {row(
          "Live task entries evicted",
          live?.longTasks ? String(live.longTasks.dropped) : "N/A",
        )}
      </dl>
      <svg
        viewBox="0 0 290 40"
        className="my-2 h-8 w-full"
        role="img"
        aria-label="Recent frame interval trend, capped at 100 milliseconds"
      >
        <path d="M0 33.3H290 M0 20H290" stroke="#323232" fill="none" />
        <polyline
          points={history
            .map((v, i) => `${(i * 290) / 39},${40 - Math.min(v, 100) * 0.4}`)
            .join(" ")}
          fill="none"
          stroke="#e83c39"
          strokeWidth="1"
        />
      </svg>
      <p className="text-[9px] text-muted">
        Frame callback estimate, not GPU FPS. Long tasks include browser work,
        not just JavaScript. Unsupported metrics show N/A.
      </p>
      {error && (
        <p className="mt-2 text-[#e83c39]" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}
