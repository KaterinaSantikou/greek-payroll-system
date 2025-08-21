import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Calendar, Clock, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateModeChange } from '@/lib/digitalWorkCard';

interface CompanyWorkCardSettings {
  companyId: string;
  operationalMode: 'proactive' | 'retrospective';
  currentMonth: string;
  nextMonthMode?: 'proactive' | 'retrospective';
  maxRetrospectiveHours: number;
  overtimeReportingDeadline: number;
  strictTimestampValidation: boolean;
  mandatoryLocationVerification: boolean;
  penaltyThresholdEuros: number;
  auditRetentionYears: number;
  automaticComplianceAlerts: boolean;
}

export function DigitalWorkCardSettings() {
  const [settings, setSettings] = useState<CompanyWorkCardSettings>({
    companyId: 'COMPANY_001',
    operationalMode: 'proactive',
    currentMonth: new Date().toISOString().substring(0, 7),
    maxRetrospectiveHours: 72,
    overtimeReportingDeadline: 24,
    strictTimestampValidation: true,
    mandatoryLocationVerification: true,
    penaltyThresholdEuros: 10500,
    auditRetentionYears: 5,
    automaticComplianceAlerts: true
  });

  const [pendingModeChange, setPendingModeChange] = useState<{
    newMode: 'proactive' | 'retrospective';
    targetMonth: string;
    validation?: any;
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Calculate next month
  const getNextMonth = () => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next.toISOString().substring(0, 7);
  };

  const handleModeChangeRequest = (newMode: 'proactive' | 'retrospective') => {
    const targetMonth = getNextMonth();
    const validation = validateModeChange(
      settings.operationalMode,
      newMode,
      targetMonth,
      settings.currentMonth
    );

    setPendingModeChange({
      newMode,
      targetMonth,
      validation
    });
  };

  const confirmModeChange = async () => {
    if (!pendingModeChange) return;

    setIsSaving(true);
    try {
      // Here would be API call to save mode change
      setSettings(prev => ({
        ...prev,
        nextMonthMode: pendingModeChange.newMode
      }));

      setPendingModeChange(null);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof CompanyWorkCardSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ψηφιακή Κάρτα Εργασίας - Ρυθμίσεις</h1>
          <p className="text-gray-600 mt-2">
            Διαχείριση Προαναγγελτικού & Απολογιστικού Συστήματος
          </p>
        </div>
        <Badge 
          variant={settings.operationalMode === 'proactive' ? 'default' : 'secondary'}
          className="px-4 py-2 text-sm"
        >
          {settings.operationalMode === 'proactive' ? 'Προαναγγελτικό' : 'Απολογιστικό'} Σύστημα
        </Badge>
      </div>

      {/* Current Operational Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Τρόπος Λειτουργίας Συστήματος
          </CardTitle>
          <CardDescription>
            Επιλογή μεταξύ προαναγγελτικού και απολογιστικού συστήματος ERGANI II
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Mode Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Τρέχων Μήνας ({settings.currentMonth})</Label>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">
                  {settings.operationalMode === 'proactive' ? 'Προαναγγελτικό' : 'Απολογιστικό'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Επόμενος Μήνας ({getNextMonth()})</Label>
              <div className="flex items-center gap-2">
                <Select onValueChange={(value: 'proactive' | 'retrospective') => handleModeChangeRequest(value)}>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={settings.nextMonthMode ? 
                        (settings.nextMonthMode === 'proactive' ? 'Προαναγγελτικό' : 'Απολογιστικό') :
                        'Επιλέξτε τρόπο...'
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proactive">
                      <div className="flex flex-col">
                        <span>Προαναγγελτικό</span>
                        <span className="text-xs text-gray-500">
                          Προκαταρκτική δήλωση αλλαγών ωραρίου
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="retrospective">
                      <div className="flex flex-col">
                        <span>Απολογιστικό</span>
                        <span className="text-xs text-gray-500">
                          Εκ των υστέρων καταχώρηση εργασιακών γεγονότων
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Legal Compliance Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Νομικός Περιορισμός</AlertTitle>
            <AlertDescription>
              Δεν επιτρέπεται συνύπαρξη προαναγγελτικού και απολογιστικού στον ίδιο μήνα. 
              Η μετάβαση δηλώνεται πριν την έναρξη του μήνα.
              <br />
              <strong>Πρόστιμο:</strong> €10,500 ανά παράβαση
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Mode Change Validation */}
      {pendingModeChange && (
        <Card className={pendingModeChange.validation.isValid ? 'border-green-200' : 'border-red-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {pendingModeChange.validation.isValid ? 
                <CheckCircle2 className="w-5 h-5 text-green-600" /> : 
                <AlertCircle className="w-5 h-5 text-red-600" />
              }
              Επικύρωση Αλλαγής Τρόπου Λειτουργίας
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Από:</strong> {settings.operationalMode === 'proactive' ? 'Προαναγγελτικό' : 'Απολογιστικό'}</p>
                <p><strong>Προς:</strong> {pendingModeChange.newMode === 'proactive' ? 'Προαναγγελτικό' : 'Απολογιστικό'}</p>
                <p><strong>Ισχύει από:</strong> {pendingModeChange.targetMonth}</p>
              </div>
              <div>
                <p><strong>Κίνδυνος Προστίμου:</strong> €{pendingModeChange.validation.penaltyRisk.toLocaleString()}</p>
                <p className={pendingModeChange.validation.isValid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  <strong>Κατάσταση:</strong> {pendingModeChange.validation.isValid ? 'Έγκυρη Αλλαγή' : 'Μη Έγκυρη Αλλαγή'}
                </p>
              </div>
            </div>

            {/* Violations */}
            {pendingModeChange.validation.violations.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Παραβάσεις</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {pendingModeChange.validation.violations.map((violation: string, index: number) => (
                      <li key={index}>{violation}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {pendingModeChange.validation.recommendations.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Συστάσεις</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {pendingModeChange.validation.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPendingModeChange(null)}>
                Ακύρωση
              </Button>
              <Button 
                onClick={confirmModeChange}
                disabled={!pendingModeChange.validation.isValid || isSaving}
                className={pendingModeChange.validation.isValid ? '' : 'bg-red-600 hover:bg-red-700'}
              >
                {isSaving ? 'Αποθήκευση...' : 
                  pendingModeChange.validation.isValid ? 'Επιβεβαίωση Αλλαγής' : 'Αλλαγή με Ρίσκο'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retrospective Settings */}
      {(settings.operationalMode === 'retrospective' || settings.nextMonthMode === 'retrospective') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Ρυθμίσεις Απολογιστικού Συστήματος
            </CardTitle>
            <CardDescription>
              Προθεσμίες και περιορισμοί για εκ των υστέρων καταχωρήσεις
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="maxRetrospectiveHours">Μέγιστες Ώρες Καθυστέρησης</Label>
                <Input
                  id="maxRetrospectiveHours"
                  type="number"
                  value={settings.maxRetrospectiveHours}
                  onChange={(e) => updateSetting('maxRetrospectiveHours', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Προεπιλογή: 72 ώρες (3 ημέρες)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overtimeDeadline">Προθεσμία Υπερωριών (ώρες)</Label>
                <Input
                  id="overtimeDeadline"
                  type="number"
                  value={settings.overtimeReportingDeadline}
                  onChange={(e) => updateSetting('overtimeReportingDeadline', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Προεπιλογή: 24 ώρες</p>
              </div>
            </div>

            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Προσοχή</AlertTitle>
              <AlertDescription>
                Υπέρβαση των νομικών προθεσμιών μπορεί να επιφέρει πρόστιμα €10,500 ανά παράβαση.
                Τα "χτυπήματα" της κάρτας πρέπει να αντανακλούν την πραγματική έναρξη/λήξη εργασίας.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Compliance & Legal Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Συμμόρφωση & Νομικές Ρυθμίσεις
          </CardTitle>
          <CardDescription>
            Ρυθμίσεις για εξασφάλιση πλήρους νομικής συμμόρφωσης
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Compliance Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Αυστηρή Επικύρωση Χρονοσημάτων</Label>
                  <p className="text-sm text-gray-500">
                    Έλεγχος ακρίβειας χρονικών σημάτων
                  </p>
                </div>
                <Switch
                  checked={settings.strictTimestampValidation}
                  onCheckedChange={(checked) => updateSetting('strictTimestampValidation', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Υποχρεωτική Επαλήθευση Τοποθεσίας</Label>
                  <p className="text-sm text-gray-500">
                    GPS και geofencing έλεγχος
                  </p>
                </div>
                <Switch
                  checked={settings.mandatoryLocationVerification}
                  onCheckedChange={(checked) => updateSetting('mandatoryLocationVerification', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Αυτόματες Ειδοποιήσεις Συμμόρφωσης</Label>
                  <p className="text-sm text-gray-500">
                    Alerts για εκπρόθεσμες καταχωρήσεις
                  </p>
                </div>
                <Switch
                  checked={settings.automaticComplianceAlerts}
                  onCheckedChange={(checked) => updateSetting('automaticComplianceAlerts', checked)}
                />
              </div>
            </div>

            {/* Legal Values */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="penaltyThreshold">Όριο Προστίμου (€)</Label>
                <Input
                  id="penaltyThreshold"
                  type="number"
                  value={settings.penaltyThresholdEuros}
                  onChange={(e) => updateSetting('penaltyThresholdEuros', parseFloat(e.target.value))}
                  className="w-full"
                  disabled
                />
                <p className="text-sm text-gray-500">Νομικό όριο: €10,500</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditRetention">Χρόνια Διατήρησης Αρχείων</Label>
                <Input
                  id="auditRetention"
                  type="number"
                  min="5"
                  value={settings.auditRetentionYears}
                  onChange={(e) => updateSetting('auditRetentionYears', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Ελάχιστο: 5 έτη (νομική υποχρέωση)</p>
              </div>
            </div>
          </div>

          {/* Legal Information */}
          <Alert className="border-gray-200 bg-gray-50">
            <Calendar className="h-4 w-4" />
            <AlertTitle>Νομικό Πλαίσιο</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                <p><strong>5-ετής Διατήρηση:</strong> Τεκμηρίωση/αρχεία συστήματος ωραρίου τηρούνται ≥5 έτη</p>
                <p><strong>Πρόστιμα:</strong> €10,500 ανά παράβαση για λανθασμένα χτυπήματα κάρτας</p>
                <p><strong>Αναφορές:</strong> Υπ. Εργασίας - Οδηγός ΨΚΕ, ERGANI II Regulation, EY Tax Guide</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <Alert className={saveStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {saveStatus === 'success' ? 
            <CheckCircle2 className="h-4 w-4" /> : 
            <AlertCircle className="h-4 w-4" />
          }
          <AlertTitle>
            {saveStatus === 'success' ? 'Επιτυχής Αποθήκευση' : 'Σφάλμα Αποθήκευσης'}
          </AlertTitle>
          <AlertDescription>
            {saveStatus === 'success' ? 
              'Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς.' : 
              'Προέκυψε σφάλμα κατά την αποθήκευση των ρυθμίσεων.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline">
          Επαναφορά Προεπιλεγμένων
        </Button>
        <Button onClick={() => {
          setIsSaving(true);
          // Simulate save
          setTimeout(() => {
            setIsSaving(false);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
          }, 1000);
        }}>
          {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Ρυθμίσεων'}
        </Button>
      </div>
    </div>
  );
}