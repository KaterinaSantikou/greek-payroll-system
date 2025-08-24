// Initialize client-side Sentry (MUST be first import)
import { initializeClientSentry } from "@/observability/sentry-client";
initializeClientSentry();

import { Switch, Route } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import Landing from "@/pages/landing";
import LandingPage from "@/pages/LandingPage";
import MarketingLanding from "@/pages/MarketingLanding";
// Aggressive lazy loading for sub-2s Greek internet speeds
// Core pages - highest priority lazy loading
const Home = lazy(() => import("@/pages/home"));

// Critical Greek payroll pages - medium priority
const Employees = lazy(() => import("@/pages/employees"));
const Payroll = lazy(() => import("@/pages/payroll"));
const ErganiCompliance = lazy(() => import("@/pages/erganiCompliance"));

// Feature pages - low priority lazy loading with chunk optimization
const EmployeeMaster = lazy(() => import("@/pages/employeeMaster"));
const Schedules = lazy(() => import("@/pages/schedules"));
const Allowances = lazy(() => import("@/pages/allowances"));
const Overtime = lazy(() => import("@/pages/overtime"));
const Leave = lazy(() => import("@/pages/leave"));
const Legal = lazy(() => import("@/pages/legal"));

// Advanced features - lowest priority, load on demand
const DigitalWorkCard = lazy(() => import("@/pages/digitalWorkCard"));
const AdvancedTimeCapture = lazy(() => import("@/pages/advancedTimeCapture"));
const EnterpriseArchitecture = lazy(() => import("@/pages/enterpriseArchitecture"));
const PayrollIntegration = lazy(() => import("@/pages/payrollIntegration"));
const ManagerWorkflows = lazy(() => import("@/pages/managerWorkflows"));
const HotelOperations = lazy(() => import("@/pages/hotelOperations"));

// Non-critical pages - keep non-lazy for now but consider lazy loading
const HotelEnhancements = lazy(() => import("@/pages/hotelEnhancements"));
const HotelTipPooling = lazy(() => import("@/pages/hotelTipPooling"));
const UXArchitecture = lazy(() => import("@/pages/uxArchitecture"));
const Compliance = lazy(() => import("@/pages/compliance"));

// Status page components
const PublicStatus = lazy(() => import("@/pages/public-status"));

// Analytics and reporting - lazy load with chunking
const Analytics = lazy(() => import("@/pages/analytics"));
const Deployment = lazy(() => import("@/pages/deployment"));
const SuccessMetrics = lazy(() => import("@/pages/successMetrics"));
const KPIDashboard = lazy(() => import("@/pages/kpiDashboard"));
const ModernPayrollEngine = lazy(() => import("@/pages/modernPayrollEngine"));
const ProductVision = lazy(() => import("@/pages/productVision"));

// Data Import - for CSV/Excel import with Greek compliance validation
const DataImport = lazy(() => import("@/pages/DataImport"));

// Payment features - critical for Greek business, medium priority
const Payments = lazy(() => import("@/pages/payments"));
const SepaPayments = lazy(() => import("@/pages/sepaPayments"));
const SepaEngineDemo = lazy(() => import("@/pages/sepaEngineDemo"));
const PaymentOpsChecklist = lazy(() => import("@/pages/paymentOpsChecklist"));

// Employee and management features
const EmployeeSelfService = lazy(() => import("@/pages/employeeSelfService"));
const RulesEngine = lazy(() => import("@/pages/rulesEngine"));
const ManagerDashboard = lazy(() => import("@/pages/managerDashboard"));
const Forecasting = lazy(() => import("@/pages/forecasting"));
const DocumentAI = lazy(() => import("@/pages/documentAI"));
const ChangeLogLegalWatch = lazy(() => import("@/pages/changeLogLegalWatch"));
import { Navigation } from "@/components/Navigation";
import Layout from "@/components/Layout";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
// Mobile and template features - chunked loading
const MobilePayroll = lazy(() => import("@/pages/MobilePayroll"));
const IndustryTemplates = lazy(() => import("@/pages/IndustryTemplates"));
const IntegrationMarketplacePage = lazy(() => import("@/pages/IntegrationMarketplacePage"));
import { usePWA } from "@/hooks/usePWA";
import "@/utils/performanceOptimizations";

// Demo and specialized features - lazy load for performance
const PaymentsCockpitDemo = lazy(() => import('./pages/PaymentsCockpitDemo').then(m => ({ default: m.PaymentsCockpitDemo })));
const SmartNotifications = lazy(() => import("@/pages/smartNotifications"));
const VisualAnalytics = lazy(() => import("@/pages/visualAnalytics"));
const PropertyDashboard = lazy(() => import("@/pages/propertyDashboard"));
const RoleBasedDashboard = lazy(() => import("@/components/RoleBasedDashboard"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AICopilot = lazy(() => import("@/components/AICopilot").then(m => ({ default: m.AICopilot })));

// Mobile and preview features
const MobilePunch = lazy(() => import("@/pages/mobilePunch"));
const PayrollPreview = lazy(() => import("@/pages/payrollPreview"));
const PayExplanationDemo = lazy(() => import("@/pages/payExplanationDemo"));
const AIEnginesDemo = lazy(() => import("@/pages/aiEnginesDemo"));
const ExplanationDemo = lazy(() => import("@/pages/ExplanationDemo").then(m => ({ default: m.ExplanationDemo })));

// Command and workflow features
const CommandPaletteDemo = lazy(() => import("@/pages/commandPaletteDemo"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Exits = lazy(() => import("@/pages/exits"));
const ZeroTrustSecurityPage = lazy(() => import("@/pages/ZeroTrustSecurityPage"));
const TeamsRoles = lazy(() => import("@/pages/teamsRoles"));
// Specialized features and testing - aggressive lazy loading
const S1Dashboard = lazy(() => import("@/pages/S1Dashboard"));
const S1MetricsPage = lazy(() => import("@/pages/S1MetricsPage"));
const S1AcceptanceTesting = lazy(() => import("@/pages/S1AcceptanceTesting"));
const EmbeddedPayroll = lazy(() => import("@/pages/EmbeddedPayroll"));
const EmbedPage = lazy(() => import("@/pages/EmbedPage"));
const SeverancePage = lazy(() => import("@/pages/SeverancePage").then(m => ({ default: m.SeverancePage })));
const SeveranceTestPage = lazy(() => import("@/pages/SeveranceTestPage"));
const GarnishmentPage = lazy(() => import("@/pages/GarnishmentPage"));
const SimpleIbanTest = lazy(() => import("@/pages/SimpleIbanTest"));
const PartnerConsole = lazy(() => import("@/pages/PartnerConsole"));
const Partner = lazy(() => import("@/pages/Partner"));
import { OboProvider } from "@/contexts/OboContext";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import { useExitIntent } from "@/hooks/useExitIntent";
import { ABTestProvider } from "@/components/ABTestProvider";
import { useLocation, useRouter } from "wouter";
import { useEffect, useState } from "react";

// Authentication Pages
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import SSO from "@/pages/auth/SSO";

const GRCCompliance = lazy(() => import("./pages/GRCCompliance"));

// Auth Bootstrap Component
function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{
    authenticated: boolean;
    user: any;
    loading: boolean;
  }>({ authenticated: false, user: null, loading: true });
  const [location] = useLocation();
  const router = useRouter();

  useEffect(() => {
    // Auth bootstrap: fetch user auth status
    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });
        const data = await response.json();
        
        setAuthState({
          authenticated: data.authenticated,
          user: data.user,
          loading: false
        });

        // Navigate to dashboard if authenticated and on login page
        if (data.authenticated && location === '/login') {
          router('/dashboard');
        }
      } catch (error) {
        console.error('Auth bootstrap failed:', error);
        setAuthState({ authenticated: false, user: null, loading: false });
      }
    };

    bootstrap();
  }, [location, router]);

  // Pass auth state to children via context or props
  return children;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { open, setOpen } = useCommandPalette();
  const [location] = useLocation();
  
  // Add check for Replit session before querying user endpoint
  useEffect(() => {
    const hasSessionCookie = document.cookie.includes('connect.sid');
    if (!hasSessionCookie && !isLoading && !isAuthenticated) {
      // Only redirect to login if we're on a protected route (not already on auth routes)
      if (!location.includes('/auth') && !location.includes('/demo') && !location.includes('/marketing') && location !== '/' && location !== '/status') {
        window.location.href = '/api/login';
      }
    }
  }, [isLoading, isAuthenticated, location]);
  
  // Configure exit intent popup based on current page
  const getExitIntentConfig = () => {
    if (location === '/' || location === '/landing' || location === '/marketing') {
      return { variant: 'trial' as const, enabled: !isAuthenticated };
    }
    if (location.includes('/demo') || location.includes('/preview')) {
      return { variant: 'demo' as const, enabled: true };
    }
    if (location.includes('/pricing') || location.includes('/plans')) {
      return { variant: 'discount' as const, enabled: !isAuthenticated };
    }
    if (location.includes('/support') || location.includes('/help')) {
      return { variant: 'support' as const, enabled: true };
    }
    // Default for authenticated users on internal pages
    return { variant: 'newsletter' as const, enabled: isAuthenticated, delay: 30 };
  };

  const exitIntentConfig = getExitIntentConfig();
  const exitIntent = useExitIntent({
    ...exitIntentConfig,
    excludePages: ['/auth/login', '/auth/signup', '/auth', '/api', '/embed'],
    locale: 'en' // Could be dynamic based on user preference
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        {/* Exit Intent for unauthenticated users */}
        <ExitIntentPopup 
          enabled={exitIntent.shouldShow}
          variant={exitIntent.variant}
          locale={exitIntent.locale}
          onCapture={exitIntent.onCapture}
        />
        
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/marketing" component={LandingPage} />
            <Route path="/property-dashboard" component={PropertyDashboard} />
            {/* Authentication Routes */}
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/signup" component={Signup} />
            <Route path="/auth/verify-email" component={VerifyEmail} />
            <Route path="/auth/forgot-password" component={ForgotPassword} />
            <Route path="/auth/reset-password" component={ResetPassword} />
            <Route path="/auth/sso" component={SSO} />
            
            {/* Public status page - accessible without authentication */}
            <Route path="/status" component={PublicStatus} />
            
            {/* Demo pages accessible without authentication */}
            <Route path="/onboarding-chatbot" component={lazy(() => import("@/pages/OnboardingChatbotDemo"))} />
            <Route path="/automated-training" component={lazy(() => import("@/pages/AutomatedTrainingDemo"))} />
            <Route path="/churn-prevention" component={lazy(() => import("@/pages/ChurnPreventionDemo"))} />
            <Route path="/ergani-validation" component={lazy(() => import("@/pages/ERGANIValidationDemo"))} />
            <Route path="/cba-updates" component={lazy(() => import("@/pages/CBAUpdatesDemo"))} />
            <Route path="/tax-law-alerts" component={lazy(() => import("@/pages/TaxLawAlertsDemo"))} />
            <Route path="/digital-inspector-portal" component={lazy(() => import("@/pages/DigitalInspectorPortalDemo"))} />
            <Route path="/cost-benchmarking" component={lazy(() => import("@/pages/CostBenchmarkingDemo"))} />
            <Route path="/predictive-labor-costs" component={lazy(() => import("@/pages/PredictiveLaborCostsDemo"))} />
            <Route path="/compliance-risk-scoring" component={lazy(() => import("@/pages/ComplianceRiskScoringDemo"))} />
            <Route path="/webhook-system" component={lazy(() => import("@/pages/WebhookSystemDemo"))} />
            <Route path="/exit-intent-demo" component={lazy(() => import("@/pages/ExitIntentDemo"))} />
            <Route path="/ab-testing-dashboard" component={lazy(() => import("@/pages/ABTestingDashboard"))} />
            <Route path="/ab-testing-demo" component={lazy(() => import("@/pages/ABTestingDemo"))} />
            <Route path="/roi-calculator" component={lazy(() => import("@/pages/ROICalculator"))} />
            <Route path="/company-setup" component={lazy(() => import("@/pages/CompanySetup"))} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
    );
  }

  return (
    <OboProvider>
      <Layout>
        <CommandPalette open={open} onOpenChange={setOpen} />
        
        {/* Exit Intent Popup */}
        <ExitIntentPopup 
          enabled={exitIntent.shouldShow}
          variant={exitIntent.variant}
          locale={exitIntent.locale}
          onCapture={exitIntent.onCapture}
        />
        
        <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
        <Switch>
        <Route path="/" component={Home} />
        <Route path="/dashboard" component={Home} />
        <Route path="/marketing" component={MarketingLanding} />
        <Route path="/property-dashboard" component={PropertyDashboard} />
        <Route path="/mobile-payroll" component={MobilePayroll} />
        <Route path="/industry-templates" component={IndustryTemplates} />
        <Route path="/integration-marketplace" component={IntegrationMarketplacePage} />
        
        {/* People Section */}
        <Route path="/employees" component={Employees} />
        <Route path="/employee-master" component={EmployeeMaster} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/exits" component={Exits} />
        <Route path="/severance" component={SeverancePage} />
        <Route path="/severance/test" component={SeveranceTestPage} />
        <Route path="/garnishments" component={GarnishmentPage} />
        <Route path="/iban-test" component={SimpleIbanTest} />
        <Route path="/teams-roles" component={TeamsRoles} />
        
        {/* Time Section */}
        <Route path="/punches" component={lazy(() => import("./pages/punches"))} />
        <Route path="/exceptions" component={lazy(() => import("./pages/exceptions"))} />
        <Route path="/devices" component={lazy(() => import("./pages/devices"))} />
        
        {/* Filings Section */}
        <Route path="/filings" component={lazy(() => import("./pages/filings"))} />
        <Route path="/filings/ergani" component={lazy(() => import("./pages/filings"))} />
        <Route path="/filings/efka" component={lazy(() => import("./pages/filings"))} />
        <Route path="/filings/aade" component={lazy(() => import("./pages/filings"))} />
        <Route path="/filings/inspector" component={lazy(() => import("./pages/filings"))} />
        
        {/* Analytics Section */}
        <Route path="/analytics/cost-ot" component={lazy(() => import("./pages/costOtAnalytics"))} />
        
        {/* Employee Portal */}
        <Route path="/employee-portal" component={lazy(() => import("./pages/employeePortal"))} />
            <Route path="/payroll" component={Payroll} />
            <Route path="/payments" component={Payments} />
            <Route path="/sepa-payments" component={SepaPayments} />
            <Route path="/payments-cockpit" component={PaymentsCockpitDemo} />
            <Route path="/sepa-engine-demo" component={SepaEngineDemo} />
            <Route path="/payment-ops-checklist" component={PaymentOpsChecklist} />
            <Route path="/schedules" component={Schedules} />
            <Route path="/allowances" component={Allowances} />
            <Route path="/overtime" component={Overtime} />
            <Route path="/leave" component={Leave} />
            <Route path="/legal" component={Legal} />
            <Route path="/digital-work-card" component={DigitalWorkCard} />
            <Route path="/advanced-time-capture" component={AdvancedTimeCapture} />
            <Route path="/enterprise-architecture" component={EnterpriseArchitecture} />
            <Route path="/ergani-compliance" component={ErganiCompliance} />
            <Route path="/ergani-compliance/overtime" component={ErganiCompliance} />
            <Route path="/ergani-compliance/exceptions" component={ErganiCompliance} />
            <Route path="/payroll-integration" component={PayrollIntegration} />
            <Route path="/manager-workflows" component={ManagerWorkflows} />
            <Route path="/hotel-operations" component={HotelOperations} />
            <Route path="/hotel-enhancements" component={HotelEnhancements} />
            <Route path="/hotel-tip-pooling" component={HotelTipPooling} />
            <Route path="/ux-architecture" component={UXArchitecture} />
            <Route path="/compliance" component={Compliance} />
            <Route path="/grc-compliance" component={GRCCompliance} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/deployment" component={Deployment} />
            <Route path="/success-metrics" component={SuccessMetrics} />
            <Route path="/kpi-dashboard" component={KPIDashboard} />
            <Route path="/payroll-processing" component={lazy(() => import("./pages/payrollProcessing"))} />
            <Route path="/earnings-codes" component={lazy(() => import("./pages/earningsCodesDemo"))} />
            <Route path="/greek-payroll-demo" component={lazy(() => import("./pages/greekPayrollDemo"))} />
            <Route path="/earnings-codes-policy" component={lazy(() => import("./pages/earningsCodesPolicy"))} />
            <Route path="/modern-payroll" component={ModernPayrollEngine} />
            <Route path="/product-vision" component={ProductVision} />
            <Route path="/rules-engine" component={RulesEngine} />
            <Route path="/employee-self-service" component={EmployeeSelfService} />
            <Route path="/manager-dashboard" component={ManagerDashboard} />
            <Route path="/forecasting" component={Forecasting} />
            <Route path="/document-ai" component={DocumentAI} />
            <Route path="/changelog-legal-watch" component={ChangeLogLegalWatch} />
            <Route path="/payroll-run-wizard" component={lazy(() => import("./pages/payrollRunWizard"))} />
            <Route path="/smart-notifications" component={SmartNotifications} />
            <Route path="/visual-analytics" component={VisualAnalytics} />
            <Route path="/mobile-approvals" component={lazy(() => import("./components/MobileManagerApproval"))} />
            <Route path="/mobile-punch" component={MobilePunch} />
            <Route path="/payroll-preview" component={PayrollPreview} />
            <Route path="/pay-explanation-demo" component={PayExplanationDemo} />
            <Route path="/explanation-demo" component={ExplanationDemo} />
            <Route path="/ai-engines-demo" component={AIEnginesDemo} />
            <Route path="/command-palette-demo" component={CommandPaletteDemo} />
            <Route path="/system-status" component={lazy(() => import("@/components/InAppStatusPage"))} />
            <Route path="/incident-communications" component={lazy(() => import("@/components/IncidentCommunicationManager"))} />
            <Route path="/root-cause-analysis" component={lazy(() => import("@/components/RootCauseAnalysisManager"))} />
            <Route path="/incident-ownership" component={lazy(() => import("@/components/IncidentOwnershipManager"))} />
            <Route path="/public-status" component={lazy(() => import("@/components/PublicStatusPage"))} />
            <Route path="/performance-budgets" component={lazy(() => import("@/components/PerformanceBudgetManager"))} />
            <Route path="/disaster-recovery" component={lazy(() => import("@/components/DisasterRecoveryManager"))} />
            <Route path="/dunning-emails" component={lazy(() => import("@/components/DunningEmailManager"))} />
            <Route path="/data-contracts" component={lazy(() => import("./pages/dataContracts"))} />
            <Route path="/data-import" component={DataImport} />
            <Route path="/zero-trust-security" component={ZeroTrustSecurityPage} />
            <Route path="/error-tracking" component={lazy(() => import("@/pages/ErrorTrackingPage"))} />
            <Route path="/automated-training" component={lazy(() => import("@/pages/AutomatedTrainingDemo"))} />
            <Route path="/churn-prevention" component={lazy(() => import("@/pages/ChurnPreventionDemo"))} />
            <Route path="/ergani-validation" component={lazy(() => import("@/pages/ERGANIValidationDemo"))} />
            <Route path="/cba-updates" component={lazy(() => import("@/pages/CBAUpdatesDemo"))} />
            <Route path="/tax-law-alerts" component={lazy(() => import("@/pages/TaxLawAlertsDemo"))} />
            <Route path="/digital-inspector-portal" component={lazy(() => import("@/pages/DigitalInspectorPortalDemo"))} />
            <Route path="/cost-benchmarking" component={lazy(() => import("@/pages/CostBenchmarkingDemo"))} />
            <Route path="/predictive-labor-costs" component={lazy(() => import("@/pages/PredictiveLaborCostsDemo"))} />
            <Route path="/compliance-risk-scoring" component={lazy(() => import("@/pages/ComplianceRiskScoringDemo"))} />
            <Route path="/webhook-system" component={lazy(() => import("@/pages/WebhookSystemDemo"))} />
        <Route path="/s1-dashboard" component={S1Dashboard} />
        <Route path="/s1-metrics" component={S1MetricsPage} />
        <Route path="/s1-acceptance-testing" component={S1AcceptanceTesting} />
        <Route path="/embedded-payroll" component={EmbeddedPayroll} />
        <Route path="/embed" component={EmbedPage} />
        <Route path="/ai-copilot" component={AICopilot} />
        <Route path="/help-center" component={lazy(() => import("@/pages/HelpCenter"))} />
        <Route path="/partner-console" component={PartnerConsole} />
        <Route path="/partner" nest>
          <Partner />
        </Route>
        <Route component={NotFound} />
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
                    <AuthBootstrap>
                      <Toaster />
                      <ErrorBoundary>
                        <Router />
                      </ErrorBoundary>
                      
                      {/* PWA Install Prompt */}
                      {pwaState.canInstall && (
                        <PWAInstallPrompt variant="banner" />
                      )}
                    </AuthBootstrap>
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
