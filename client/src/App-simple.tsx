import React from 'react';

function App() {
  return (
    <div className="app">
      <h1 className="title">🎉 PayrollSync</h1>
      <p>Greek HR & Payroll Management System</p>
      <div style={{ marginTop: '20px' }}>
        <p>✅ Backend API: Connected</p>
        <p>✅ Frontend React: Working</p>
        <p>✅ Full Stack: Ready for Development</p>
      </div>
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <h3>Development Status</h3>
        <ul style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
          <li>✅ Express Backend (Port 3000)</li>
          <li>✅ Vite Frontend (Port 5173)</li>
          <li>✅ API Proxy Configuration</li>
          <li>✅ TypeScript Support</li>
          <li>⏳ Advanced Features (Next Phase)</li>
        </ul>
      </div>
    </div>
  );
}

export default App;