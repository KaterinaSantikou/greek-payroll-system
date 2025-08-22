import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("🚀 PayrollSync React app starting...");

const root = document.getElementById("root");
if (root) {
  const reactRoot = createRoot(root);
  reactRoot.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log("✅ React app rendered successfully");
} else {
  console.error("❌ Root element not found");
}