import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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
import Compliance from "@/pages/compliance";
import Analytics from "@/pages/analytics";
import Deployment from "@/pages/deployment";
import SuccessMetrics from "@/pages/successMetrics";
import ModernPayrollEngine from "@/pages/modernPayrollEngine";
import ProductVision from "@/pages/productVision";
import ERGANICompliance from "@/pages/erganiCompliance";
import Layout from "@/components/Layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Layout>
          <Route path="/" component={Home} />
          <Route path="/employees" component={Employees} />
          <Route path="/employee-master" component={EmployeeMaster} />
          <Route path="/payroll" component={Payroll} />
          <Route path="/schedules" component={Schedules} />
          <Route path="/allowances" component={Allowances} />
          <Route path="/overtime" component={Overtime} />
          <Route path="/leave" component={Leave} />
          <Route path="/legal" component={Legal} />
          <Route path="/digital-work-card" component={DigitalWorkCard} />
          <Route path="/advanced-time-capture" component={AdvancedTimeCapture} />
          <Route path="/enterprise-architecture" component={EnterpriseArchitecture} />
          <Route path="/ergani-compliance" component={ErganiCompliance} />
          <Route path="/payroll-integration" component={PayrollIntegration} />
          <Route path="/manager-workflows" component={ManagerWorkflows} />
          <Route path="/hotel-operations" component={HotelOperations} />
          <Route path="/compliance" component={Compliance} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/deployment" component={Deployment} />
          <Route path="/success-metrics" component={SuccessMetrics} />
          <Route path="/modern-payroll" component={ModernPayrollEngine} />
          <Route path="/product-vision" component={ProductVision} />
          <Route path="/ergani-compliance" component={ERGANICompliance} />
        </Layout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
