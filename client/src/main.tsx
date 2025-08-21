// Ultra-minimal main.tsx for debugging
import { createRoot } from "react-dom/client";

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
          PayrollSync Test App
        </h1>
        <p style={{ color: '#374151', marginBottom: '2rem' }}>
          Greek HR & Payroll Management System
        </p>
        <button 
          onClick={() => window.location.href = '/api/login'}
          style={{ 
            backgroundColor: '#2563eb', 
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '8px', 
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Sign In / Σύνδεση
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById("root");
console.log("Root element:", root);

if (root) {
  console.log("Creating React root...");
  createRoot(root).render(<TestApp />);
  console.log("React app rendered!");
} else {
  console.error("Root element not found!");
}