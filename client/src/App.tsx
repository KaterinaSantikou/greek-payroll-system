// Initialize client-side Sentry (MUST be first import)
import { initializeClientSentry } from "@/observability/sentry-client";
initializeClientSentry();

import { Switch, Route, Router } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { AppProvider } from "@/contexts/AppContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { OboProvider } from "@/contexts/OboContext";
import { ABTestProvider } from "@/components/ABTestProvider";
import { usePWA } from "@/hooks/usePWA";
// import PWAInstallPrompt from "@/components/PWAInstallPrompt";

// Lazy loaded components
const Home = lazy(() => import("@/pages/home"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Employees = lazy(() => import("@/pages/employees"));
const Payroll = lazy(() => import("@/pages/payroll"));
const Payments = lazy(() => import("@/pages/payments"));
const Landing = lazy(() => import("@/pages/landing"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const MarketingLanding = lazy(() => import("@/pages/MarketingLanding"));

function Router() {
  return (
    <OboProvider>
      <Layout>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
          <Switch>
            {/* Public routes */}
            <Route path="/" component={LandingPage} />
            <Route path="/landing" component={Landing} />
            <Route path="/marketing" component={MarketingLanding} />
            <Route path="/status" component={lazy(() => import("@/pages/public-status"))} />
            
            {/* Protected routes */}
            <ProtectedRoute path="/dashboard" component={Dashboard} />
            <ProtectedRoute path="/home" component={Home} />
            <ProtectedRoute path="/employees" component={Employees} />
            <ProtectedRoute path="/payroll" component={Payroll} />
            <ProtectedRoute path="/payments" component={Payments} />
            
            {/* 404 fallback */}
            <Route>
              {() => <div style={{padding: 24}}><h1>404 - Page Not Found</h1><a href="/">Go home</a></div>}
            </Route>
          </Switch>
        </Suspense>
      </Layout>
    </OboProvider>
  );
}

function App() {
  const [pwaState] = usePWA();
  
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <UserRoleProvider>
            <PropertyProvider>
              <AppProvider>
                <ABTestProvider>
                  <TooltipProvider>
                    <Toaster />
                    <ErrorBoundary>
                      <Router />
                    </ErrorBoundary>
                    
                    {/* PWA Install Prompt */}
                    {pwaState.canInstall && (
                      <PWAInstallPrompt variant="banner" />
                    )}
                  </TooltipProvider>
                </ABTestProvider>
              </AppProvider>
            </PropertyProvider>
          </UserRoleProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export default App;