import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
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
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { addCSRFHeader } from '@/utils/validation';

type VerificationState =
  | 'loading'
  | 'success'
  | 'expired'
  | 'invalid'
  | 'already-used'
  | 'error';

export default function VerifyEmail() {
  const { t, locale } = useTranslation();
  const [location, setLocation] = useLocation();
  const [verificationState, setVerificationState] =
    useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Get token from URL params
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const token = urlParams.get('token');

  const verifyMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/v2/verify-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: verificationToken, locale }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Email verification failed');
      }

      return response.json();
    },
    onSuccess: () => {
      setVerificationState('success');
    },
    onError: error => {
      const errorMsg =
        error instanceof Error ? error.message : 'Verification failed';
      setErrorMessage(errorMsg);

      // Determine the specific error state based on the message
      if (errorMsg.includes('expired')) {
        setVerificationState('expired');
      } else if (errorMsg.includes('already') || errorMsg.includes('used')) {
        setVerificationState('already-used');
      } else if (errorMsg.includes('invalid') || errorMsg.includes('token')) {
        setVerificationState('invalid');
      } else {
        setVerificationState('error');
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      // For resending, we would need the email - this could be passed via state or stored locally
      // For now, we'll show a message to go back to signup
      throw new Error(
        'Please return to the signup page to request a new verification email'
      );
    },
  });

  useEffect(() => {
    if (token) {
      verifyMutation.mutate(token);
    } else {
      setVerificationState('invalid');
      setErrorMessage('No verification token provided');
    }
  }, [token]);

  const getContent = () => {
    switch (verificationState) {
      case 'loading':
        return (
          <>
            <CardHeader className="text-center">
              <Loader2
                className="h-12 w-12 text-blue-500 dark:text-blue-400 mx-auto mb-4 animate-spin"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('auth.loading.verifying')}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center">
              <CheckCircle
                className="h-12 w-12 text-green-500 mx-auto mb-4"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('auth.success.verified')}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Your email has been successfully verified. You can now sign in
                to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setLocation('/auth/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Continue to Sign In
              </Button>
            </CardContent>
          </>
        );

      case 'expired':
        return (
          <>
            <CardHeader className="text-center">
              <XCircle
                className="h-12 w-12 text-orange-500 mx-auto mb-4"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Link expired
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                This verification link has expired. Verification links are valid
                for 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-300">
                  For security, verification links expire after 24 hours.
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You'll need to request a new verification email.
                </p>
                <Button
                  onClick={() => setLocation('/auth/signup')}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {t('auth.verify.resend')}
                </Button>
              </div>
            </CardContent>
          </>
        );

      case 'already-used':
        return (
          <>
            <CardHeader className="text-center">
              <CheckCircle
                className="h-12 w-12 text-green-500 mx-auto mb-4"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Already verified
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                This email has already been verified. You can sign in to your
                account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setLocation('/auth/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Continue to Sign In
              </Button>
            </CardContent>
          </>
        );

      case 'invalid':
        return (
          <>
            <CardHeader className="text-center">
              <XCircle
                className="h-12 w-12 text-red-500 mx-auto mb-4"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Invalid link
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                This verification link is invalid or malformed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert
                variant="destructive"
                className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage || 'The verification link is not valid.'}
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please check that you clicked the correct link from your
                  email.
                </p>
                <Button
                  onClick={() => setLocation('/auth/signup')}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {t('auth.verify.resend')}
                </Button>
              </div>
            </CardContent>
          </>
        );

      case 'error':
      default:
        return (
          <>
            <CardHeader className="text-center">
              <XCircle
                className="h-12 w-12 text-red-500 mx-auto mb-4"
                aria-hidden="true"
              />
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Verification failed
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                We couldn't verify your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert
                variant="destructive"
                className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage ||
                    'An unexpected error occurred during verification.'}
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please try again or contact support if the problem persists.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => token && verifyMutation.mutate(token)}
                    variant="outline"
                    className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 mr-2 animate-spin"
                          aria-hidden="true"
                        />
                        {t('auth.loading.verifying')}
                      </>
                    ) : (
                      'Try Again'
                    )}
                  </Button>
                  <Button
                    onClick={() => setLocation('/auth/signup')}
                    className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {t('auth.verify.resend')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        );
    }
  };

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
        {getContent()}
        <CardFooter className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Need help?{' '}
            <a
              href="mailto:support@payrollsync.com"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Contact support
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
