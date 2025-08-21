
<old_str>// Ultra-minimal App to test basic React mounting
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

export default App;</old_str>
<new_str>import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/home";
import Login from "@/pages/auth/Login";
import Layout from "@/components/Layout";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <Router>
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
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}</new_str>
