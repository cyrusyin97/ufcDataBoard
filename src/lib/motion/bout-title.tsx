import { MotionText } from "./text";
/** Keep event words intact while preserving stable character keys across both cards. */
export function BoutTitleText({ id, text }: { id: string; text: string }) {
  return (
    <span aria-label={text}>
      {Array.from(text.matchAll(/\s+|\S+/g)).map((match) => {
        const part = match[0],
          start = match.index;
        return (
          <span
            key={`${start}-${part}`}
            className={/^\s+$/.test(part) ? "whitespace-pre" : "inline-block"}
          >
            <MotionText field={`bout-${id}`} text={part} offset={start} slots />
          </span>
        );
      })}
    </span>
  );
}
