import React, { useState, useEffect } from 'react';

// PayrollSync Frontend with Backend Integration
export default function App() {
  const [backendStatus, setBackendStatus] = useState<string>('checking...');
  const [healthData, setHealthData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check backend connectivity
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealthData(data);
        setBackendStatus(data.status === 'healthy' ? '✅ Connected' : '⚠️ Issues');
      } catch (error) {
        setBackendStatus('❌ Disconnected');
        console.error('Backend connection failed:', error);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', desc: 'Overview & Analytics' },
    { id: 'employees', label: '👥 Employees', desc: 'Employee Management' },
    { id: 'payroll', label: '💰 Payroll', desc: 'Payroll Processing' },
    { id: 'compliance', label: '📋 Compliance', desc: 'Greek HR Compliance' },
    { id: 'analytics', label: '📈 Analytics', desc: 'Business Intelligence' },
    { id: 'payments', label: '🏦 Payments', desc: 'SEPA & Bank Integration' }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(255,255,255,0.1)', 
        backdropFilter: 'blur(10px)',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: 'bold' }}>
              PayrollSync
            </h1>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              Greek HR & Payroll Management System
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              color: 'white', 
              fontSize: '14px', 
              background: backendStatus.includes('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              padding: '4px 12px',
              borderRadius: '20px',
              border: `1px solid ${backendStatus.includes('✅') ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
            }}>
              Backend: {backendStatus}
            </div>
            {healthData && (
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginTop: '4px' }}>
                Uptime: {Math.floor(healthData.uptime)}s | Env: {healthData.environment}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ 
        background: 'rgba(255,255,255,0.05)', 
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`nav-${tab.id}`}
              style={{
                background: activeTab === tab.id 
                  ? 'rgba(255,255,255,0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: activeTab === tab.id 
                  ? '1px solid rgba(255,255,255,0.3)' 
                  : '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{tab.label}</span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>{tab.desc}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '2rem' }}>
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '12px',
          padding: '2rem',
          minHeight: '600px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}>
          {activeTab === 'dashboard' && <DashboardView healthData={healthData} />}
          {activeTab === 'employees' && <EmployeesView />}
          {activeTab === 'payroll' && <PayrollView />}
          {activeTab === 'compliance' && <ComplianceView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'payments' && <PaymentsView />}
        </div>
      </main>
    </div>
  );
}

// Dashboard Component
function DashboardView({ healthData }: { healthData: any }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#1f2937', fontSize: '24px' }}>
        📊 PayrollSync Dashboard
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px' }}>🔧 System Health</h3>
          {healthData ? (
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <p><strong>Status:</strong> {healthData.status}</p>
              <p><strong>Environment:</strong> {healthData.environment}</p>
              <p><strong>Version:</strong> {healthData.version}</p>
              <p><strong>Database:</strong> {healthData.checks?.database ? '✅' : '❌'}</p>
              <p><strong>Memory:</strong> {healthData.checks?.memory ? '✅' : '⚠️'}</p>
              <p><strong>Response Time:</strong> {healthData.responseTime}ms</p>
            </div>
          ) : (
            <p style={{ opacity: 0.8 }}>Loading health data...</p>
          )}
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #10b981, #047857)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px' }}>🚀 Available Features</h3>
          <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '14px', lineHeight: '1.8' }}>
            <li>✅ Employee Management</li>
            <li>✅ Greek Payroll Processing</li>
            <li>✅ SEPA Payments Integration</li>
            <li>✅ ERGANI Compliance</li>
            <li>✅ Analytics & Reporting</li>
            <li>✅ Hotel Operations Support</li>
          </ul>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '18px' }}>🔗 Backend APIs</h3>
          <p style={{ fontSize: '14px', marginBottom: '1rem', opacity: 0.9 }}>
            Your backend has extensive functionality including:
          </p>
          <ul style={{ margin: '0 0 1rem 0', padding: '0 0 0 1rem', fontSize: '14px', lineHeight: '1.6' }}>
            <li>📊 Analytics endpoints</li>
            <li>💳 Payment processing (SEPA)</li>
            <li>📄 Filing & compliance</li>
            <li>🏨 Hotel operations</li>
            <li>📈 Performance metrics</li>
          </ul>
          <button 
            onClick={() => window.open('/api/health', '_blank')}
            data-testid="button-test-api"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Test API Health →
          </button>
        </div>
      </div>
    </div>
  );
}

// Feature Views
function EmployeesView() {
  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>👥 Employee Management</h2>
      <div style={{ 
        background: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center' as const
      }}>
        <p style={{ fontSize: '16px', marginBottom: '1rem', color: '#64748b' }}>
          Employee management features will be implemented here.
        </p>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '1rem' }}>
          Backend APIs available for:
        </p>
        <ul style={{ textAlign: 'left' as const, display: 'inline-block', fontSize: '14px', color: '#64748b' }}>
          <li>Employee CRUD operations</li>
          <li>Department management</li>
          <li>Shift scheduling</li>
          <li>Time tracking</li>
        </ul>
      </div>
    </div>
  );
}

function PayrollView() {
  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>💰 Payroll Processing</h2>
      <div style={{ 
        background: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center' as const
      }}>
        <p style={{ fontSize: '16px', marginBottom: '1rem', color: '#64748b' }}>
          Greek-compliant payroll processing will be implemented here.
        </p>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '1rem' }}>
          Backend supports:
        </p>
        <ul style={{ textAlign: 'left' as const, display: 'inline-block', fontSize: '14px', color: '#64748b' }}>
          <li>Greek tax calculations</li>
          <li>EFKA insurance</li>
          <li>Collective agreements</li>
          <li>Overtime & bonuses</li>
        </ul>
      </div>
    </div>
  );
}

function ComplianceView() {
  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>📋 Greek HR Compliance</h2>
      <div style={{ 
        background: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center' as const
      }}>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '1rem' }}>
          Compliance management features available:
        </p>
        <ul style={{ textAlign: 'left' as const, display: 'inline-block', fontSize: '14px', color: '#64748b' }}>
          <li>ERGANI II integration</li>
          <li>e-EFKA/APD filings</li>
          <li>AADE/ΦΜΥ reports</li>
          <li>Digital work cards</li>
        </ul>
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>📈 Business Analytics</h2>
      <div style={{ 
        background: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center' as const
      }}>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '1rem' }}>
          Analytics & reporting features:
        </p>
        <ul style={{ textAlign: 'left' as const, display: 'inline-block', fontSize: '14px', color: '#64748b' }}>
          <li>Labor forecasting</li>
          <li>Overtime heatmaps</li>
          <li>Compliance KPIs</li>
          <li>Productivity metrics</li>
        </ul>
      </div>
    </div>
  );
}

function PaymentsView() {
  return (
    <div>
      <h2 style={{ margin: '0 0 1.5rem 0', color: '#1f2937' }}>🏦 SEPA Payments</h2>
      <div style={{ 
        background: '#f8fafc',
        border: '2px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '2rem',
        textAlign: 'center' as const
      }}>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '1rem' }}>
          Banking & payment features:
        </p>
        <ul style={{ textAlign: 'left' as const, display: 'inline-block', fontSize: '14px', color: '#64748b' }}>
          <li>SEPA payment generation</li>
          <li>Bank file processing</li>
          <li>Payment reconciliation</li>
          <li>Greek bank integration</li>
        </ul>
      </div>
    </div>
  );
}
      <PayrollDashboard />
    </ErrorBoundary>
  );
}