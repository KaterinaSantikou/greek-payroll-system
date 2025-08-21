// Browser compatibility polyfills

// requestIdleCallback polyfill for older browsers
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = function(callback: any, options?: any) {
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
  
  (window as any).cancelIdleCallback = function(id: number) {
    clearTimeout(id);
  };
}

export {};