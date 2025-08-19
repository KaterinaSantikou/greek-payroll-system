import { useEffect, useState } from "react";
import { PayrollRunWizard } from "./PayrollRunWizard";
import { ExceptionsReview } from "./ExceptionsReview";
import { FilingsPanel } from "./FilingsPanel";
import { PaymentsCockpit } from "./PaymentsCockpit";

interface EmbedFrameProps {
  surface: 'payroll_run' | 'exceptions_review' | 'filings_panel' | 'payments_cockpit';
  token: string;
  tenantId: string;
  locale?: string;
  theme?: 'light' | 'dark';
  runId?: string;
}

export function EmbedFrame({ 
  surface, 
  token, 
  tenantId, 
  locale = 'en', 
  theme = 'light',
  runId 
}: EmbedFrameProps) {
  const [ready, setReady] = useState(false);

  // Handle postMessage communication with parent
  const sendEvent = (eventName: string, data: any) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'payroll_event',
        eventName,
        data,
      }, '*');
    }
  };

  useEffect(() => {
    // Listen for messages from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'init_config') {
        setReady(true);
        // Send ready signal to parent
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'iframe_ready' }, '*');
        }
      } else if (event.data.type === 'update_config') {
        // Handle config updates
        console.log('Config updated:', event.data.config);
      } else if (event.data.type === 'action') {
        // Handle actions from parent
        console.log('Action received:', event.data.action, event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Send initial ready signal
    setTimeout(() => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'iframe_ready' }, '*');
      }
      setReady(true);
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const surfaceProps = {
    accessToken: token,
    onEvent: sendEvent,
    theme,
    locale,
  };

  return (
    <div className={`p-4 ${theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-white'}`}>
      {surface === 'payroll_run' && (
        <PayrollRunWizard {...surfaceProps} runId={runId} />
      )}
      {surface === 'exceptions_review' && (
        <ExceptionsReview {...surfaceProps} />
      )}
      {surface === 'filings_panel' && (
        <FilingsPanel {...surfaceProps} />
      )}
      {surface === 'payments_cockpit' && (
        <PaymentsCockpit {...surfaceProps} />
      )}
    </div>
  );
}