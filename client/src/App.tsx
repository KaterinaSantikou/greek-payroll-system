import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeProvider';
import { AppProvider } from './contexts/AppContext';
import { PropertyProvider } from './contexts/PropertyProvider';
import { LocaleProvider } from './lib/i18n';
import Layout from './components/Layout';

// Import pages
import Home from './pages/home';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="payrollsync-theme">
        <LocaleProvider>
          <PropertyProvider>
            <AppProvider>
              <Router>
                <Layout>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/dashboard">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                    <p className="text-gray-600">Dashboard coming soon...</p>
                  </div>
                </Route>
                <Route path="/employees">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">Employee Management</h1>
                    <p className="text-gray-600">Employee management coming soon...</p>
                  </div>
                </Route>
                <Route path="/payroll">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">Payroll Processing</h1>
                    <p className="text-gray-600">Payroll processing coming soon...</p>
                  </div>
                </Route>
                <Route path="/analytics">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">Analytics</h1>
                    <p className="text-gray-600">Analytics coming soon...</p>
                  </div>
                </Route>
                <Route path="/compliance">
                  <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">Compliance Management</h1>
                    <p className="text-gray-600">Compliance management coming soon...</p>
                  </div>
                </Route>
                <Route>
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-4">Page not found</p>
                      <a href="/" className="text-blue-600 hover:text-blue-800">
                        Return to Home
                      </a>
                    </div>
                  </div>
                </Route>
              </Switch>
                </Layout>
              </Router>
            </AppProvider>
          </PropertyProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;