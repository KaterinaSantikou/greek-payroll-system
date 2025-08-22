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
      <div className="p-8 text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">PayrollSync</h1>
        <h2 className="text-xl mb-4">Greek HR & Payroll Management System</h2>
        <p className="text-gray-600 mb-4">✅ App is loading successfully!</p>
        <div className="bg-green-100 p-4 rounded-lg">
          <p className="text-green-800">Frontend is working - no more crashes!</p>
          <p className="text-sm text-green-600 mt-2">Ready to add back components step by step</p>
        </div>
      </div>
    </ErrorBoundary>
  );
}