import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MinimalApp from "./MinimalApp";

// Add window error listeners to catch any errors
window.addEventListener('error', (e) => {
  console.error('Window error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

console.log("🚀 Starting minimal React app...");

const root = document.getElementById("root");
if (root) {
  try {
    const reactRoot = createRoot(root);
    reactRoot.render(
      <StrictMode>
        <MinimalApp />
      </StrictMode>
    );
    console.log("✅ Minimal app rendered");
  } catch (error) {
    console.error("❌ React render error:", error);
    root.innerHTML = `
      <div style="padding: 20px; text-align: center; background: #fee; border: 2px solid red;">
        <h1>PayrollSync - React Error</h1>
        <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Check browser console for details</p>
      </div>
    `;
  }
} else {
  console.error("❌ Root element not found");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; background: #fef; border: 2px solid purple;">
      <h1>PayrollSync - Setup Error</h1>
      <p>Root element not found in HTML</p>
    </div>
  `;
}