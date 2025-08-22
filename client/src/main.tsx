import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SimpleApp from "./SimpleApp";

console.log("🚀 Client starting...");
console.log("DOM loaded:", document.readyState);

const root = document.getElementById("root");
console.log("Root element found:", !!root);

if (root) {
  try {
    console.log("Creating React root...");
    const reactRoot = createRoot(root);
    console.log("Rendering SimpleApp...");
    reactRoot.render(
      <StrictMode>
        <SimpleApp />
      </StrictMode>
    );
    console.log("✅ SimpleApp rendered successfully");
  } catch (error) {
    console.error("❌ Error rendering SimpleApp:", error);
    // Fallback render
    root.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h1>PayrollSync</h1>
        <p>Loading error occurred. Check console for details.</p>
        <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    `;
  }
} else {
  console.error("❌ Root element not found! Make sure there's a div with id='root' in your HTML.");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; color: red;">
      <h1>PayrollSync - Setup Error</h1>
      <p>Root element not found in HTML</p>
    </div>
  `;
}