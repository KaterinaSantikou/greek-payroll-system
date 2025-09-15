/**
 * OBO (On-Behalf-Of) Provider - Manages tenant context switching for partner firms
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OboContext {
  currentTenant: string | null;
  currentPartner: string | null;
  oboToken: string | null;
  isOboActive: boolean;
  switchTenant: (partnerFirmId: string, tenantId: string) => Promise<void>;
  clearOboContext: () => void;
  securityMetadata: {
    ttlEnforced?: boolean;
    rotatedTokens?: number;
    responseTime?: number;
    consentVerified?: boolean;
  } | null;
}

const OboContext = createContext<OboContext | null>(null);

export function useObo() {
  const context = useContext(OboContext);
  if (!context) {
    throw new Error('useObo must be used within an OboProvider');
  }
  return context;
}

interface OboProviderProps {
  children: ReactNode;
}

export function OboProvider({ children }: OboProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);
  const [currentPartner, setCurrentPartner] = useState<string | null>(null);
  const [oboToken, setOboToken] = useState<string | null>(null);
  const [securityMetadata, setSecurityMetadata] =
    useState<OboContext['securityMetadata']>(null);
  const { toast } = useToast();

  const isOboActive = !!(currentTenant && currentPartner && oboToken);

  const switchTenant = async (partnerFirmId: string, tenantId: string) => {
    try {
      const response = await apiRequest('/api/partners/obo-token', {
        method: 'POST',
        body: {
          partnerFirmId,
          asTenantId: tenantId,
          scopes: [
            'filings:prepare',
            'filings:submit',
            'runs:view',
            'audit:download',
          ],
          rotateExisting: true, // Always rotate existing tokens for security
        },
      });

      if (response.success) {
        setCurrentTenant(tenantId);
        setCurrentPartner(partnerFirmId);
        setOboToken(response.token);
        setSecurityMetadata(response.securityMetadata);

        // Store token in session storage for API requests
        sessionStorage.setItem('obo_token', response.token);
        sessionStorage.setItem('obo_tenant', tenantId);
        sessionStorage.setItem('obo_partner', partnerFirmId);

        toast({
          title: 'Context Switched',
          description: `Now acting on behalf of tenant (TTL: 10min)`,
        });
      }
    } catch (error: any) {
      if (error.message?.includes('CONSENT_REQUIRED')) {
        toast({
          title: 'Client Consent Required',
          description: 'Client must activate consent before partner access',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Context Switch Failed',
          description: error.message,
          variant: 'destructive',
        });
      }
      throw error;
    }
  };

  const clearOboContext = () => {
    setCurrentTenant(null);
    setCurrentPartner(null);
    setOboToken(null);
    setSecurityMetadata(null);

    sessionStorage.removeItem('obo_token');
    sessionStorage.removeItem('obo_tenant');
    sessionStorage.removeItem('obo_partner');

    toast({
      title: 'Context Cleared',
      description: 'Returned to partner firm context',
    });
  };

  // Restore OBO context from session storage on load
  useEffect(() => {
    const storedToken = sessionStorage.getItem('obo_token');
    const storedTenant = sessionStorage.getItem('obo_tenant');
    const storedPartner = sessionStorage.getItem('obo_partner');

    if (storedToken && storedTenant && storedPartner) {
      setOboToken(storedToken);
      setCurrentTenant(storedTenant);
      setCurrentPartner(storedPartner);
    }
  }, []);

  // Auto-clear context when token expires (10 minutes)
  useEffect(() => {
    if (oboToken) {
      const timer = setTimeout(
        () => {
          clearOboContext();
          toast({
            title: 'Session Expired',
            description: 'OBO token expired for security (10min TTL)',
            variant: 'destructive',
          });
        },
        10 * 60 * 1000
      ); // 10 minutes

      return () => clearTimeout(timer);
    }
  }, [oboToken]);

  const value: OboContext = {
    currentTenant,
    currentPartner,
    oboToken,
    isOboActive,
    switchTenant,
    clearOboContext,
    securityMetadata,
  };

  return <OboContext.Provider value={value}>{children}</OboContext.Provider>;
}
