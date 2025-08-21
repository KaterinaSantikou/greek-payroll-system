import { Route, Switch } from "wouter";
import { AppProviders } from "@/providers/AppProviders";
import { AppProvider } from "@/contexts/AppContext";
import Home from "@/pages/home";
import Login from "@/pages/auth/Login";
import Layout from "@/components/Layout";

export default function App() {
  return (
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
  );
}