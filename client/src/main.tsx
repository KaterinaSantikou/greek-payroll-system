import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// TEMP: Debug client-side redirects to /api/login
const _assign = window.location.assign.bind(window.location);
window.location.assign = (u: any) => {
  if (typeof u === 'string' && u.includes('/api/login')) {
    console.warn('[CLIENT] Navigating to /api/login', new Error().stack);
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

// Service Worker Registration (Production Only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
