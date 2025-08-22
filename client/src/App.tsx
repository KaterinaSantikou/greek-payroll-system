import { Route, Switch } from "wouter";
import { AppProviders } from "@/providers/AppProviders";
import { AppProvider } from "@/contexts/AppContext";
import Home from "@/pages/home";
import Login from "@/pages/auth/Login";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AppProviders>
        <AppProvider>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/home" component={Home} />
              <Route path="/login" component={Login} />
              <Route path="/dashboard" component={Home} />
              <Route>
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
                    <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
                  </div>
                </div>
              </Route>
            </Switch>
          </Layout>
        </AppProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}