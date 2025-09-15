import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service (Sentry)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          errorBoundary: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo } = this.state;
      const isProduction = process.env.NODE_ENV === 'production';
      const showDetails = this.props.showDetails && !isProduction;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
                Κάτι πήγε στραβά
              </CardTitle>
              <CardDescription className="text-lg">
                Συνάντησα ένα απροσδόκητο σφάλμα. Παρακαλώ δοκιμάστε ξανά ή
                επικοινωνήστε με την υποστήριξη.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                  data-testid="button-retry-error"
                >
                  <RefreshCw className="w-4 h-4" />
                  Δοκίμασε ξανά
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                  data-testid="button-reload-page"
                >
                  <RefreshCw className="w-4 h-4" />
                  Ανανέωση σελίδας
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                  data-testid="button-go-home"
                >
                  <Home className="w-4 h-4" />
                  Αρχική σελίδα
                </Button>
              </div>

              {/* Error Details - Development Only */}
              {showDetails && error && (
                <details className="mt-6">
                  <summary className="cursor-pointer flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-medium">
                    <Bug className="w-4 h-4" />
                    Λεπτομέρειες σφάλματος (Development)
                  </summary>
                  <div className="mt-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm">
                    <div className="font-semibold text-red-800 dark:text-red-200 mb-2">
                      Error: {error.name}
                    </div>
                    <div className="text-red-700 dark:text-red-300 mb-3 font-mono whitespace-pre-wrap">
                      {error.message}
                    </div>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-red-800 dark:text-red-200 mb-1">
                          Stack Trace
                        </summary>
                        <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-auto max-h-40">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {errorInfo && errorInfo.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-red-800 dark:text-red-200 mb-1">
                          Component Stack
                        </summary>
                        <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                </details>
              )}

              {/* Help Text */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                <p>Αν το πρόβλημα συνεχίζει, παρακαλώ:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Ανανεώστε τη σελίδα</li>
                  <li>• Καθαρίστε την cache του browser</li>
                  <li>• Επικοινωνήστε με την τεχνική υποστήριξη</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
