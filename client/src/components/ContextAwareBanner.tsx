import { useAppContext } from "@/contexts/AppContext";
import { ContextBanner } from "./ui/context-banner";
import { useAuth } from "@/hooks/useAuth";

export function ContextAwareBanner() {
  const { viewingMode, exitViewingMode } = useAppContext();
  const { user } = useAuth();

  if (viewingMode.type === "normal") {
    return null;
  }

  if (viewingMode.type === "impersonation") {
    return (
      <ContextBanner
        type="impersonation"
        title={`Impersonating ${viewingMode.targetEmployee?.name || "Employee"}`}
        description="You are viewing the system as this employee. Click to exit impersonation mode."
        onDismiss={exitViewingMode}
      />
    );
  }

  if (viewingMode.type === "employee_view") {
    return (
      <ContextBanner
        type="info"
        title="Employee View Mode"
        description={`Viewing as Employee — Original role: ${viewingMode.originalRole || user?.firstName}`}
        onDismiss={exitViewingMode}
      />
    );
  }

  return null;
}