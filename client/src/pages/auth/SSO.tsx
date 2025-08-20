import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AccessibleInput } from '@/components/ui/accessible-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/utils/validation';

const createEmailSchema = (t: (key: string) => string) => z.object({
  email: z.string()
    .min(1, t('auth.error.required'))
    .refine(validateEmail, t('auth.error.email')),
});

// Mock SSO providers for domain discovery
const ssoProviders = [
  {
    domain: 'google.com',
    name: 'Google Workspace',
    icon: '🔍',
    color: 'bg-blue-500',
  },
  {
    domain: 'microsoft.com',
    name: 'Microsoft Azure AD',
    icon: '🏢',
    color: 'bg-blue-600',
  },
  {
    domain: 'okta.com',
    name: 'Okta',
    icon: '🔐',
    color: 'bg-indigo-500',
  },
];

export default function SSO() {
  const { t, locale } = useTranslation();
  const [, setLocation] = useLocation();
  const [discoveredProvider, setDiscoveredProvider] = useState<typeof ssoProviders[0] | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const emailSchema = createEmailSchema(t);
  type EmailFormData = z.infer<typeof emailSchema>;

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsDiscovering(true);
    
    // Simulate domain discovery with reduced motion support
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 500 : 1500;
    
    setTimeout(() => {
      const emailDomain = data.email.split('@')[1];
      
      // Mock domain discovery logic
      let provider = null;
      if (emailDomain?.includes('gmail') || emailDomain?.includes('google')) {
        provider = ssoProviders[0];
      } else if (emailDomain?.includes('outlook') || emailDomain?.includes('microsoft')) {
        provider = ssoProviders[1];
      } else {
        // Default to a generic provider for demo
        provider = ssoProviders[0];
      }
      
      setDiscoveredProvider(provider);
      setIsDiscovering(false);
    }, delay);
  };

  const handleSSORedirect = (provider: typeof ssoProviders[0]) => {
    // In a real implementation, this would redirect to the SSO provider
    const email = form.getValues('email');
    const redirectUrl = `/api/auth/v2/sso/${provider.domain.split('.')[0]}?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(window.location.origin + '/dashboard')}&locale=${locale}`;
    
    // For demo purposes, show an alert
    alert(`Would redirect to: ${redirectUrl}`);
    
    // In production: window.location.href = redirectUrl;
  };

  if (discoveredProvider) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
        style={{ 
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : undefined 
        }}
      >
        <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 rounded-full ${discoveredProvider.color} mx-auto mb-4 flex items-center justify-center text-2xl text-white`}>
              {discoveredProvider.icon}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('auth.sso.continue')} {discoveredProvider.name}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              We found your organization uses {discoveredProvider.name} for authentication
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                You'll be redirected to your organization's login page to sign in securely.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Email: <strong>{form.getValues('email')}</strong>
              </p>
              <Button
                onClick={() => handleSSORedirect(discoveredProvider)}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                size="lg"
              >
                {t('auth.sso.continue')} {discoveredProvider.name}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="space-y-4 text-center">
            <Button
              variant="ghost"
              className="w-full text-gray-600 dark:text-gray-400"
              onClick={() => {
                setDiscoveredProvider(null);
                form.reset();
              }}
            >
              Use different email
            </Button>
            <div className="text-sm">
              <Link 
                href="/auth/login" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                {t('auth.sso.backToLogin')}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
      style={{ 
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : undefined 
      }}
    >
      <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('auth.sso.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('auth.sso.description')}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(handleEmailSubmit)} noValidate>
          <CardContent className="space-y-6">
            <AccessibleInput
              label={t('auth.sso.workEmail')}
              id="sso-email"
              type="email"
              placeholder="name@company.com"
              required
              autoComplete="email"
              autoFocus
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={isDiscovering || !form.formState.isValid}
              size="lg"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Finding your organization...
                </>
              ) : (
                t('auth.continue')
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or choose a provider</span>
              </div>
            </div>

            <div className="grid gap-2">
              {ssoProviders.map((provider) => (
                <Button
                  key={provider.domain}
                  type="button"
                  variant="outline"
                  className="w-full justify-start border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    const email = form.getValues('email') || 'user@' + provider.domain;
                    form.setValue('email', email);
                    setDiscoveredProvider(provider);
                  }}
                >
                  <span className="mr-2 text-lg" aria-hidden="true">{provider.icon}</span>
                  {provider.name}
                </Button>
              ))}
            </div>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm">
              <Link 
                href="/auth/login" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                {t('auth.sso.backToLogin')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}