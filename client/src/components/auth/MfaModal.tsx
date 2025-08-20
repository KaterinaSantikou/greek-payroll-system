import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Shield, Key, Fingerprint, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MfaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'setup' | 'verify' | 'challenge';
  onVerify: (method: 'totp' | 'webauthn' | 'backup', value: string) => Promise<boolean>;
  onSetupComplete?: () => void;
  availableMethods?: {
    totp: boolean;
    webauthn: boolean;
    backupCodes: boolean;
  };
  backupCodes?: string[];
  qrCodeDataUrl?: string;
  error?: string;
  loading?: boolean;
}

export function MfaModal({
  open,
  onOpenChange,
  mode,
  onVerify,
  onSetupComplete,
  availableMethods = { totp: true, webauthn: true, backupCodes: true },
  backupCodes = [],
  qrCodeDataUrl,
  error,
  loading = false,
}: MfaModalProps) {
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [activeTab, setActiveTab] = useState<'totp' | 'webauthn' | 'backup'>('totp');
  const [setupStep, setSetupStep] = useState<'choose' | 'totp-setup' | 'webauthn-setup' | 'backup-codes'>('choose');

  const handleTotpVerify = async () => {
    if (totpCode.length === 6) {
      const success = await onVerify('totp', totpCode);
      if (success) {
        setTotpCode('');
        if (mode === 'setup') {
          onSetupComplete?.();
        }
      }
    }
  };

  const handleWebAuthnVerify = async () => {
    try {
      // WebAuthn verification would happen here
      const success = await onVerify('webauthn', '');
      if (success && mode === 'setup') {
        onSetupComplete?.();
      }
    } catch (err) {
      console.error('WebAuthn verification failed:', err);
    }
  };

  const handleBackupCodeVerify = async () => {
    if (backupCode.length >= 8) {
      const success = await onVerify('backup', backupCode);
      if (success) {
        setBackupCode('');
      }
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

  if (mode === 'setup') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Set Up Multi-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Secure your account with an additional layer of protection
            </DialogDescription>
          </DialogHeader>

          {setupStep === 'choose' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {availableMethods.totp && (
                  <Card className="cursor-pointer hover:bg-accent" onClick={() => setSetupStep('totp-setup')}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        <CardTitle className="text-lg">Authenticator App</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        Use Google Authenticator, Authy, or similar app to generate codes
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}

                {availableMethods.webauthn && (
                  <Card className="cursor-pointer hover:bg-accent" onClick={() => setSetupStep('webauthn-setup')}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-5 w-5" />
                        <CardTitle className="text-lg">Security Key</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        Use a hardware security key or biometric authentication
                      </CardDescription>
                    </CardContent>
                  </Card>
                )}
              </div>

              {availableMethods.backupCodes && (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      <CardTitle className="text-lg">Backup Codes</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      Generate one-time backup codes to access your account if other methods are unavailable
                    </CardDescription>
                    <Button variant="outline" onClick={() => setSetupStep('backup-codes')} className="w-full">
                      Generate Backup Codes
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {setupStep === 'totp-setup' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Scan QR Code</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Scan this QR code with your authenticator app
                </p>
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="mx-auto border rounded" />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-muted rounded flex items-center justify-center">
                    QR Code Loading...
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="totp-verify">Enter 6-digit code from your app</Label>
                <Input
                  id="totp-verify"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSetupStep('choose')}>
                  Back
                </Button>
                <Button 
                  onClick={handleTotpVerify}
                  disabled={totpCode.length !== 6 || loading}
                >
                  {loading ? 'Verifying...' : 'Verify & Complete'}
                </Button>
              </div>
            </div>
          )}

          {setupStep === 'webauthn-setup' && (
            <div className="space-y-4 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Fingerprint className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2">Set Up Security Key</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below and follow your browser's instructions to register your security key or biometric authentication.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setSetupStep('choose')}>
                  Back
                </Button>
                <Button 
                  onClick={handleWebAuthnVerify}
                  disabled={loading}
                >
                  {loading ? 'Setting Up...' : 'Set Up Security Key'}
                </Button>
              </div>
            </div>
          )}

          {setupStep === 'backup-codes' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Your Backup Codes</h3>
                <p className="text-sm text-muted-foreground">
                  Save these codes in a secure location. Each code can only be used once.
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="text-muted-foreground">{(index + 1).toString().padStart(2, '0')}.</span>
                        <span>{code}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Download these codes now. You won't be able to see them again.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSetupStep('choose')}>
                  Back
                </Button>
                <Button onClick={downloadBackupCodes}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Codes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Verify/Challenge mode
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your authentication code to continue
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="totp" disabled={!availableMethods.totp}>
              <Smartphone className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="webauthn" disabled={!availableMethods.webauthn}>
              <Fingerprint className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="backup" disabled={!availableMethods.backupCodes}>
              <Key className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button 
              onClick={handleTotpVerify}
              disabled={totpCode.length !== 6 || loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </TabsContent>

          <TabsContent value="webauthn" className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Fingerprint className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Use your security key or biometric authentication
              </p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive justify-center">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button 
              onClick={handleWebAuthnVerify}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Authenticating...' : 'Use Security Key'}
            </Button>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Enter one of your backup codes
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.replace(/[^0-9-]/g, ''))}
                placeholder="1234-5678"
                className="text-center font-mono"
                maxLength={9}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <Button 
              onClick={handleBackupCodeVerify}
              disabled={backupCode.length < 8 || loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}