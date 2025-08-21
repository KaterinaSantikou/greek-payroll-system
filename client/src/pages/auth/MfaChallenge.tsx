import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Smartphone, 
  Shield, 
  Key, 
  Fingerprint, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft,
  Globe,
  QrCode,
  Copy,
  Download,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { addCSRFHeader } from '@/utils/validation';

const createMfaSchema = () => z.object({
  code: z.string().min(6, 'Code must be at least 6 characters').max(8, 'Code is too long'),
  method: z.enum(['totp', 'sms', 'webauthn', 'backup']),
  rememberDevice: z.boolean().default(false),
});

type MfaMode = 'challenge' | 'setup' | 'recovery';
type MfaMethod = 'totp' | 'sms' | 'webauthn' | 'backup';

export default function MfaChallenge() {
  const { t, locale, changeLanguage } = useTranslation();
  const [, setLocation] = useLocation();
  const [currentLocale, setCurrentLocale] = useState<'en' | 'el'>(locale as 'en' | 'el');
  const [mode, setMode] = useState<MfaMode>('challenge');
  const [activeMethod, setActiveMethod] = useState<MfaMethod>('totp');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<'method' | 'configure' | 'verify' | 'backup'>('method');
  const [userEmail, setUserEmail] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const mfaSchema = createMfaSchema();
  type MfaFormData = z.infer<typeof mfaSchema>;

  const form = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: '',
      method: activeMethod,
      rememberDevice: false,
    },
  });

  // Get challenge data from URL params or session storage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const modeParam = urlParams.get('mode') as MfaMode;
    const challengeData = sessionStorage.getItem('mfa_challenge');

    if (emailParam) setUserEmail(emailParam);
    if (modeParam) setMode(modeParam);
    
    if (challengeData) {
      try {
        const data = JSON.parse(challengeData);
        setUserEmail(data.email || '');
        setAttemptCount(data.attemptCount || 0);
        setIsLocked(data.isLocked || false);
        if (data.lockoutTime) {
          setLockoutTime(new Date(data.lockoutTime));
        }
      } catch (error) {
        console.warn('Failed to parse MFA challenge data');
      }
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (isLocked && lockoutTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, lockoutTime.getTime() - now.getTime());
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          setIsLocked(false);
          setLockoutTime(null);
          setAttemptCount(0);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLocked, lockoutTime]);

  const handleLanguageChange = (newLocale: 'en' | 'el') => {
    setCurrentLocale(newLocale);
    changeLanguage(newLocale);
  };

  const verifyMutation = useMutation({
    mutationFn: async (data: MfaFormData) => {
      if (isLocked) {
        throw new Error('Account temporarily locked. Please wait.');
      }

      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: userEmail,
          code: data.code,
          method: data.method,
          rememberDevice: data.rememberDevice,
          locale: currentLocale,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle rate limiting
        if (response.status === 429) {
          const newAttemptCount = attemptCount + 1;
          setAttemptCount(newAttemptCount);
          
          if (newAttemptCount >= 5) {
            setIsLocked(true);
            const lockTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            setLockoutTime(lockTime);
            
            // Store in session for persistence
            sessionStorage.setItem('mfa_challenge', JSON.stringify({
              email: userEmail,
              attemptCount: newAttemptCount,
              isLocked: true,
              lockoutTime: lockTime.toISOString(),
            }));
          }
        }
        
        throw new Error(error.error || 'Verification failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Clear challenge data
      sessionStorage.removeItem('mfa_challenge');
      
      // Redirect to intended destination
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      setLocation(returnTo || '/dashboard');
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (method: MfaMethod) => {
      const headers = addCSRFHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          method,
          locale: currentLocale,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Setup failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.qrCode) {
        setQrCodeUrl(data.qrCode);
      }
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
      }
      setSetupStep('configure');
    },
  });

  const onSubmit = (data: MfaFormData) => {
    verifyMutation.mutate({ ...data, method: activeMethod });
  };

  const handleSetupMethod = (method: MfaMethod) => {
    setActiveMethod(method);
    form.setValue('method', method);
    
    if (method === 'backup') {
      setSetupStep('backup');
    } else {
      setupMutation.mutate(method);
    }
  };

  const downloadBackupCodes = () => {
    const content = `PayrollSync MFA Backup Codes\nGenerated: ${new Date().toLocaleDateString()}\n\n${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nIMPORTANT:\n- Keep these codes secure and private\n- Each code can only be used once\n- Use when you cannot access your authenticator app`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payrollsync-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const translations = {
    en: {
      title: 'Two-Factor Authentication',
      setupTitle: 'Set Up Two-Factor Authentication',
      subtitle: 'Verify your identity to continue',
      setupSubtitle: 'Secure your account with an additional layer of protection',
      chooseMethod: 'Choose your preferred method',
      authenticatorApp: 'Authenticator App',
      authenticatorDesc: 'Use Google Authenticator, Authy, or similar app',
      smsBackup: 'SMS Backup',
      smsDesc: 'Receive codes via SMS (backup only)',
      securityKey: 'Security Key',
      securityKeyDesc: 'Hardware security key or biometric',
      backupCodes: 'Backup Codes',
      backupCodesDesc: 'One-time recovery codes',
      enterCode: 'Enter verification code',
      continue: 'Continue',
      verify: 'Verify',
      back: 'Back',
      rememberDevice: 'Trust this device for 30 days',
      attemptCount: 'Attempts remaining:',
      lockedOut: 'Too many failed attempts. Please wait:',
      scanQr: 'Scan QR Code',
      scanQrDesc: 'Scan this code with your authenticator app',
      manualEntry: 'Manual Entry',
      setupComplete: 'Setup Complete',
      downloadCodes: 'Download Backup Codes',
      setupLater: 'Set up later',
      language: 'Language',
      english: 'English',
      greek: 'Ελληνικά',
      needHelp: 'Need help?',
      contactSupport: 'Contact support',
      securityTip: 'Security tip: Never share your codes with anyone',
    },
    el: {
      title: 'Πολυπαραγοντική Αυθεντικοποίηση',
      setupTitle: 'Ρύθμιση Πολυπαραγοντικής Αυθεντικοποίησης',
      subtitle: 'Επαληθεύστε την ταυτότητά σας για να συνεχίσετε',
      setupSubtitle: 'Ασφαλίστε τον λογαριασμό σας με επιπλέον επίπεδο προστασίας',
      chooseMethod: 'Επιλέξτε την προτιμώμενη μέθοδο',
      authenticatorApp: 'Εφαρμογή Αυθεντικοποίησης',
      authenticatorDesc: 'Χρήση Google Authenticator, Authy ή παρόμοιας εφαρμογής',
      smsBackup: 'Εφεδρικό SMS',
      smsDesc: 'Λήψη κωδικών μέσω SMS (μόνο εφεδρικά)',
      securityKey: 'Κλειδί Ασφαλείας',
      securityKeyDesc: 'Κλειδί ασφαλείας υλικού ή βιομετρικό',
      backupCodes: 'Εφεδρικοί Κωδικοί',
      backupCodesDesc: 'Κωδικοί αποκατάστασης μιας χρήσης',
      enterCode: 'Εισάγετε κωδικό επαλήθευσης',
      continue: 'Συνέχεια',
      verify: 'Επαλήθευση',
      back: 'Πίσω',
      rememberDevice: 'Εμπιστοσύνη αυτής της συσκευής για 30 ημέρες',
      attemptCount: 'Εναπομείναντες προσπάθειες:',
      lockedOut: 'Πάρα πολλές αποτυχημένες προσπάθειες. Παρακαλώ περιμένετε:',
      scanQr: 'Σάρωση QR Κώδικα',
      scanQrDesc: 'Σαρώστε αυτόν τον κώδικα με την εφαρμογή αυθεντικοποίησής σας',
      manualEntry: 'Χειροκίνητη Εισαγωγή',
      setupComplete: 'Ολοκλήρωση Ρύθμισης',
      downloadCodes: 'Λήψη Εφεδρικών Κωδικών',
      setupLater: 'Ρύθμιση αργότερα',
      language: 'Γλώσσα',
      english: 'English',
      greek: 'Ελληνικά',
      needHelp: 'Χρειάζεστε βοήθεια;',
      contactSupport: 'Επικοινωνία με υποστήριξη',
      securityTip: 'Συμβουλή ασφαλείας: Μην μοιράζεστε ποτέ τους κωδικούς σας',
    },
  };

  const text = translations[currentLocale];

  const getMfaMethodIcon = (method: MfaMethod) => {
    switch (method) {
      case 'totp': return <Smartphone className="h-6 w-6" />;
      case 'sms': return <Smartphone className="h-6 w-6" />;
      case 'webauthn': return <Fingerprint className="h-6 w-6" />;
      case 'backup': return <Key className="h-6 w-6" />;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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

          {/* Back Button */}
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {text.back}
            </Button>
          </div>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'setup' ? text.setupTitle : text.title}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {mode === 'setup' ? text.setupSubtitle : text.subtitle}
            </CardDescription>
            {userEmail && (
              <p className="text-sm text-gray-500 mt-2">{userEmail}</p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Display */}
          {verifyMutation.error && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {verifyMutation.error instanceof Error ? verifyMutation.error.message : 'Verification failed'}
              </AlertDescription>
            </Alert>
          )}

          {/* Lockout Warning */}
          {isLocked && (
            <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {text.lockedOut} {formatTime(timeRemaining)}
              </AlertDescription>
            </Alert>
          )}

          {/* Attempt Counter */}
          {!isLocked && attemptCount > 0 && attemptCount < 5 && (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {text.attemptCount} {5 - attemptCount}
              </AlertDescription>
            </Alert>
          )}

          {/* Setup Mode */}
          {mode === 'setup' && (
            <>
              {setupStep === 'method' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-center">{text.chooseMethod}</h3>
                  
                  <div className="grid gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="justify-start h-auto p-4"
                      onClick={() => handleSetupMethod('totp')}
                      disabled={setupMutation.isPending}
                    >
                      <div className="flex items-center space-x-3">
                        <Smartphone className="h-6 w-6 text-blue-600" />
                        <div className="text-left">
                          <div className="font-medium">{text.authenticatorApp}</div>
                          <div className="text-sm text-gray-500">{text.authenticatorDesc}</div>
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="justify-start h-auto p-4"
                      onClick={() => handleSetupMethod('webauthn')}
                      disabled={setupMutation.isPending}
                    >
                      <div className="flex items-center space-x-3">
                        <Fingerprint className="h-6 w-6 text-green-600" />
                        <div className="text-left">
                          <div className="font-medium">{text.securityKey}</div>
                          <div className="text-sm text-gray-500">{text.securityKeyDesc}</div>
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      className="justify-start h-auto p-4"
                      onClick={() => handleSetupMethod('backup')}
                      disabled={setupMutation.isPending}
                    >
                      <div className="flex items-center space-x-3">
                        <Key className="h-6 w-6 text-purple-600" />
                        <div className="text-left">
                          <div className="font-medium">{text.backupCodes}</div>
                          <div className="text-sm text-gray-500">{text.backupCodesDesc}</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {setupStep === 'configure' && activeMethod === 'totp' && qrCodeUrl && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-4">{text.scanQr}</h3>
                    <div className="bg-white p-4 rounded-lg border inline-block">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{text.scanQrDesc}</p>
                  </div>
                  
                  <Button
                    onClick={() => setSetupStep('verify')}
                    className="w-full"
                  >
                    {text.continue}
                  </Button>
                </div>
              )}

              {setupStep === 'backup' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-4">{text.backupCodes}</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-gray-500">{(index + 1).toString().padStart(2, '0')}.</span>
                            <span>{code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={downloadBackupCodes}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {text.downloadCodes}
                  </Button>

                  <Button
                    onClick={() => setMode('challenge')}
                    className="w-full"
                  >
                    {text.setupComplete}
                  </Button>
                </div>
              )}

              {setupStep === 'verify' && (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="verification-code">{text.enterCode}</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="123456"
                      className="text-center text-lg tracking-widest mt-1"
                      {...form.register('code')}
                      autoFocus
                    />
                    {form.formState.errors.code && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.code.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyMutation.isPending || isLocked}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      text.verify
                    )}
                  </Button>
                </form>
              )}
            </>
          )}

          {/* Challenge Mode */}
          {mode === 'challenge' && (
            <Tabs value={activeMethod} onValueChange={(value) => setActiveMethod(value as MfaMethod)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="totp" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">App</span>
                </TabsTrigger>
                <TabsTrigger value="webauthn" className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  <span className="hidden sm:inline">Key</span>
                </TabsTrigger>
                <TabsTrigger value="backup" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className="hidden sm:inline">Backup</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="totp" className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="totp-code">{text.enterCode}</Label>
                    <Input
                      id="totp-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="123456"
                      className="text-center text-lg tracking-widest mt-1"
                      {...form.register('code')}
                      autoFocus
                    />
                    {form.formState.errors.code && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.code.message}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="remember-device"
                      className="rounded"
                      {...form.register('rememberDevice')}
                    />
                    <Label htmlFor="remember-device" className="text-sm">
                      {text.rememberDevice}
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyMutation.isPending || isLocked}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      text.verify
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="webauthn" className="space-y-4">
                <div className="text-center py-8">
                  <Fingerprint className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-600">Touch your security key or use biometric authentication</p>
                  
                  <Button
                    className="mt-4"
                    onClick={() => {
                      // Trigger WebAuthn flow
                      form.setValue('method', 'webauthn');
                      form.setValue('code', 'webauthn-response');
                      form.handleSubmit(onSubmit)();
                    }}
                    disabled={verifyMutation.isPending || isLocked}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      'Use Security Key'
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="backup" className="space-y-4">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="backup-code">Backup Code</Label>
                    <Input
                      id="backup-code"
                      type="text"
                      maxLength={9}
                      placeholder="1234-5678"
                      className="text-center font-mono mt-1"
                      {...form.register('code')}
                      autoFocus
                    />
                    {form.formState.errors.code && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.code.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={verifyMutation.isPending || isLocked}
                  >
                    {verifyMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      text.verify
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {/* Help Section */}
          <div className="text-center border-t pt-4">
            <p className="text-sm text-gray-500">
              {text.needHelp}{' '}
              <Link href="/support" className="text-blue-600 hover:text-blue-500">
                {text.contactSupport}
              </Link>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {text.securityTip}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}