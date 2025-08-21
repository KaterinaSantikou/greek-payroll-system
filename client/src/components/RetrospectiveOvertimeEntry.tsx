import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Clock, CheckCircle2, AlertCircle, Euro, Calendar } from 'lucide-react';
import { createRetrospectiveOvertimeEntry, validateRetrospectiveEntry } from '@/lib/digitalWorkCard';

interface OvertimeEntry {
  employeeId: string;
  employeeName: string;
  workDate: string;
  overtimeStart: string;
  overtimeEnd: string;
  overtimeType: 'regular' | 'night' | 'holiday' | 'sunday';
  reason: string;
}

interface CompanySettings {
  operationalMode: 'retrospective';
  maxRetrospectiveHours: number;
  overtimeReportingDeadline: number;
  automaticComplianceAlerts: boolean;
}

export function RetrospectiveOvertimeEntry() {
  const [entry, setEntry] = useState<OvertimeEntry>({
    employeeId: '',
    employeeName: '',
    workDate: '',
    overtimeStart: '',
    overtimeEnd: '',
    overtimeType: 'regular',
    reason: ''
  });

  const [companySettings] = useState<CompanySettings>({
    operationalMode: 'retrospective',
    maxRetrospectiveHours: 72,
    overtimeReportingDeadline: 24,
    automaticComplianceAlerts: true
  });

  const [validation, setValidation] = useState<{
    isValid: boolean;
    reportingDelayHours: number;
    deadlineMet: boolean;
    penaltyRisk: number;
    warnings: string[];
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Mock employees for demo
  const employees = [
    { id: 'EMP001', name: 'Γιάννης Παπαδόπουλος', department: 'Ρεσεψιόν' },
    { id: 'EMP002', name: 'Μαρία Κωνσταντίνου', department: 'Καθαριότητα' },
    { id: 'EMP003', name: 'Νίκος Αντωνίου', department: 'Εστιατόριο' },
    { id: 'EMP004', name: 'Ελένη Μιχαηλίδου', department: 'Συντήρηση' }
  ];

  // Validate entry whenever key fields change
  useEffect(() => {
    if (entry.workDate && entry.overtimeStart && entry.overtimeEnd) {
      validateEntry();
    }
  }, [entry.workDate, entry.overtimeStart, entry.overtimeEnd]);

  const validateEntry = () => {
    if (!entry.workDate) return;

    const workDateTime = new Date(entry.workDate);
    const now = new Date();
    const hoursDelay = Math.floor((now.getTime() - workDateTime.getTime()) / (1000 * 60 * 60));
    
    // Check deadlines
    const generalDeadlineMet = hoursDelay <= companySettings.maxRetrospectiveHours;
    const overtimeDeadlineMet = hoursDelay <= companySettings.overtimeReportingDeadline;
    
    const warnings: string[] = [];
    let penaltyRisk = 0;

    if (!generalDeadlineMet) {
      warnings.push(`Υπερβολική καθυστέρηση αναφοράς: ${hoursDelay}h (όριο: ${companySettings.maxRetrospectiveHours}h)`);
      penaltyRisk += 10500; // €10,500 penalty
    }

    if (!overtimeDeadlineMet) {
      warnings.push(`Εκπρόθεσμη αναφορά υπερωριών: ${hoursDelay}h (προθεσμία: ${companySettings.overtimeReportingDeadline}h)`);
      penaltyRisk += 10500;
    }

    if (entry.overtimeStart && entry.overtimeEnd) {
      const startTime = new Date(`${entry.workDate}T${entry.overtimeStart}`);
      const endTime = new Date(`${entry.workDate}T${entry.overtimeEnd}`);
      const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (durationHours > 3) {
        warnings.push(`Υπερβολικές υπερωρίες: ${durationHours.toFixed(1)}h (συνιστώμενο μέγιστο: 3h)`);
      }

      if (durationHours <= 0) {
        warnings.push('Μη έγκυρο εύρος ωρών υπερωριών');
      }
    }

    setValidation({
      isValid: warnings.length === 0,
      reportingDelayHours: hoursDelay,
      deadlineMet: generalDeadlineMet && overtimeDeadlineMet,
      penaltyRisk,
      warnings
    });
  };

  const calculateOvertimeInfo = () => {
    if (!entry.overtimeStart || !entry.overtimeEnd) return null;

    const startTime = new Date(`${entry.workDate}T${entry.overtimeStart}`);
    const endTime = new Date(`${entry.workDate}T${entry.overtimeEnd}`);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const rates = {
      regular: 1.25,
      night: 1.50,
      holiday: 1.75,
      sunday: 1.75
    };

    const rate = rates[entry.overtimeType];
    const baseHourlyRate = 12.50; // Mock base rate
    const overtimeAmount = durationHours * baseHourlyRate * rate;

    return {
      duration: durationHours,
      rate,
      amount: overtimeAmount
    };
  };

  const handleSubmit = async () => {
    if (!validation?.isValid) return;

    setIsSubmitting(true);
    try {
      // Create retrospective entry
      const retrospectiveEntry = createRetrospectiveOvertimeEntry(
        entry.employeeId,
        entry.workDate,
        `${entry.workDate}T${entry.overtimeStart}`,
        `${entry.workDate}T${entry.overtimeEnd}`,
        entry.overtimeType
      );

      // Here would be API call to save entry
      console.log('Retrospective overtime entry:', retrospectiveEntry);

      setSubmitStatus('success');
      setTimeout(() => setSubmitStatus('idle'), 3000);

      // Reset form
      setEntry({
        employeeId: '',
        employeeName: '',
        workDate: '',
        overtimeStart: '',
        overtimeEnd: '',
        overtimeType: 'regular',
        reason: ''
      });
      setValidation(null);
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const overtimeInfo = calculateOvertimeInfo();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Απολογιστική Καταχώρηση Υπερωριών</h1>
          <p className="text-gray-600 mt-2">
            Εκ των υστέρων δήλωση υπερωριακής εργασίας
          </p>
        </div>
        <Badge variant="secondary" className="px-4 py-2">
          Απολογιστικό Σύστημα
        </Badge>
      </div>

      {/* Legal Warning */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Προσοχή - Νομικές Προθεσμίες</AlertTitle>
        <AlertDescription>
          <div className="space-y-1">
            <p><strong>Γενική Προθεσμία:</strong> {companySettings.maxRetrospectiveHours} ώρες από την εκτέλεση της εργασίας</p>
            <p><strong>Υπερωρίες:</strong> {companySettings.overtimeReportingDeadline} ώρες από την εκτέλεση</p>
            <p><strong>Πρόστιμο:</strong> €10,500 ανά παράβαση για εκπρόθεσμες αναφορές</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Στοιχεία Υπερωριακής Εργασίας
          </CardTitle>
          <CardDescription>
            Συμπληρώστε όλα τα απαιτούμενα στοιχεία για την απολογιστική καταχώρηση
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee">Εργαζόμενος *</Label>
              <Select 
                value={entry.employeeId} 
                onValueChange={(value) => {
                  const selectedEmployee = employees.find(emp => emp.id === value);
                  setEntry(prev => ({
                    ...prev,
                    employeeId: value,
                    employeeName: selectedEmployee?.name || ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε εργαζόμενο..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex flex-col">
                        <span>{emp.name}</span>
                        <span className="text-xs text-gray-500">{emp.department}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Work Date */}
            <div className="space-y-2">
              <Label htmlFor="workDate">Ημερομηνία Εργασίας *</Label>
              <Input
                id="workDate"
                type="date"
                value={entry.workDate}
                onChange={(e) => setEntry(prev => ({ ...prev, workDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            {/* Overtime Start */}
            <div className="space-y-2">
              <Label htmlFor="overtimeStart">Έναρξη Υπερωριών *</Label>
              <Input
                id="overtimeStart"
                type="time"
                value={entry.overtimeStart}
                onChange={(e) => setEntry(prev => ({ ...prev, overtimeStart: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Overtime End */}
            <div className="space-y-2">
              <Label htmlFor="overtimeEnd">Λήξη Υπερωριών *</Label>
              <Input
                id="overtimeEnd"
                type="time"
                value={entry.overtimeEnd}
                onChange={(e) => setEntry(prev => ({ ...prev, overtimeEnd: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Overtime Type */}
            <div className="space-y-2">
              <Label htmlFor="overtimeType">Τύπος Υπερωριών</Label>
              <Select 
                value={entry.overtimeType} 
                onValueChange={(value: 'regular' | 'night' | 'holiday' | 'sunday') => 
                  setEntry(prev => ({ ...prev, overtimeType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">
                    <div className="flex flex-col">
                      <span>Κανονικές Υπερωρίες</span>
                      <span className="text-xs text-gray-500">Προσαύξηση: 25%</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="night">
                    <div className="flex flex-col">
                      <span>Νυχτερινές Υπερωρίες</span>
                      <span className="text-xs text-gray-500">Προσαύξηση: 50%</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="holiday">
                    <div className="flex flex-col">
                      <span>Αργίες</span>
                      <span className="text-xs text-gray-500">Προσαύξηση: 75%</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sunday">
                    <div className="flex flex-col">
                      <span>Κυριακές</span>
                      <span className="text-xs text-gray-500">Προσαύξηση: 75%</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Calculation Summary */}
            {overtimeInfo && (
              <div className="space-y-2">
                <Label>Υπολογισμός Αμοιβής</Label>
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="space-y-1 text-sm">
                    <p><strong>Διάρκεια:</strong> {overtimeInfo.duration.toFixed(1)} ώρες</p>
                    <p><strong>Συντελεστής:</strong> x{overtimeInfo.rate}</p>
                    <p className="text-lg font-bold text-green-600">
                      <Euro className="w-4 h-4 inline mr-1" />
                      {overtimeInfo.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Αιτιολογία Υπερωριακής Εργασίας *</Label>
            <Textarea
              id="reason"
              value={entry.reason}
              onChange={(e) => setEntry(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Περιγράψτε τον λόγο της υπερωριακής εργασίας..."
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card className={validation.isValid ? 'border-green-200' : 'border-red-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.isValid ? 
                <CheckCircle2 className="w-5 h-5 text-green-600" /> : 
                <AlertCircle className="w-5 h-5 text-red-600" />
              }
              Επικύρωση Καταχώρησης
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Καθυστέρηση Αναφοράς</p>
                <p className="text-lg font-medium">{validation.reportingDelayHours} ώρες</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Προθεσμίες</p>
                <p className={`text-lg font-medium ${validation.deadlineMet ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.deadlineMet ? 'Εντός ορίων' : 'Εκπρόθεσμη'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Κίνδυνος Προστίμου</p>
                <p className={`text-lg font-medium ${validation.penaltyRisk > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  €{validation.penaltyRisk.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Προβλήματα Συμμόρφωσης</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Success Message */}
            {validation.isValid && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Έγκυρη Καταχώρηση</AlertTitle>
                <AlertDescription>
                  Η καταχώρηση πληροί όλες τις νομικές προϋποθέσεις και μπορεί να υποβληθεί.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Status */}
      {submitStatus !== 'idle' && (
        <Alert className={submitStatus === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {submitStatus === 'success' ? 
            <CheckCircle2 className="h-4 w-4" /> : 
            <AlertCircle className="h-4 w-4" />
          }
          <AlertTitle>
            {submitStatus === 'success' ? 'Επιτυχής Καταχώρηση' : 'Σφάλμα Καταχώρησης'}
          </AlertTitle>
          <AlertDescription>
            {submitStatus === 'success' ? 
              'Η απολογιστική καταχώρηση υπερωριών καταχωρήθηκε επιτυχώς και στάλθηκε στο ERGANI II.' : 
              'Προέκυψε σφάλμα κατά την καταχώρηση. Παρακαλούμε δοκιμάστε ξανά.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button 
          variant="outline" 
          onClick={() => {
            setEntry({
              employeeId: '',
              employeeName: '',
              workDate: '',
              overtimeStart: '',
              overtimeEnd: '',
              overtimeType: 'regular',
              reason: ''
            });
            setValidation(null);
          }}
        >
          Καθαρισμός Φόρμας
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!validation?.isValid || isSubmitting || !entry.employeeId || !entry.reason}
          className={validation?.penaltyRisk > 0 ? 'bg-amber-600 hover:bg-amber-700' : ''}
        >
          {isSubmitting ? 'Καταχώρηση...' : 
            validation?.penaltyRisk > 0 ? 'Καταχώρηση με Ρίσκο' : 'Καταχώρηση Υπερωριών'}
        </Button>
      </div>
    </div>
  );
}