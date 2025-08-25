import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// TEMP: Debug ALL client-side redirects to /api/login
const _assign = window.location.assign.bind(window.location);
window.location.assign = (u: any) => {
  if (typeof u === 'string' && u.includes('/api/login')) {
    console.warn('[CLIENT] window.location.assign to /api/login', new Error().stack);
  }
  // @ts-ignore
  return _assign(u);
};

// Also patch href setter
const _setHref = Object.getOwnPropertyDescriptor(window.location, 'href')?.set?.bind(window.location);
if (_setHref) {
  Object.defineProperty(window.location, 'href', {
    set: function(u: any) {
      if (typeof u === 'string' && u.includes('/api/login')) {
        console.warn('[CLIENT] Setting location.href to /api/login', new Error().stack);
      }
      return _setHref(u);
    },
    get: function() {
      return window.location.toString();
    }
  });
}

// Patch replace method
const _replace = window.location.replace.bind(window.location);
window.location.replace = (u: any) => {
  if (typeof u === 'string' && u.includes('/api/login')) {
    console.warn('[CLIENT] window.location.replace to /api/login', new Error().stack);
  }
  return _replace(u);
};

// Patch pushState and replaceState (for React Router)
const _pushState = history.pushState.bind(history);
history.pushState = function(state: any, title: string, url?: string | URL | null) {
  if (typeof url === 'string' && url.includes('/api/login')) {
    console.warn('[CLIENT] history.pushState to /api/login', new Error().stack);
  }
  return _pushState(state, title, url);
};

const _replaceState = history.replaceState.bind(history);
history.replaceState = function(state: any, title: string, url?: string | URL | null) {
  if (typeof url === 'string' && url.includes('/api/login')) {
    console.warn('[CLIENT] history.replaceState to /api/login', new Error().stack);
  }
  return _replaceState(state, title, url);
};

// Patch fetch to catch redirect responses
const _fetch = window.fetch.bind(window);
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.includes('/api/login')) {
    console.warn('[CLIENT] fetch to /api/login', new Error().stack);
  }
  return _fetch(input, init);
};

// Service Worker Registration (Production Only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
