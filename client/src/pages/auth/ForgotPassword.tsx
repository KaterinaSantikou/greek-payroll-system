import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AccessibleInput } from '@/components/ui/accessible-input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Mail, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/utils/validation';
import { addCSRFHeader } from '@/utils/validation';

const createForgotPasswordSchema = (t: (key: string) => string) => z.object({
  email: z.string()
    .min(1, t('auth.error.required'))
    .refine(validateEmail, t('auth.error.email')),
});

export default function ForgotPassword() {
  const { t, locale } = useTranslation();
  const [, setLocation] = useLocation();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const forgotPasswordSchema = createForgotPasswordSchema(t);
  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/v2/forgot-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, locale }),
      });

      if (!response.ok) {
        // Always show generic success message for security
        return { success: true };
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      setSentEmail(variables.email);
      setEmailSent(true);
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8"
        style={{ 
          animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : undefined 
        }}
      >
        <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 text-blue-500 dark:text-blue-400 mx-auto mb-4" aria-hidden="true" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('auth.verify.title')}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              We've sent a password reset link to <strong>{sentEmail}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center space-y-2">
              <p>Click the link in the email to reset your password.</p>
              <p>The link will expire in 15 minutes for security.</p>
              <p>Didn't receive the email? Check your spam folder.</p>
            </div>

            <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                For security reasons, we'll always show this message regardless of whether the email address exists in our system.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => forgotPasswordMutation.mutate({ email: sentEmail })}
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                    {t('auth.loading.sending')}
                  </>
                ) : (
                  'Resend reset email'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-600 dark:text-gray-400"
                onClick={() => {
                  setEmailSent(false);
                  setSentEmail('');
                  form.reset();
                }}
              >
                Use different email
              </Button>
            </div>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm">
              <Link 
                href="/auth/login" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 inline-flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                Back to sign in
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
            {t('auth.forgot.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('auth.forgot.description')}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            {forgotPasswordMutation.error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {forgotPasswordMutation.error instanceof Error 
                    ? forgotPasswordMutation.error.message 
                    : 'An error occurred'}
                </AlertDescription>
              </Alert>
            )}

            <AccessibleInput
              label={t('auth.email')}
              id="forgot-email"
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
              disabled={forgotPasswordMutation.isPending || !form.formState.isValid}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  {t('auth.loading.sending')}
                </>
              ) : (
                t('auth.forgot.send')
              )}
            </Button>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link 
                href="/auth/login" 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                {t('auth.signIn')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}