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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#dc2626' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: undefined })}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
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

import { PayrollDashboard } from './components/PayrollDashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <PayrollDashboard />
    </ErrorBoundary>
  );
}