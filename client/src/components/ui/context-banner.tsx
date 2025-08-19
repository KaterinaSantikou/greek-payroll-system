import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ContextBannerProps {
  type: "impersonation" | "warning" | "info";
  title: string;
  description?: string;
  onDismiss?: () => void;
  className?: string;
}

export function ContextBanner({ 
  type, 
  title, 
  description, 
  onDismiss, 
  className 
}: ContextBannerProps) {
  const baseClasses = "w-full px-4 py-3 border-b flex items-center justify-between";
  
  const typeClasses = {
    impersonation: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
    warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
    info: "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
  };

  return (
    <div className={cn(baseClasses, typeClasses[type], className)}>
      <div className="flex items-center gap-3">
        {type === "warning" && <AlertTriangle className="h-4 w-4" />}
        <div>
          <div className="font-medium text-sm">{title}</div>
          {description && (
            <div className="text-xs opacity-90 mt-1">{description}</div>
          )}
        </div>
      </div>
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}