import type { TraceRecord } from "./contracts";
export function distribution(values: number[]) {
  if (!values.length)
    return {
      count: 0,
      median: null,
      p95: null,
      max: null,
      above33: 0,
      above50: 0,
    };
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)];
  return {
    count: sorted.length,
    median: percentile(0.5),
    p95: percentile(0.95),
    max: sorted.at(-1)!,
    above33: values.filter((n) => n > 33.3).length,
    above50: values.filter((n) => n > 50).length,
  };
}
export function summarize(record: TraceRecord) {
  const { frames, ...rest } = record;
  return {
    ...rest,
    frameSummary: distribution(frames),
    windowMs: record.end === null ? null : record.end - record.start,
    commitLatency:
      record.marks.committed === undefined
        ? null
        : record.marks.committed - record.start,
    settleLatency:
      record.outcome === "completed" && record.end !== null
        ? record.end - record.start
        : null,
  };
}
