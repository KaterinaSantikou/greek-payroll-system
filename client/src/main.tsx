
<old_str>import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// Simple error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}

function TestApp() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f0f9ff',
      fontFamily: 'system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '1rem' }}>
          PayrollSync
        </h1>
        <p style={{ color: '#374151', marginBottom: '2rem' }}>
          Greek HR & Payroll Management System
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            Status: Connected to backend on port 5000
          </p>
        </div>
        <button 
          onClick={() => {
            // Test API connection
            fetch('/api/health')
              .then(res => res.json())
              .then(data => {
                alert(`API Status: ${data.status} - ${data.timestamp}`);
              })
              .catch(err => {
                alert(`API Error: ${err.message}`);
              });
          }}
          style={{ 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            marginRight: '10px'
          }}
        >
          Test API Connection
        </button>
        <button 
          onClick={() => window.location.href = '/api/auth/me'}
          style={{ 
            backgroundColor: '#059669', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Check Auth Status
        </button>
      </div>
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
        <TestApp />
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
}</old_str>
<new_str>import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}</new_str>
