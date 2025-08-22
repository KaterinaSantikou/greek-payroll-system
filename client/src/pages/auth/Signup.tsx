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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail, validatePassword, validatePasswordMatch } from '@/utils/validation';
import { addCSRFHeader } from '@/utils/validation';

const createSignupSchema = (t: (key: string) => string) => z.object({
  email: z.string()
    .min(1, t('auth.error.required'))
    .refine(validateEmail, t('auth.error.email')),
  password: z.string()
    .min(1, t('auth.error.required'))
    .refine((password) => validatePassword(password).isValid, t('auth.error.password')),
  confirmPassword: z.string().min(1, t('auth.error.required')),
  firstName: z.string().min(1, t('auth.error.required')),
  lastName: z.string().min(1, t('auth.error.required')),
  locale: z.enum(['en', 'el']).default('en'),
  acceptTos: z.boolean().refine((val) => val === true, t('auth.error.tos')),
  acceptPrivacy: z.boolean().refine((val) => val === true, t('auth.error.privacy')),
}).refine((data) => validatePasswordMatch(data.password, data.confirmPassword), {
  message: t('auth.error.passwordMatch'),
  path: ['confirmPassword'],
});

export default function Signup() {
  const { t, locale, changeLanguage } = useTranslation();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const signupSchema = createSignupSchema(t);
  type SignupFormData = z.infer<typeof signupSchema>;

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      locale: locale as 'en' | 'el',
      acceptTos: false,
      acceptPrivacy: false,
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/v2/signup', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      setUserEmail(variables.email);
      setSignupSuccess(true);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/v2/resend-verification', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        throw new Error(t('auth.success.emailSent')); // Generic message for security
      }

      return response.json();
    },
  });

  const onSubmit = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  const passwordValidation = form.watch('password') ? validatePassword(form.watch('password')) : null;

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('auth.verify.title')}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t('auth.verify.sent')} <strong>{userEmail}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {resendMutation.isSuccess && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <AlertDescription className="text-green-800 dark:text-green-300">
                  {t('auth.success.emailSent')}
                </AlertDescription>
              </Alert>
            )}

            {resendMutation.error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {resendMutation.error instanceof Error ? resendMutation.error.message : 'Failed to resend email'}
                </AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-gray-600 dark:text-gray-400 text-center space-y-2">
              <p>{t('auth.verify.click')}</p>
              <p>{t('auth.verify.noEmail')}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  {t('auth.loading.sending')}
                </>
              ) : (
                t('auth.verify.resend')
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-600 dark:text-gray-400"
              onClick={() => {
                setUserEmail('');
                setSignupSuccess(false);
                form.reset();
              }}
            >
              Use different email
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
        animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : undefined 
      }}
    >
      <Card className="w-full max-w-md min-w-[480px] max-w-[560px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('auth.signup.title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Enter your information to get started with PayrollSync
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            {signupMutation.error && (
              <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {signupMutation.error instanceof Error ? signupMutation.error.message : 'An error occurred'}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <AccessibleInput
                label={t('auth.firstName')}
                id="signup-firstname"
                type="text"
                placeholder="John"
                required
                autoComplete="given-name"
                {...form.register('firstName')}
                error={form.formState.errors.firstName?.message}
              />

              <AccessibleInput
                label={t('auth.lastName')}
                id="signup-lastname"
                type="text"
                placeholder="Doe"
                required
                autoComplete="family-name"
                {...form.register('lastName')}
                error={form.formState.errors.lastName?.message}
              />
            </div>

            <AccessibleInput
              label={t('auth.email')}
              id="signup-email"
              type="email"
              placeholder="name@company.com"
              required
              autoComplete="email"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            <div className="space-y-2">
              <Label 
                htmlFor="signup-password" 
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {t('auth.password')}
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              </Label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                    form.formState.errors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : ''
                  }`}
                  aria-invalid={form.formState.errors.password ? 'true' : 'false'}
                  aria-describedby="signup-password-error signup-password-help"
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
                  id="signup-password-error"
                  className="text-sm text-red-600 dark:text-red-400" 
                  role="alert" 
                  aria-live="polite"
                >
                  {form.formState.errors.password.message}
                </p>
              )}
              <p id="signup-password-help" className="text-xs text-gray-500 dark:text-gray-400">
                Password must be 12+ characters with uppercase, lowercase, number, and special character
              </p>
              {passwordValidation && (
                <div className="text-xs space-y-1">
                  <div className={`flex items-center ${passwordValidation.strength === 'strong' ? 'text-green-600' : passwordValidation.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                    Strength: {passwordValidation.strength}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="signup-confirm-password" 
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {t('auth.confirmPassword')}
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              </Label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                    form.formState.errors.confirmPassword 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : ''
                  }`}
                  aria-invalid={form.formState.errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={form.formState.errors.confirmPassword ? 'signup-confirm-password-error' : undefined}
                  {...form.register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                  id="signup-confirm-password-error"
                  className="text-sm text-red-600 dark:text-red-400" 
                  role="alert" 
                  aria-live="polite"
                >
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-locale" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('auth.language')}
              </Label>
              <Select
                value={form.watch('locale')}
                onValueChange={(value: 'en' | 'el') => {
                  form.setValue('locale', value);
                  changeLanguage(value);
                }}
              >
                <SelectTrigger id="signup-locale" className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('auth.english')}</SelectItem>
                  <SelectItem value="el">{t('auth.greek')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="signup-tos"
                  checked={form.watch('acceptTos')}
                  onCheckedChange={(checked) => form.setValue('acceptTos', !!checked)}
                  className="mt-1 border-gray-300 dark:border-gray-600"
                />
                <Label htmlFor="signup-tos" className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 cursor-pointer">
                  {t('auth.acceptTos')}{' '}
                  <Link href="/legal/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {t('auth.tos')}
                  </Link>
                </Label>
              </div>
              {form.formState.errors.acceptTos && (
                <p className="text-sm text-red-600 dark:text-red-400 ml-7" role="alert" aria-live="polite">
                  {form.formState.errors.acceptTos.message}
                </p>
              )}

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="signup-privacy"
                  checked={form.watch('acceptPrivacy')}
                  onCheckedChange={(checked) => form.setValue('acceptPrivacy', !!checked)}
                  className="mt-1 border-gray-300 dark:border-gray-600"
                />
                <Label htmlFor="signup-privacy" className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 cursor-pointer">
                  {t('auth.acceptPrivacy')}{' '}
                  <Link href="/legal/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {t('auth.privacy')}
                  </Link>
                </Label>
              </div>
              {form.formState.errors.acceptPrivacy && (
                <p className="text-sm text-red-600 dark:text-red-400 ml-7" role="alert" aria-live="polite">
                  {form.formState.errors.acceptPrivacy.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={signupMutation.isPending || !form.formState.isValid}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  {t('auth.loading.creatingAccount')}
                </>
              ) : (
                t('auth.signup')
              )}
            </Button>
          </CardContent>

          <CardFooter className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.hasAccount')}{' '}
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