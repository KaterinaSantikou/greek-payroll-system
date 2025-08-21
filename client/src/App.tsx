import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeProvider";
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
}