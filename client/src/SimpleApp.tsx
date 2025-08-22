export default function SimpleApp() {
  return (
    <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', marginBottom: '16px' }}>
        PayrollSync
      </h1>
      <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#374151' }}>
        Greek HR & Payroll Management System
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '16px' }}>
        ✅ Simple version - no complex dependencies
      </p>
      <div style={{ 
        backgroundColor: '#dcfce7', 
        padding: '16px', 
        borderRadius: '8px',
        border: '1px solid #bbf7d0'
      }}>
        <p style={{ color: '#166534', fontWeight: 'bold' }}>
          Frontend is working!
        </p>
        <p style={{ fontSize: '14px', color: '#16a34a', marginTop: '8px' }}>
          If you can see this, the React app is running successfully.
        </p>
      </div>
    </div>
  );
}