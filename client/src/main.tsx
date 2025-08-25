import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker Registration (Production Only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Development: Unregister stale service workers to prevent caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => {
      if (!import.meta.env.PROD) r.unregister().catch(() => {});
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
