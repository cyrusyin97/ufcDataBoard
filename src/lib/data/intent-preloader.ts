/** One speculative target. Navigation can take ownership of its pending work. */
export class IntentPreloader {
  private task: {
    key: string;
    controller: AbortController;
    promise: Promise<void>;
  } | null = null;
  has(key: string) {
    return this.task?.key === key;
  }
  start(key: string, load: (signal: AbortSignal) => Promise<void>) {
    if (this.task?.key === key) return;
    this.cancel();
    const controller = new AbortController();
    const promise = load(controller.signal).catch(() => {
      controller.abort(); /* Foreground navigation retries failures. */
    });
    this.task = { key, controller, promise };
  }
  cancel() {
    this.task?.controller.abort();
    this.task = null;
  }
  async take(key: string, signal: AbortSignal) {
    const task = this.task;
    this.task = null;
    if (!task) return;
    if (task.key !== key) {
      task.controller.abort();
      return;
    }
    const abort = () => task.controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    try {
      if (signal.aborted) abort();
      await task.promise;
      signal.throwIfAborted();
    } finally {
      signal.removeEventListener("abort", abort);
    }
  }
}
