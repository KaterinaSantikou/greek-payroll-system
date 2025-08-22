import { useState, useEffect } from 'react';

interface ApiHealth {
  status: string;
  environment: string;
  timestamp: string;
}

export function PayrollDashboard() {
  const [apiStatus, setApiStatus] = useState<ApiHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then((data: ApiHealth) => {
        setApiStatus(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('API error:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '2.5em', 
            color: '#2563eb', 
            marginBottom: '10px',
            fontWeight: '700'
          }}>
            PayrollSync
          </h1>
          <p style={{ 
            fontSize: '1.2em', 
            color: '#6b7280',
            marginBottom: '20px'
          }}>
            Greek HR & Payroll Management System
          </p>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            borderRadius: '20px',
            fontSize: '0.9em',
            fontWeight: '500'
          }}>
            ✅ React + Vite Working
          </div>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #22c55e'
          }}>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>✅ Frontend</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9em' }}>React 18 + TypeScript + Vite</p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #3b82f6'
          }}>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>✅ Backend</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9em' }}>Express + TypeScript + PostgreSQL</p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderLeft: loading ? '4px solid #f59e0b' : '4px solid #22c55e'
          }}>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>
              {loading ? '⏳' : '✅'} API Status
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.9em' }}>
              {loading ? 'Testing connection...' : 
               apiStatus ? `${apiStatus.environment} - ${apiStatus.status}` : 'Connection failed'}
            </p>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            borderLeft: '4px solid #8b5cf6'
          }}>
            <h3 style={{ color: '#1f2937', marginBottom: '10px' }}>✅ Greek Compliance</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9em' }}>EFKA, ERGANI, Tax calculations ready</p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '20px',
            fontSize: '1.1em'
          }}>
            🎉 React + Vite is now working properly! Ready to build PayrollSync features.
          </p>
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95em',
                fontWeight: '500'
              }}
            >
              Refresh Status
            </button>
            
            <a 
              href="/emergency-test"
              style={{
                background: '#10b981',
                color: 'white',
                padding: '12px 24px',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '0.95em',
                fontWeight: '500'
              }}
            >
              View Diagnostics
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}