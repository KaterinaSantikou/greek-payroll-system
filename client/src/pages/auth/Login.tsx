import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AccessibleInput } from '@/components/ui/accessible-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ArrowLeft, Globe, Shield, Mail, Building2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/utils/validation';
import { addCSRFHeader } from '@/utils/validation';
import { MfaModal } from '@/components/auth/MfaModal';

// Multi-step schemas for identifier-first flow
const createEmailSchema = () => z.object({
  email: z.string()
    .min(1, 'Email is required')
    .refine(validateEmail, 'Please enter a valid email address'),
  locale: z.enum(['en', 'el']).default('en'),
});

const createPasswordSchema = () => z.object({
  email: z.string(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
  locale: z.enum(['en', 'el']).default('en'),
});

type LoginStep = 'email' | 'password' | 'sso' | 'mfa';

interface EnterpriseConfig {
  domain: string;
  name: string;
  ssoProviders: ('google' | 'microsoft' | 'azure' | 'okta')[];
  requiresSso: boolean;
}

// Mock enterprise configurations (in production, this would come from backend)
const ENTERPRISE_CONFIGS: EnterpriseConfig[] = [
  {
    domain: 'santikos.com',
    name: 'Santikos Hotels',
    ssoProviders: ['google', 'microsoft'],
    requiresSso: true,
  },
  {
    domain: 'divani.gr',
    name: 'Divani Collection Hotels',
    ssoProviders: ['microsoft', 'azure'],
    requiresSso: true,
  },
  {
    domain: 'grecotel.com',
    name: 'Grecotel Hotels & Resorts',
    ssoProviders: ['google', 'okta'],
    requiresSso: false,
  },
];

export default function Login() {
  const { t, locale, changeLanguage } = useTranslation();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<LoginStep>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentLocale, setCurrentLocale] = useState<'en' | 'el'>(locale as 'en' | 'el');
  const [enterpriseConfig, setEnterpriseConfig] = useState<EnterpriseConfig | null>(null);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<any>(null);
  
  const [deviceFingerprint] = useState(() => {
    // Enhanced device fingerprint for risk assessment
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 2, 2);
    const canvasFingerprint = canvas.toDataURL();
    
    return btoa(`${navigator.userAgent}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}-${navigator.language}-${canvasFingerprint.slice(0, 50)}`);
  });

  const emailSchema = createEmailSchema();
  const passwordSchema = createPasswordSchema();
  
  type EmailFormData = z.infer<typeof emailSchema>;
  type PasswordFormData = z.infer<typeof passwordSchema>;

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
      locale: currentLocale,
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
      locale: currentLocale,
    },
  });

  const handleLanguageChange = (newLocale: 'en' | 'el') => {
    setCurrentLocale(newLocale);
    emailForm.setValue('locale', newLocale);
    passwordForm.setValue('locale', newLocale);
    changeLanguage(newLocale);
  };

  // Check for enterprise SSO configuration
  const checkEnterpriseConfig = async (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      const config = ENTERPRISE_CONFIGS.find(c => c.domain === domain);
      setEnterpriseConfig(config || null);
      return config;
    }
    return null;
  };

  const emailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
        'x-device-fingerprint': deviceFingerprint,
      });

      // Check if email exists and get auth method
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: data.email,
          locale: data.locale,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Email verification failed');
      }

      return response.json();
    },
    onSuccess: async (data, variables) => {
      setUserEmail(variables.email);
      passwordForm.setValue('email', variables.email);
      
      // Check enterprise configuration
      const enterpriseConfig = await checkEnterpriseConfig(variables.email);
      
      if (enterpriseConfig && enterpriseConfig.requiresSso) {
        setCurrentStep('sso');
      } else {
        setCurrentStep('password');
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
        'x-device-fingerprint': deviceFingerprint,
      });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
          locale: data.locale,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid credentials');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresMfa) {
        setMfaChallenge(data.mfaChallenge);
        setShowMfaModal(true);
      } else {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo');
        setLocation(returnTo || '/dashboard');
      }
    },
  });

  const ssoMutation = useMutation({
    mutationFn: async (provider: string) => {
      const returnTo = new URLSearchParams(window.location.search).get('returnTo') || '/dashboard';
      window.location.href = `/api/auth/sso/${provider}?email=${encodeURIComponent(userEmail)}&locale=${currentLocale}&returnTo=${encodeURIComponent(returnTo)}`;
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          email, 
          locale: currentLocale,
          returnTo: new URLSearchParams(window.location.search).get('returnTo') || '/dashboard'
        }),
      });

      // Always show success message for security (don't reveal if email exists)
      return { success: true };
    },
  });

  const handleMfaVerify = async (method: 'totp' | 'webauthn' | 'backup', value: string) => {
    try {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: userEmail,
          method,
          code: value,
          challengeId: mfaChallenge?.id,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowMfaModal(false);
          const returnTo = new URLSearchParams(window.location.search).get('returnTo');
          setLocation(returnTo || '/dashboard');
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const onEmailSubmit = (data: EmailFormData) => {
    emailMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    loginMutation.mutate(data);
  };

  const handleMagicLink = () => {
    magicLinkMutation.mutate(userEmail);
  };

  const handleBack = () => {
    if (currentStep === 'password' || currentStep === 'sso') {
      setCurrentStep('email');
      setEnterpriseConfig(null);
      setUserEmail('');
    }
  };

  const translations = {
    en: {
      title: 'Welcome back',
      subtitle: 'Sign in to your PayrollSync account',
      email: 'Work email',
      password: 'Password',
      continue: 'Continue',
      signIn: 'Sign in',
      rememberMe: 'Keep me signed in',
      forgotPassword: 'Forgot your password?',
      noAccount: 'Don\'t have an account?',
      signUp: 'Sign up',
      language: 'Language',
      english: 'English',
      greek: 'Ελληνικά',
      back: 'Back',
      orSignInWith: 'Or sign in with',
      magicLink: 'Email me a magic link',
      magicLinkSent: 'Check your email for a magic link',
      enterpriseSSO: 'Sign in with your organization account',
      continueWith: 'Continue with',
      securityNote: 'MFA required for this account based on security policy',
    },
    el: {
      title: 'Καλώς ήρθατε πίσω',
      subtitle: 'Συνδεθείτε στον λογαριασμό σας PayrollSync',
      email: 'Email εργασίας',
      password: 'Κωδικός πρόσβασης',
      continue: 'Συνέχεια',
      signIn: 'Σύνδεση',
      rememberMe: 'Διατήρηση σύνδεσης',
      forgotPassword: 'Ξεχάσατε τον κωδικό σας;',
      noAccount: 'Δεν έχετε λογαριασμό;',
      signUp: 'Εγγραφή',
      language: 'Γλώσσα',
      english: 'English',
      greek: 'Ελληνικά',
      back: 'Πίσω',
      orSignInWith: 'Ή συνδεθείτε με',
      magicLink: 'Στείλτε μου magic link',
      magicLinkSent: 'Ελέγξτε το email σας για magic link',
      enterpriseSSO: 'Σύνδεση με τον λογαριασμό της εταιρείας σας',
      continueWith: 'Συνέχεια με',
      securityNote: 'Απαιτείται MFA για αυτόν τον λογαριασμό βάσει πολιτικής ασφαλείας',
    },
  };

  const text = translations[currentLocale];

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return <Mail className="h-4 w-4" />;
      case 'microsoft': return <Shield className="h-4 w-4" />;
      case 'azure': return <Building2 className="h-4 w-4" />;
      case 'okta': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const error = emailMutation.error || loginMutation.error;
  const isLoading = emailMutation.isPending || loginMutation.isPending || ssoMutation.isPending;

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
      style={{ 
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : undefined 
      }}
    >
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          {/* Language Toggle */}
          <div className="flex justify-end mb-4">
            <Select value={currentLocale} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-32">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{text.english}</SelectItem>
                <SelectItem value="el">{text.greek}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {text.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {text.subtitle}
            </CardDescription>
          </div>

          {/* Progress Indicator */}
          {currentStep !== 'email' && (
            <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-500"
              >
                <ArrowLeft className="h-4 w-4" />
                {text.back}
              </button>
              <div className="text-gray-600">
                {userEmail}
              </div>
            </div>
          )}
        </CardHeader>

        {/* Step 1: Email Input */}
        {currentStep === 'email' && (
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error instanceof Error ? error.message : 'An error occurred'}
                  </AlertDescription>
                </Alert>
              )}

              <AccessibleInput
                label={text.email}
                id="login-email"
                type="email"
                placeholder="name@company.com"
                required
                autoComplete="email"
                autoFocus
                {...emailForm.register('email')}
                error={emailForm.formState.errors.email?.message}
              />

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Checking...
                  </>
                ) : (
                  <>
                    {text.continue}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>
        )}

        {/* Step 2a: Password Input (Native Auth) */}
        {currentStep === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error instanceof Error ? error.message : 'An error occurred'}
                  </AlertDescription>
                </Alert>
              )}

              {magicLinkMutation.isSuccess && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <AlertDescription className="text-green-800 dark:text-green-300">
                    {text.magicLinkSent}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label 
                  htmlFor="login-password" 
                  className="block text-sm font-medium text-gray-900 dark:text-gray-100"
                >
                  {text.password}
                </Label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={currentLocale === 'en' ? 'Enter your password' : 'Εισάγετε τον κωδικό σας'}
                    autoComplete="current-password"
                    className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                      passwordForm.formState.errors.password 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : ''
                    }`}
                    {...passwordForm.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="login-remember"
                    checked={passwordForm.watch('rememberMe')}
                    onCheckedChange={(checked) => passwordForm.setValue('rememberMe', !!checked)}
                    className="border-gray-300 dark:border-gray-600"
                  />
                  <Label htmlFor="login-remember" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    {text.rememberMe}
                  </Label>
                </div>

                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                >
                  {text.forgotPassword}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  text.signIn
                )}
              </Button>

              {/* Magic Link Option */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={handleMagicLink}
                disabled={magicLinkMutation.isPending}
              >
                {magicLinkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    {text.magicLink}
                  </>
                )}
              </Button>
            </CardContent>
          </form>
        )}

        {/* Step 2b: Enterprise SSO */}
        {currentStep === 'sso' && enterpriseConfig && (
          <CardContent className="space-y-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {enterpriseConfig.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {text.enterpriseSSO}
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : 'An error occurred'}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {enterpriseConfig.ssoProviders.map((provider) => (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 justify-start"
                  onClick={() => ssoMutation.mutate(provider)}
                  disabled={ssoMutation.isPending}
                  size="lg"
                >
                  {getProviderIcon(provider)}
                  <span className="ml-3">
                    {text.continueWith} {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </span>
                </Button>
              ))}
            </div>

            {!enterpriseConfig.requiresSso && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-600 dark:text-gray-400"
                  onClick={() => setCurrentStep('password')}
                >
                  Use password instead
                </Button>
              </>
            )}
          </CardContent>
        )}

        <CardFooter className="text-center space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {text.noAccount}{' '}
            <Link 
              href="/auth/signup" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              {text.signUp}
            </Link>
          </div>

          {/* Security Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
            <Shield className="h-4 w-4 mx-auto mb-1 text-gray-400" />
            <p>
              {text.securityNote}
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* MFA Challenge Modal */}
      {showMfaModal && (
        <MfaModal
          open={showMfaModal}
          onOpenChange={setShowMfaModal}
          mode="challenge"
          onVerify={handleMfaVerify}
          availableMethods={mfaChallenge?.availableMethods || { totp: true, webauthn: true, backupCodes: true }}
          error={mfaChallenge?.error}
        />
      )}
    </div>
  );
}