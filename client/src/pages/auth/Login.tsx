import React, { useState } from 'react';
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
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/utils/validation';
import { addCSRFHeader } from '@/utils/validation';

const createLoginSchema = (t: (key: string) => string) => z.object({
  email: z.string()
    .min(1, t('auth.error.required'))
    .refine(validateEmail, t('auth.error.email')),
  password: z.string().min(1, t('auth.error.required')),
  rememberMe: z.boolean().optional(),
});

export default function Login() {
  const { t, locale } = useTranslation();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [deviceFingerprint] = useState(() => {
    // Enhanced device fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 2, 2);
    const canvasFingerprint = canvas.toDataURL();
    
    return btoa(`${navigator.userAgent}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}-${navigator.language}-${canvasFingerprint.slice(0, 50)}`);
  });

  const loginSchema = createLoginSchema(t);
  type LoginFormData = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
        'x-device-fingerprint': deviceFingerprint,
      });

      const response = await fetch('/api/auth/v2/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, locale }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        // Generic error message for security
        throw new Error(t('auth.error.invalid'));
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresMfa) {
        setLocation('/auth/mfa');
      } else {
        const returnTo = new URLSearchParams(window.location.search).get('returnTo');
        setLocation(returnTo || '/dashboard');
      }
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/v2/magic-link', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, locale }),
      });

      if (!response.ok) {
        throw new Error(t('auth.success.emailSent')); // Generic success message
      }

      return response.json();
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleMagicLink = () => {
    const email = form.getValues('email');
    if (!email || !validateEmail(email)) {
      form.setError('email', {
        type: 'manual',
        message: t('auth.error.email')
      });
      return;
    }
    magicLinkMutation.mutate(email);
  };

  const error = loginMutation.error || magicLinkMutation.error;
  const isLoading = loginMutation.isPending;

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
            {t('auth.login.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : t('auth.error.invalid')}
                </AlertDescription>
              </Alert>
            )}

            {magicLinkMutation.isSuccess && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <AlertDescription className="text-green-800 dark:text-green-300">
                  {t('auth.success.emailSent')}
                </AlertDescription>
              </Alert>
            )}

            <AccessibleInput
              label={t('auth.email')}
              id="login-email"
              type="email"
              placeholder="name@company.com"
              required
              autoComplete="email"
              autoFocus
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            <div className="space-y-2">
              <Label 
                htmlFor="login-password" 
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {t('auth.password')}
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              </Label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                    form.formState.errors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : ''
                  }`}
                  aria-invalid={form.formState.errors.password ? 'true' : 'false'}
                  aria-describedby={form.formState.errors.password ? 'login-password-error' : undefined}
                  {...form.register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p 
                  id="login-password-error"
                  className="text-sm text-red-600 dark:text-red-400" 
                  role="alert" 
                  aria-live="polite"
                >
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="login-remember"
                checked={form.watch('rememberMe')}
                onCheckedChange={(checked) => form.setValue('rememberMe', !!checked)}
                className="border-gray-300 dark:border-gray-600"
              />
              <Label 
                htmlFor="login-remember" 
                className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
              >
                {t('auth.rememberMe')}
              </Label>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                disabled={isLoading || !form.formState.isValid}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    {t('auth.loading.signingIn')}
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
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
                </div>
              </div>

              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={handleMagicLink}
                  disabled={magicLinkMutation.isPending}
                >
                  {magicLinkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      {t('auth.loading.sending')}
                    </>
                  ) : (
                    t('auth.magicLink')
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setLocation('/auth/sso')}
                >
                  {t('auth.useSSO')}
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 text-center">
            <div className="text-sm">
              <Link 
                href="/auth/forgot-password" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.noAccount')}{' '}
              <Link 
                href="/auth/signup" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {t('auth.signUp')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}