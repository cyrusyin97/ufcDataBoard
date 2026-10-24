import type { CSSProperties } from "react";
export function MotionText({
  field,
  text,
  offset = 0,
  slots = false,
}: {
  field: string;
  text: string;
  offset?: number;
  slots?: boolean;
}) {
  return (
    <span aria-label={text} data-motion-field={field}>
      {Array.from(text).map((char, index) => {
        const glyph = (
          <span
            key={`${index}-${char}`}
            aria-hidden="true"
            data-motion-glyph={`${field}:${index + offset}:${char.toUpperCase()}`}
            className="pointer-events-none inline-block whitespace-pre"
            style={{ transformOrigin: "0 0" } as CSSProperties}
          >
            {char}
          </span>
        );
        return slots ? (
          <span
            key={`${index}-${char}`}
            data-motion-slot="true"
            className="inline-block align-top"
            aria-hidden="true"
          >
            {glyph}
          </span>
        ) : (
          glyph
        );
      })}
    </span>
  );
}
