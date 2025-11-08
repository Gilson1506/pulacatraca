// src/lib/globalAbort.ts
let controller: AbortController = new AbortController();

const abort = () => {
  controller.abort();
  controller = new AbortController();
};

const signal = () => controller.signal;

if (typeof window !== 'undefined') {
  const pushState = history.pushState;
  history.pushState = (...args: any[]) => {
    abort();
    return pushState.apply(history, args as any);
  };
  window.addEventListener('popstate', abort);
}

export { abort, signal };
