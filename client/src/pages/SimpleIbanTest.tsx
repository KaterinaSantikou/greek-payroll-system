/**
 * Simple IBAN Test Page
 * Basic test interface without complex dependencies
 */

import { useState } from 'react';

export default function SimpleIbanTest() {
  const [iban, setIban] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/iban/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: 'TEST001',
          iban,
          accountHolderName: accountHolder,
          language: 'en'
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: 'Test failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">IBAN Validation Test</h1>
      
      <div className="grid gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">IBAN</label>
          <input
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="GR1601400000000012345678901"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Employee Name</label>
          <input
            type="text"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="ΜΑΡΙΑ ΠΑΠΑΔΟΠΟΥΛΟΥ"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Account Holder Name</label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="MARIA PAPADOPOULOU"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          onClick={handleTest}
          disabled={loading || !iban || !accountHolder}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? 'Testing...' : 'Test IBAN Validation'}
        </button>
      </div>
      
      {result && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}