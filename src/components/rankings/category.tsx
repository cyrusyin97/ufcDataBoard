"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Division } from "@/lib/domain/selection";
import { en } from "@/messages/en";
export function CategoryDropdown({
  divisions,
  active,
  onChange,
  disabled,
}: {
  divisions: Division[];
  active: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const selected = divisions.findIndex((d) => d.id === active);
  const focusIndex = useRef(selected);
  const show = (index = selected) => {
    focusIndex.current = Math.max(0, index);
    setOpen(true);
  };
  const close = (focus = false) => {
    setOpen(false);
    if (focus) trigger.current?.focus();
  };
  useEffect(() => {
    if (open) items.current[focusIndex.current]?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className="relative z-[45] mb-[7px] h-[54px] text-[10px] tracking-[1.2px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={en.category}
        aria-describedby={`${menuId}-value`}
        aria-haspopup="menu"
        aria-expanded={open && !disabled}
        aria-controls={open && !disabled ? menuId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(event.key === "ArrowUp" ? divisions.length - 1 : selected);
          }
        }}
        className="flex h-[47px] w-full cursor-pointer items-center gap-3 border border-[#454545] bg-[#1b1b1c] px-[14px] text-left hover:border-cream disabled:cursor-wait disabled:opacity-70"
      >
        <span className="text-[8px] tracking-[.9px] text-muted">
          WEIGHT DIVISION
        </span>
        <span id={`${menuId}-value`} className="text-xs uppercase">
          {divisions[selected]?.label}
        </span>
        <span aria-hidden="true" className="ml-auto text-xl">
          ⌄
        </span>
      </button>
      {open && !disabled && (
        <div
          id={menuId}
          role="menu"
          aria-label={en.category}
          className="absolute inset-x-0 top-[53px] z-[60] border border-[#5a5550] bg-[#202021] p-[6px] shadow-[0_18px_45px_#0009]"
          onKeyDown={(event) => {
            const index = items.current.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            let next: number | undefined;
            if (event.key === "ArrowDown")
              next = (index + 1) % divisions.length;
            if (event.key === "ArrowUp")
              next = (index - 1 + divisions.length) % divisions.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = divisions.length - 1;
            if (next !== undefined) {
              event.preventDefault();
              items.current[next]?.focus();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close(true);
            }
            if (event.key === "Tab") close();
          }}
        >
          {divisions.map((division, index) => (
            <button
              key={division.id}
              type="button"
              role="menuitemradio"
              ref={(node) => {
                items.current[index] = node;
              }}
              tabIndex={-1}
              data-division-option={division.id}
              aria-checked={active === division.id}
              onClick={() => {
                close(true);
                if (division.id !== active) onChange(division.id);
              }}
              className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-[10px] py-[15px] text-left text-[11px] tracking-[.8px] uppercase hover:bg-[#323232] focus-visible:bg-[#323232] aria-checked:bg-[#30302f]"
            >
              <span>{division.label}</span>
              <small className="ml-auto text-[9px] text-muted">
                {division.weightLb ?? "—"} LB
              </small>
              {division.id === active && (
                <span aria-hidden="true" className="text-accent">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function CategoryHeading({ division }: { division: Division }) {
  return (
    <h1
      className="mt-2 flex flex-wrap items-baseline gap-[25px] font-display font-bold text-[clamp(43px,5.1vw,76px)] leading-none tracking-[-1px] uppercase"
      id="division-heading"
      data-motion="category-heading"
    >
      {division.label}
      <span className="text-[28px] font-normal tracking-normal text-[#b0aca6]">
        {division.weightLb ?? "—"}{" "}
        <small className="font-body text-[11px]">LB</small>
      </span>
    </h1>
  );
}
