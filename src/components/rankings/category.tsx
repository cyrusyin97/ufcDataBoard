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
  return (
    <label className="mb-[7px] flex h-[54px] items-center text-[10px] tracking-[1.2px]">
      <div
        className={`relative flex h-[47px] w-full items-center gap-3 border border-[#454545] bg-[#1b1b1c] px-[14px] focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-accent ${disabled ? "opacity-70" : ""}`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none text-[8px] tracking-[.9px] text-muted"
        >
          WEIGHT DIVISION
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none text-xs uppercase"
        >
          {divisions.find((d) => d.id === active)?.label}
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none ml-auto text-xl"
        >
          ⌄
        </span>
        <select
          aria-label={en.category}
          value={active}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label.toUpperCase()} · {d.weightLb ?? "—"} LB
            </option>
          ))}
        </select>
      </div>
    </label>
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
