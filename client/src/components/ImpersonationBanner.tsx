import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Eye, AlertTriangle, X, Info } from 'lucide-react';

interface ImpersonationBannerProps {
  impersonatorName: string;
  targetEmployeeName: string;
  reason: string;
  startTime: string;
  duration: number; // in minutes
  onExitImpersonation: () => void;
  className?: string;
}

export function ImpersonationBanner({
  impersonatorName,
  targetEmployeeName,
  reason,
  startTime,
  duration,
  onExitImpersonation,
  className = ''
}: ImpersonationBannerProps) {
  const remainingTime = React.useMemo(() => {
    const start = new Date(startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    const remaining = duration - elapsed;
    return Math.max(0, remaining);
  }, [startTime, duration]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className={`sticky top-0 z-50 ${className}`}>
      <Alert className="bg-yellow-50 border-yellow-200 border-l-4 border-l-yellow-400 rounded-none shadow-md">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              <Eye className="h-4 w-4 text-yellow-600" />
            </div>
            
            <div className="flex-1">
              <AlertDescription className="text-yellow-800 font-medium">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>🔍 Administrative View Active</span>
                  <span className="text-yellow-600">|</span>
                  <span>Viewing as <strong>{targetEmployeeName}</strong></span>
                  <span className="text-yellow-600">|</span>
                  <span>By <strong>{impersonatorName}</strong></span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-yellow-700">
                  <span>Reason: {reason}</span>
                  <span>•</span>
                  <span>Time remaining: {formatTime(remainingTime)}</span>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-yellow-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm">
                          <p className="font-semibold mb-1">Impersonation Session Active</p>
                          <p className="text-xs text-muted-foreground">
                            • All write operations are disabled for security
                          </p>
                          <p className="text-xs text-muted-foreground">
                            • This session is being audited and logged
                          </p>
                          <p className="text-xs text-muted-foreground">
                            • Session expires automatically in {formatTime(remainingTime)}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {remainingTime <= 10 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Session expires in {formatTime(remainingTime)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onExitImpersonation}
              className="bg-white hover:bg-yellow-50 text-yellow-800 border-yellow-300 hover:border-yellow-400"
            >
              <X className="w-4 h-4 mr-1" />
              Exit Admin View
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}

// Hook to manage impersonation state
export function useImpersonation() {
  const [impersonationState, setImpersonationState] = React.useState<{
    isActive: boolean;
    impersonatorName?: string;
    targetEmployeeName?: string;
    reason?: string;
    startTime?: string;
    duration?: number;
  }>({ isActive: false });

  React.useEffect(() => {
    const checkImpersonationSession = () => {
      const impersonationToken = sessionStorage.getItem('impersonation_token');
      const impersonationData = sessionStorage.getItem('impersonation_data');
      
      if (impersonationToken && impersonationData) {
        try {
          const data = JSON.parse(impersonationData);
          setImpersonationState({
            isActive: true,
            ...data
          });
        } catch (error) {
          // Invalid impersonation data, clear it
          sessionStorage.removeItem('impersonation_token');
          sessionStorage.removeItem('impersonation_data');
          setImpersonationState({ isActive: false });
        }
      } else {
        setImpersonationState({ isActive: false });
      }
    };

    // Check on mount
    checkImpersonationSession();

    // Check periodically for session expiry
    const interval = setInterval(checkImpersonationSession, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const exitImpersonation = React.useCallback(() => {
    sessionStorage.removeItem('impersonation_token');
    sessionStorage.removeItem('impersonation_data');
    setImpersonationState({ isActive: false });
    
    // Redirect back to admin view
    window.location.href = '/admin/user-management';
  }, []);

  const isWriteDisabled = React.useCallback(() => {
    return impersonationState.isActive;
  }, [impersonationState.isActive]);

  return {
    ...impersonationState,
    exitImpersonation,
    isWriteDisabled
  };
}

// HOC to wrap components with write-disabled functionality during impersonation
interface DisabledDuringImpersonationProps {
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export function DisabledDuringImpersonation({ 
  children, 
  tooltip = "Write operations are disabled during administrative view for security reasons",
  className = ""
}: DisabledDuringImpersonationProps) {
  const { isActive, isWriteDisabled } = useImpersonation();
  
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative ${className}`}>
            <div className="pointer-events-none opacity-60">
              {children}
            </div>
            <div className="absolute inset-0 cursor-not-allowed" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-sm">
            <p className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Administrative View Active
            </p>
            <p className="text-xs text-muted-foreground mt-1">{tooltip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ImpersonationBanner;