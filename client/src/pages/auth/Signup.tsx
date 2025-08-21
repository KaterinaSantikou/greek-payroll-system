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
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Globe, Shield, Mail } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail, validatePasswordSync, validatePassword, validatePasswordMatch, type PasswordValidationResult } from '@/utils/validation';
import { addCSRFHeader } from '@/utils/validation';

// Friction-light schema - minimal required fields for step 1
const createSignupSchema = () => z.object({
  email: z.string()
    .min(1, 'Email is required')
    .refine(validateEmail, 'Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => validatePasswordSync(password).isValid, 'Password does not meet security requirements'),
  acceptTos: z.boolean().refine((val) => val === true, 'You must agree to the Terms of Service'),
  acceptPrivacy: z.boolean().refine((val) => val === true, 'You must agree to the Privacy Policy'),
  locale: z.enum(['en', 'el']).default('en'),
});

export default function Signup() {
  const { t, locale, changeLanguage } = useTranslation();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentLocale, setCurrentLocale] = useState<'en' | 'el'>(locale as 'en' | 'el');
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);
  const [passwordCheckingBreach, setPasswordCheckingBreach] = useState(false);

  const signupSchema = createSignupSchema();
  type SignupFormData = z.infer<typeof signupSchema>;

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      acceptTos: false,
      acceptPrivacy: false,
      locale: currentLocale,
    },
  });

  // Watch password field for real-time validation
  const watchedPassword = form.watch('password');

  // Real-time password validation with breach checking
  useEffect(() => {
    const checkPassword = async () => {
      if (watchedPassword && watchedPassword.length >= 3) {
        setPasswordCheckingBreach(true);
        try {
          const validation = await validatePassword(watchedPassword);
          setPasswordValidation(validation);
        } catch (error) {
          // Fall back to sync validation if async fails
          const syncValidation = validatePasswordSync(watchedPassword);
          setPasswordValidation({
            ...syncValidation,
            score: 0,
            isBreached: false,
            suggestions: [],
          });
        } finally {
          setPasswordCheckingBreach(false);
        }
      } else {
        setPasswordValidation(null);
      }
    };

    const timeoutId = setTimeout(checkPassword, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [watchedPassword]);

  const handleLanguageChange = (newLocale: 'en' | 'el') => {
    setCurrentLocale(newLocale);
    form.setValue('locale', newLocale);
    changeLanguage(newLocale);
  };

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          locale: data.locale,
          accept_tos: data.acceptTos,
          accept_privacy: data.acceptPrivacy,
        }),
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

  const ssoMutation = useMutation({
    mutationFn: async (provider: 'google' | 'microsoft') => {
      window.location.href = `/api/auth/sso/${provider}?locale=${currentLocale}&signup=true&returnTo=${encodeURIComponent('/dashboard')}`;
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        throw new Error('Verification email sent if account exists'); // Generic message for security
      }

      return response.json();
    },
  });

  const onSubmit = (data: SignupFormData) => {
    // Validate password one more time before submission
    if (passwordValidation && !passwordValidation.isValid) {
      form.setError('password', {
        type: 'manual',
        message: passwordValidation.errors[0] || 'Password does not meet requirements'
      });
      return;
    }
    signupMutation.mutate(data);
  };

  const getPasswordStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'weak': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = (strength: string) => {
    const texts = {
      en: { weak: 'Weak', medium: 'Medium', strong: 'Strong' },
      el: { weak: 'Αδύναμος', medium: 'Μέτριος', strong: 'Ισχυρός' },
    };
    return texts[currentLocale][strength as keyof typeof texts.en] || strength;
  };

  const translations = {
    en: {
      title: 'Create your account',
      subtitle: 'Get started with PayrollSync - friction-light setup, company details later',
      email: 'Work email',
      password: 'Password',
      passwordHelp: 'Minimum 8 characters, no complexity requirements',
      acceptTos: 'I agree to the',
      acceptPrivacy: 'I agree to the',
      tos: 'Terms of Service',
      privacy: 'Privacy Policy',
      createAccount: 'Create Account',
      orContinueWith: 'Or continue with',
      hasAccount: 'Already have an account?',
      signIn: 'Sign in',
      language: 'Language',
      english: 'English',
      greek: 'Ελληνικά',
      checking: 'Checking password security...',
      breached: 'This password appears in data breaches',
      suggestions: 'Suggestions:',
      passwordScore: 'Security Score:',
      legalNotice: 'By creating an account you agree to the Terms & Privacy Policy',
      mfaNote: 'After verification, you\'ll set up MFA for enhanced security'
    },
    el: {
      title: 'Δημιουργήστε τον λογαριασμό σας',
      subtitle: 'Ξεκινήστε με το PayrollSync - γρήγορη εγκατάσταση, στοιχεία εταιρείας αργότερα',
      email: 'Email εργασίας',
      password: 'Κωδικός πρόσβασης',
      passwordHelp: 'Ελάχιστο 8 χαρακτήρες, χωρίς απαιτήσεις πολυπλοκότητας',
      acceptTos: 'Συμφωνώ με τους',
      acceptPrivacy: 'Συμφωνώ με την',
      tos: 'Όρους Χρήσης',
      privacy: 'Πολιτική Απορρήτου',
      createAccount: 'Δημιουργία Λογαριασμού',
      orContinueWith: 'Ή συνεχίστε με',
      hasAccount: 'Έχετε ήδη λογαριασμό;',
      signIn: 'Σύνδεση',
      language: 'Γλώσσα',
      english: 'English',
      greek: 'Ελληνικά',
      checking: 'Έλεγχος ασφάλειας κωδικού...',
      breached: 'Αυτός ο κωδικός εμφανίζεται σε παραβιάσεις δεδομένων',
      suggestions: 'Προτάσεις:',
      passwordScore: 'Βαθμός Ασφάλειας:',
      legalNotice: 'Δημιουργώντας λογαριασμό συμφωνείτε με τους Όρους & την Πολιτική Απορρήτου',
      mfaNote: 'Μετά την επαλήθευση, θα ρυθμίσετε MFA για ενισχυμένη ασφάλεια'
    },
  };

  const text = translations[currentLocale];

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Check your email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              We sent a verification link to <strong>{userEmail}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {resendMutation.isSuccess && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <AlertDescription className="text-green-800 dark:text-green-300">
                  Verification email sent if account exists
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
              <p>Click the link in the email to verify your account.</p>
              <p>Didn't receive the email? Check your spam folder.</p>
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
                  Sending...
                </>
              ) : (
                'Resend verification email'
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

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {text.mfaNote}
              </p>
            </div>
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

            {/* Email Input */}
            <AccessibleInput
              label={text.email}
              id="signup-email"
              type="email"
              placeholder="name@company.com"
              required
              autoComplete="email"
              autoFocus
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />

            {/* Enhanced NIST-Compliant Password Input */}
            <div className="space-y-3">
              <Label 
                htmlFor="signup-password" 
                className="block text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                {text.password}
                <span className="text-red-500 ml-1" aria-label="required">*</span>
              </Label>
              
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={currentLocale === 'en' ? 'Create a secure password' : 'Δημιουργήστε έναν ασφαλή κωδικό'}
                  autoComplete="new-password"
                  className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 ${
                    form.formState.errors.password || (passwordValidation && !passwordValidation.isValid)
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : passwordValidation && passwordValidation.isValid
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                      : ''
                  }`}
                  aria-invalid={form.formState.errors.password ? 'true' : 'false'}
                  aria-describedby="signup-password-error signup-password-help signup-password-strength"
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

              {/* Password Help Text */}
              <p id="signup-password-help" className="text-xs text-gray-500 dark:text-gray-400">
                {text.passwordHelp}
              </p>

              {/* Password Validation Feedback */}
              {form.formState.errors.password && (
                <p 
                  id="signup-password-error"
                  className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2" 
                  role="alert" 
                  aria-live="polite"
                >
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.password.message}
                </p>
              )}

              {/* Real-time Password Strength Indicator */}
              {passwordValidation && (
                <div id="signup-password-strength" className="space-y-2">
                  {/* Strength Meter */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {getPasswordStrengthText(passwordValidation.strength)}
                    </span>
                    <Progress 
                      value={passwordValidation.score} 
                      className="flex-1 h-2" 
                    />
                    <span className="text-xs text-gray-500 w-8">{passwordValidation.score}%</span>
                  </div>

                  {/* Breach Check Status */}
                  {passwordCheckingBreach && (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {text.checking}
                    </div>
                  )}

                  {/* Breach Warning */}
                  {passwordValidation.isBreached && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <Shield className="h-4 w-4" />
                      {text.breached}
                    </div>
                  )}

                  {/* Suggestions */}
                  {passwordValidation.suggestions.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className="font-medium text-gray-700 dark:text-gray-300">{text.suggestions}</p>
                      <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                        {passwordValidation.suggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Security Score Badge */}
                  {passwordValidation.score > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={passwordValidation.strength === 'strong' ? 'default' : 
                                passwordValidation.strength === 'medium' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {text.passwordScore} {passwordValidation.score}/100
                      </Badge>
                      {passwordValidation.isValid && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legal Consent - Required by GDPR and Greek law */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                  {text.legalNotice}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="signup-tos"
                      checked={form.watch('acceptTos')}
                      onCheckedChange={(checked) => form.setValue('acceptTos', !!checked)}
                      className="mt-1 border-gray-300 dark:border-gray-600"
                    />
                    <Label htmlFor="signup-tos" className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 cursor-pointer">
                      {text.acceptTos}{' '}
                      <Link href="/legal/terms" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded underline">
                        {text.tos}
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
                    <Label htmlFor="signup-privacy" className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 cursor-pointer">
                      {text.acceptPrivacy}{' '}
                      <Link href="/legal/privacy" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded underline">
                        {text.privacy}
                      </Link>
                    </Label>
                  </div>
                  {form.formState.errors.acceptPrivacy && (
                    <p className="text-sm text-red-600 dark:text-red-400 ml-7" role="alert" aria-live="polite">
                      {form.formState.errors.acceptPrivacy.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Main Submit Button */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-white font-medium py-2 px-4 rounded-md transition-colors"
              disabled={signupMutation.isPending || !form.formState.isValid || (passwordValidation && !passwordValidation.isValid)}
              size="lg"
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Creating account...
                </>
              ) : (
                text.createAccount
              )}
            </Button>

            {/* SSO Options */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">{text.orContinueWith}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => ssoMutation.mutate('google')}
                disabled={ssoMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => ssoMutation.mutate('microsoft')}
                disabled={ssoMutation.isPending}
              >
                <Shield className="h-4 w-4 mr-2" />
                Microsoft
              </Button>
            </div>
          </CardContent>
        </form>

        <CardFooter className="text-center space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {text.hasAccount}{' '}
            <Link 
              href="/auth/login" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              {text.signIn}
            </Link>
          </div>
          
          {/* Security Note */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
            <Shield className="h-4 w-4 mx-auto mb-1 text-gray-400" />
            <p>
              {text.mfaNote}
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}