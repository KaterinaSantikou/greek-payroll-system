import { Component, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', marginBottom: '16px' }}>PayrollSync</h1>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Greek HR & Payroll Management System</h2>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>✅ App is loading successfully!</p>
        <div style={{ backgroundColor: '#dcfce7', padding: '16px', borderRadius: '8px' }}>
          <p style={{ color: '#166534' }}>Frontend is working - no more crashes!</p>
          <p style={{ fontSize: '14px', color: '#16a34a', marginTop: '8px' }}>Ready to add back components step by step</p>
        </div>
      </div>
    </ErrorBoundary>
  );
}