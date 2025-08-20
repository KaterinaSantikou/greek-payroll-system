import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Removed LocaleProvider import as we're using hook-based approach
import { useAuth } from "@/hooks/useAuth";
import { lazy } from "react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Employees from "@/pages/employees";
import EmployeeMaster from "@/pages/employeeMaster";
import Payroll from "@/pages/payroll";
import Schedules from "@/pages/schedules";
import Allowances from "@/pages/allowances";
import Overtime from "@/pages/overtime";
import Leave from "@/pages/leave";
import Legal from "@/pages/legal";
import DigitalWorkCard from "@/pages/digitalWorkCard";
import AdvancedTimeCapture from "@/pages/advancedTimeCapture";
import EnterpriseArchitecture from "@/pages/enterpriseArchitecture";
import ErganiCompliance from "@/pages/erganiCompliance";
import PayrollIntegration from "@/pages/payrollIntegration";
import ManagerWorkflows from "@/pages/managerWorkflows";
import HotelOperations from "@/pages/hotelOperations";
import HotelEnhancements from "@/pages/hotelEnhancements";
import HotelTipPooling from "@/pages/hotelTipPooling";
import UXArchitecture from "@/pages/uxArchitecture";
import Compliance from "@/pages/compliance";
import Analytics from "@/pages/analytics";
import Deployment from "@/pages/deployment";
import SuccessMetrics from "@/pages/successMetrics";
import KPIDashboard from "@/pages/kpiDashboard";
import ModernPayrollEngine from "@/pages/modernPayrollEngine";
import ProductVision from "@/pages/productVision";
import Payments from "@/pages/payments";
import SepaPayments from "@/pages/sepaPayments";
import SepaEngineDemo from "@/pages/sepaEngineDemo";
import PaymentOpsChecklist from "@/pages/paymentOpsChecklist";
import EmployeeSelfService from "@/pages/employeeSelfService";
import RulesEngine from "@/pages/rulesEngine";
import ManagerDashboard from "@/pages/managerDashboard";
import Forecasting from "@/pages/forecasting";
import DocumentAI from "@/pages/documentAI";
import ChangeLogLegalWatch from "@/pages/changeLogLegalWatch";
import { Navigation } from "@/components/Navigation";
import Layout from "@/components/Layout";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { UserRoleProvider } from "@/contexts/UserRoleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import { PaymentsCockpitDemo } from './pages/PaymentsCockpitDemo';
import SmartNotifications from "@/pages/smartNotifications";
import VisualAnalytics from "@/pages/visualAnalytics";
import PropertyDashboard from "@/pages/propertyDashboard";
import RoleBasedDashboard from "@/components/RoleBasedDashboard";
import Dashboard from "@/pages/dashboard";
import { AICopilot } from "@/components/AICopilot";
import MobilePunch from "@/pages/mobilePunch";
import PayrollPreview from "@/pages/payrollPreview";
import PayExplanationDemo from "@/pages/payExplanationDemo";
import AIEnginesDemo from "@/pages/aiEnginesDemo";
import CommandPaletteDemo from "@/pages/commandPaletteDemo";
import Onboarding from "@/pages/onboarding";
import Exits from "@/pages/exits";
import TeamsRoles from "@/pages/teamsRoles";
import S1Dashboard from "@/pages/S1Dashboard";
import S1MetricsPage from "@/pages/S1MetricsPage";
import S1AcceptanceTesting from "@/pages/S1AcceptanceTesting";
import EmbeddedPayroll from "@/pages/EmbeddedPayroll";
import EmbedPage from "@/pages/EmbedPage";
import { SeverancePage } from "@/pages/SeverancePage";
import { CommandPalette } from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";

// Authentication Pages
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import VerifyEmail from "@/pages/auth/VerifyEmail";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import SSO from "@/pages/auth/SSO";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { open, setOpen } = useCommandPalette();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/property-dashboard" component={PropertyDashboard} />
        {/* Authentication Routes */}
        <Route path="/auth/login" component={Login} />
        <Route path="/auth/signup" component={Signup} />
        <Route path="/auth/verify-email" component={VerifyEmail} />
        <Route path="/auth/forgot-password" component={ForgotPassword} />
        <Route path="/auth/reset-password" component={ResetPassword} />
        <Route path="/auth/sso" component={SSO} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Layout>
      <CommandPalette open={open} onOpenChange={setOpen} />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/property-dashboard" component={PropertyDashboard} />
        
        {/* People Section */}
        <Route path="/employees" component={Employees} />
        <Route path="/employee-master" component={EmployeeMaster} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/exits" component={Exits} />
        <Route path="/severance" component={SeverancePage} />
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
            <Route path="/ai-engines-demo" component={AIEnginesDemo} />
            <Route path="/command-palette-demo" component={CommandPaletteDemo} />
            <Route path="/data-contracts" component={lazy(() => import("./pages/dataContracts"))} />
        <Route path="/s1-dashboard" component={S1Dashboard} />
        <Route path="/s1-metrics" component={S1MetricsPage} />
        <Route path="/s1-acceptance-testing" component={S1AcceptanceTesting} />
        <Route path="/embedded-payroll" component={EmbeddedPayroll} />
        <Route path="/embed" component={EmbedPage} />
        <Route path="/ai-copilot" component={AICopilot} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserRoleProvider>
          <PropertyProvider>
            <AppProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </AppProvider>
          </PropertyProvider>
        </UserRoleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
