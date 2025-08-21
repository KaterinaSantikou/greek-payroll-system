// Ultra-minimal App to test basic React mounting
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-900 mb-4">PayrollSync Test</h1>
        <p className="text-blue-700 mb-8">Greek HR & Payroll Management System</p>
        <div className="text-sm text-blue-600">React is working!</div>
        <button 
          onClick={() => window.location.href = '/api/login'}
          className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Sign In / Σύνδεση
        </button>
      </div>
    </div>
  );
}

export default App;