import { useEffect } from 'react';
import { EmbedFrame } from '@/components/embedded/EmbedFrame';

export default function EmbedPage() {
  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const surface = params.get('surface') as any;
    const token = params.get('token');
    const tenantId = params.get('tenantId');
    const locale = params.get('locale') || 'en';
    const theme = (params.get('theme') as 'light' | 'dark') || 'light';
    const runId = params.get('runId');

    // Validate required parameters
    if (!surface || !token || !tenantId) {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'iframe_error',
            error: 'Missing required parameters: surface, token, or tenantId',
          },
          '*'
        );
      }
      return;
    }

    // Validate surface type
    const validSurfaces = [
      'payroll_run',
      'exceptions_review',
      'filings_panel',
      'payments_cockpit',
    ];
    if (!validSurfaces.includes(surface)) {
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: 'iframe_error',
            error: `Invalid surface type: ${surface}`,
          },
          '*'
        );
      }
      return;
    }

    // Set iframe-specific styles
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
  }, []);

  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const surface = params.get('surface') as
    | 'payroll_run'
    | 'exceptions_review'
    | 'filings_panel'
    | 'payments_cockpit';
  const token = params.get('token');
  const tenantId = params.get('tenantId');
  const locale = params.get('locale') || 'en';
  const theme = (params.get('theme') as 'light' | 'dark') || 'light';
  const runId = params.get('runId');

  if (!surface || !token || !tenantId) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">
            Configuration Error
          </h1>
          <p className="text-gray-600">
            Missing required parameters: surface, token, or tenantId
          </p>
        </div>
      </div>
    );
  }

  return (
    <EmbedFrame
      surface={surface}
      token={token}
      tenantId={tenantId}
      locale={locale}
      theme={theme}
      runId={runId || undefined}
    />
  );
}
