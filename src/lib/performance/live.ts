// Bounded live counters. The frame callback writes numbers only; UI polls at 2 Hz.
export class LiveMetrics {
  private times = new Float64Array(2048);
  private intervals = new Float64Array(2048);
  private cursor = 0;
  private count = 0;
  private previous: number | null = null;
  private tasks: { at: number; duration: number }[] = [];
  private dropped = 0;
  constructor(public longTasksSupported: boolean) {}
  frame(at: number) {
    if (this.previous !== null) {
      this.times[this.cursor] = at;
      this.intervals[this.cursor] = at - this.previous;
      this.cursor = (this.cursor + 1) % this.times.length;
      this.count = Math.min(this.count + 1, this.times.length);
    }
    this.previous = at;
  }
  task(at: number, duration: number) {
    if (this.tasks.length === 256) {
      this.tasks.shift();
      this.dropped++;
    }
    this.tasks.push({ at, duration });
  }
  snapshot(now: number) {
    const values: number[] = [];
    let recentCount = 0,
      recentTime = 0;
    for (let i = 0; i < this.count; i++) {
      const age = now - this.times[i];
      if (age >= 0 && age <= 10000) values.push(this.intervals[i]);
      if (age >= 0 && age <= 1000) {
        recentCount++;
        recentTime += this.intervals[i];
      }
    }
    values.sort((a, b) => a - b);
    this.tasks = this.tasks.filter((t) => now - (t.at + t.duration) <= 10000);
    return {
      fps: recentTime > 0 ? (recentCount * 1000) / recentTime : null,
      mean: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null,
      p95: values.length ? values[Math.ceil(values.length * 0.95) - 1] : null,
      samples: values.length,
      longTasks: this.longTasksSupported
        ? {
            count: this.tasks.length,
            total: this.tasks.reduce((a, t) => a + t.duration, 0),
            max: this.tasks.reduce((a, t) => Math.max(a, t.duration), 0),
            dropped: this.dropped,
          }
        : null,
    };
  }
}
