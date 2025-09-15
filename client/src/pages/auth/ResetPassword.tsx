import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validatePassword, validatePasswordMatch } from '@/utils/validation';
import { addCSRFHeader } from '@/utils/validation';

const createResetPasswordSchema = (t: (key: string) => string) =>
  z
    .object({
      password: z
        .string()
        .min(1, t('auth.error.required'))
        .refine(
          password => validatePassword(password).isValid,
          t('auth.error.password')
        ),
      confirmPassword: z.string().min(1, t('auth.error.required')),
    })
    .refine(
      data => validatePasswordMatch(data.password, data.confirmPassword),
      {
        message: t('auth.error.passwordMatch'),
        path: ['confirmPassword'],
      }
    );

export default function ResetPassword() {
  const { t, locale } = useTranslation();
  const [location, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  // Get token from URL params
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const token = urlParams.get('token');

  const resetPasswordSchema = createResetPasswordSchema(t);
  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
      if (!token) {
        throw new Error('Reset token is missing');
      }

      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/v2/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token,
          password: data.password,
          locale,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 400 && error.error?.includes('token')) {
          setTokenValid(false);
        }
        throw new Error(error.error || 'Failed to reset password');
      }

      return response.json();
    },
    onSuccess: () => {
      setResetSuccess(true);
    },
  });

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data);
  };

  const passwordValidation = form.watch('password')
    ? validatePassword(form.watch('password'))
    : null;

  if (!tokenValid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
        style={{
          animation: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'none'
            : undefined,
        }}
      >
        <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <AlertCircle
              className="h-12 w-12 text-red-500 mx-auto mb-4"
              aria-hidden="true"
            />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Invalid reset link
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              This password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert
              variant="destructive"
              className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Password reset links expire after 15 minutes for security.
                Please request a new one.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => setLocation('/auth/forgot-password')}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Request new reset link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
        style={{
          animation: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'none'
            : undefined,
        }}
      >
        <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <CheckCircle
              className="h-12 w-12 text-green-500 mx-auto mb-4"
              aria-hidden="true"
            />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('auth.success.passwordReset')}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your password has been updated. All active sessions have been
              invalidated for security.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                For your security, you've been signed out of all devices and
                will need to sign in again.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => setLocation('/auth/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Continue to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
      style={{
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'none'
          : undefined,
      }}
    >
      <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('auth.reset.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('auth.reset.description')}
          </CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            {resetPasswordMutation.error && (
              <Alert
                variant="destructive"
                className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {resetPasswordMutation.error instanceof Error
                    ? resetPasswordMutation.error.message
                    : 'Failed to reset password'}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="reset-password"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {t('auth.password')}
                <span className="text-red-500 ml-1" aria-label="required">
                  *
                </span>
              </Label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  autoFocus
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                    form.formState.errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  aria-invalid={
                    form.formState.errors.password ? 'true' : 'false'
                  }
                  aria-describedby="reset-password-error reset-password-help"
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
                  id="reset-password-error"
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {form.formState.errors.password.message}
                </p>
              )}
              <p
                id="reset-password-help"
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                Password must be 12+ characters with uppercase, lowercase,
                number, and special character
              </p>
              {passwordValidation && (
                <div className="text-xs space-y-1">
                  <div
                    className={`flex items-center ${passwordValidation.strength === 'strong' ? 'text-green-600' : passwordValidation.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}
                  >
                    Strength: {passwordValidation.strength}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="reset-confirm-password"
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {t('auth.confirmPassword')}
                <span className="text-red-500 ml-1" aria-label="required">
                  *
                </span>
              </Label>
              <div className="relative">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                    form.formState.errors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  aria-invalid={
                    form.formState.errors.confirmPassword ? 'true' : 'false'
                  }
                  aria-describedby={
                    form.formState.errors.confirmPassword
                      ? 'reset-confirm-password-error'
                      : undefined
                  }
                  {...form.register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                  tabIndex={0}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p
                  id="reset-confirm-password-error"
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                  aria-live="polite"
                >
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                After resetting your password, you'll be signed out of all
                devices for security.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={
                resetPasswordMutation.isPending || !form.formState.isValid
              }
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2
                    className="h-4 w-4 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  {t('auth.loading.resetting')}
                </>
              ) : (
                t('auth.reset.button')
              )}
            </Button>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => setLocation('/auth/login')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Sign in instead
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
