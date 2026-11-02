"use client";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
const Panel = lazy(() => import("./panel"));
class PanelBoundary extends Component<
  { children: ReactNode; onClose(): void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    window.__ufcPerf?.stop();
  }
  render() {
    return this.state.failed ? (
      <div
        role="alert"
        className="fixed top-4 right-4 z-[100] border border-line bg-[#19191a] p-4 text-sm"
      >
        Diagnostics unavailable.{" "}
        <button
          className="cursor-pointer underline"
          onClick={this.props.onClose}
        >
          Close
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function PerformanceLauncher() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const context = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("main")) return;
      if (
        getSelection()?.toString() ||
        target.closest(
          "a, img, svg, canvas, video, button, input, textarea, select, [role=button], [contenteditable], [data-performance-ui]",
        )
      )
        return;
      // Only layout backgrounds, not text, are eligible.
      if (
        Array.from(target.childNodes).some(
          (node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        )
      )
        return;
      event.preventDefault();
      previousFocus.current = document.activeElement as HTMLElement;
      setMenu({
        x: Math.max(8, Math.min(event.clientX, innerWidth - 220)),
        y: Math.max(8, Math.min(event.clientY, innerHeight - 56)),
      });
    };
    const dismiss = (event: PointerEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest("[data-performance-menu]")
      )
        setMenu(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu) {
        setMenu(null);
        previousFocus.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("contextmenu", context);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("contextmenu", context);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  useEffect(() => {
    if (menu) menuButton.current?.focus();
  }, [menu]);
  if (!menu && !open) return null;
  return createPortal(
    <>
      {menu && (
        <div
          data-performance-ui
          data-performance-menu
          role="menu"
          aria-label="Page diagnostics"
          className="fixed z-[100] w-[212px] border border-line bg-[#19191a] p-1 text-[13px] text-[#eeeae2] shadow-xl"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            ref={menuButton}
            role="menuitem"
            className="w-full cursor-pointer px-3 py-2 text-left hover:bg-[#323232]"
            onClick={() => {
              setMenu(null);
              setOpen(true);
            }}
          >
            Stats for nerds
          </button>
        </div>
      )}
      {open && (
        <PanelBoundary onClose={() => setOpen(false)}>
          <Suspense
            fallback={
              <div
                className="fixed top-4 right-4 z-[100] bg-[#19191a] p-4"
                role="status"
              >
                Loading diagnostics…
              </div>
            }
          >
            <Panel
              onClose={() => {
                setOpen(false);
                previousFocus.current?.focus({ preventScroll: true });
              }}
            />
          </Suspense>
        </PanelBoundary>
      )}
    </>,
    document.body,
  );
}
