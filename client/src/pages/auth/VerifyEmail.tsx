import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

type VerificationState = 'loading' | 'success' | 'expired' | 'invalid' | 'already-used' | 'error';

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const [verificationState, setVerificationState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Get token from URL params
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const token = urlParams.get('token');

  const verifyMutation = useMutation({
    mutationFn: async (verificationToken: string) => {
      const response = await fetch('/api/auth/v2/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
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
    onError: (error) => {
      const errorMsg = error instanceof Error ? error.message : 'Verification failed';
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
      throw new Error('Please return to the signup page to request a new verification email');
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
              <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
              <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
              <CardDescription>
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Email verified!</CardTitle>
              <CardDescription>
                Your email has been successfully verified. You can now sign in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => setLocation('/auth/login')}
                className="w-full"
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
              <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Link expired</CardTitle>
              <CardDescription>
                This verification link has expired. Verification links are valid for 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  For security, verification links expire after 24 hours.
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  You'll need to request a new verification email.
                </p>
                <Button 
                  onClick={() => setLocation('/auth/signup')}
                  className="w-full"
                >
                  Request New Verification Email
                </Button>
              </div>
            </CardContent>
          </>
        );

      case 'already-used':
        return (
          <>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Already verified</CardTitle>
              <CardDescription>
                This email has already been verified. You can sign in to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                onClick={() => setLocation('/auth/login')}
                className="w-full"
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
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Invalid link</CardTitle>
              <CardDescription>
                This verification link is invalid or malformed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage || 'The verification link is not valid.'}
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Please check that you clicked the correct link from your email.
                </p>
                <Button 
                  onClick={() => setLocation('/auth/signup')}
                  className="w-full"
                >
                  Request New Verification Email
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
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">Verification failed</CardTitle>
              <CardDescription>
                We couldn't verify your email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errorMessage || 'An unexpected error occurred during verification.'}
                </AlertDescription>
              </Alert>
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600">
                  Please try again or contact support if the problem persists.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => token && verifyMutation.mutate(token)}
                    variant="outline"
                    className="w-full"
                    disabled={verifyMutation.isPending}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      'Try Again'
                    )}
                  </Button>
                  <Button 
                    onClick={() => setLocation('/auth/signup')}
                    className="w-full"
                  >
                    Request New Verification Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        {getContent()}
        <CardFooter className="text-center">
          <div className="text-sm text-gray-500">
            Need help?{' '}
            <a href="mailto:support@payrollsync.com" className="text-blue-600 hover:text-blue-500">
              Contact support
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}