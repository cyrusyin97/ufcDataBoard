import type { CSSProperties } from "react";
export function MotionText({
  field,
  text,
  offset = 0,
}: {
  field: string;
  text: string;
  offset?: number;
}) {
  return (
    <span aria-label={text} data-motion-field={field}>
      {Array.from(text).map((char, index) => (
        <span
          key={`${index}-${char}`}
          aria-hidden="true"
          data-motion-glyph={`${field}:${index + offset}:${char.toUpperCase()}`}
          className="pointer-events-none inline-block whitespace-pre"
          style={{ transformOrigin: "0 0" } as CSSProperties}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
