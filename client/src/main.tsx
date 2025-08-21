import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}

const root = document.getElementById("root");
console.log("Root element found:", !!root);

if (root) {
  console.log("Creating React root...");
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
  console.log("React app rendered successfully!");
} else {
  console.error("Root element not found in DOM!");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: system-ui;">
      <h1 style="color: red;">Error: Root element not found</h1>
      <p>The HTML root element is missing from index.html</p>
    </div>
  `;
}