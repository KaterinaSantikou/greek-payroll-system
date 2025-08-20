import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type EmailFormData = z.infer<typeof emailSchema>;

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
  const [, setLocation] = useLocation();
  const [discoveredProvider, setDiscoveredProvider] = useState<typeof ssoProviders[0] | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsDiscovering(true);
    
    // Simulate domain discovery
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
    }, 1500);
  };

  const handleSSORedirect = (provider: typeof ssoProviders[0]) => {
    // In a real implementation, this would redirect to the SSO provider
    const email = form.getValues('email');
    const redirectUrl = `/api/auth/v2/sso/${provider.domain.split('.')[0]}?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(window.location.origin + '/dashboard')}`;
    
    // For demo purposes, show an alert
    alert(`Would redirect to: ${redirectUrl}`);
    
    // In production: window.location.href = redirectUrl;
  };

  if (discoveredProvider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 rounded-full ${discoveredProvider.color} mx-auto mb-4 flex items-center justify-center text-2xl text-white`}>
              {discoveredProvider.icon}
            </div>
            <CardTitle className="text-2xl font-bold">Continue with {discoveredProvider.name}</CardTitle>
            <CardDescription>
              We found your organization uses {discoveredProvider.name} for authentication
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Building2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                You'll be redirected to your organization's login page to sign in securely.
              </AlertDescription>
            </Alert>

            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Email: <strong>{form.getValues('email')}</strong>
              </p>
              <Button
                onClick={() => handleSSORedirect(discoveredProvider)}
                className="w-full"
                size="lg"
              >
                Continue with {discoveredProvider.name}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="space-y-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setDiscoveredProvider(null);
                form.reset();
              }}
            >
              Use different email
            </Button>
            <div className="text-center text-sm">
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 inline-flex items-center">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Single Sign-On</CardTitle>
          <CardDescription>
            Enter your work email to find your organization's sign-in method
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(handleEmailSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...form.register('email')}
                className={form.formState.errors.email ? 'border-red-500' : ''}
                autoFocus
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isDiscovering}
              size="lg"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding your organization...
                </>
              ) : (
                'Continue'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or choose a provider</span>
              </div>
            </div>

            <div className="grid gap-2">
              {ssoProviders.map((provider) => (
                <Button
                  key={provider.domain}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    const email = form.getValues('email') || 'user@' + provider.domain;
                    form.setValue('email', email);
                    setDiscoveredProvider(provider);
                  }}
                >
                  <span className="mr-2 text-lg">{provider.icon}</span>
                  {provider.name}
                </Button>
              ))}
            </div>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm">
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 inline-flex items-center">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to email & password
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}