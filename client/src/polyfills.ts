// Browser compatibility polyfills

// requestIdleCallback polyfill for older browsers
declare global {
  interface Window {
    requestIdleCallback?: (callback: (deadline: IdleDeadline) => void, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (id: number) => void;
  }
}

if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = function(callback: (deadline: IdleDeadline) => void, options?: IdleRequestOptions) {
    const start = Date.now();
    const timeoutId = setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
    return timeoutId;
  };
  
  window.cancelIdleCallback = function(id: number) {
    clearTimeout(id);
  };
}

export {};