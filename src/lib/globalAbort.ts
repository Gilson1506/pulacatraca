// src/lib/globalAbort.ts
// Simple abort controller for manual cancellation when needed
let controller: AbortController = new AbortController();

const abort = () => {
  controller.abort();
  controller = new AbortController();
};

const signal = () => controller.signal;

export { abort, signal };
