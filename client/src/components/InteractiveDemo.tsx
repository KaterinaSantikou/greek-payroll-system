/**
 * Interactive PayrollSync Demo
 * Guides users through a complete payroll run with Greek compliance
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play,
  CheckCircle,
  Clock,
  Users,
  Calculator,
  FileCheck,
  CreditCard,
  ArrowRight,
  Eye,
  Edit3,
  Upload,
  Download,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface InteractiveDemoProps {
  onClose?: () => void;
  autoPlay?: boolean;
}

const DEMO_STEPS = [
  {
    id: 1,
    title: "Employee Overview",
    titleEl: "Επισκόπηση Υπαλλήλων",
    duration: 3000,
    icon: Users,
    color: "bg-blue-500"
  },
  {
    id: 2, 
    title: "Time & Attendance Review",
    titleEl: "Έλεγχος Χρόνου & Παρουσίας",
    duration: 4000,
    icon: Clock,
    color: "bg-green-500"
  },
  {
    id: 3,
    title: "Payroll Calculation",
    titleEl: "Υπολογισμός Μισθοδοσίας", 
    duration: 3500,
    icon: Calculator,
    color: "bg-purple-500"
  },
  {
    id: 4,
    title: "Greek Compliance Check",
    titleEl: "Έλεγχος Ελληνικής Συμμόρφωσης",
    duration: 3000,
    icon: FileCheck,
    color: "bg-orange-500"
  },
  {
    id: 5,
    title: "SEPA Payment Generation",
    titleEl: "Δημιουργία Πληρωμών SEPA",
    duration: 2500,
    icon: CreditCard,
    color: "bg-indigo-500"
  }
];

export default function InteractiveDemo({ onClose, autoPlay = false }: InteractiveDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [locale, setLocale] = useState<'en' | 'el'>('en');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Auto-progress through demo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStep < DEMO_STEPS.length) {
      const stepDuration = DEMO_STEPS[currentStep].duration;
      
      interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / (stepDuration / 100));
          
          if (newProgress >= 100) {
            setCompletedSteps(prev => [...prev, currentStep]);
            setCurrentStep(prev => prev + 1);
            return 0;
          }
          
          return newProgress;
        });
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const jumpToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    setProgress(0);
    setIsPlaying(true);
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setProgress(0);
    setCompletedSteps([]);
    setIsPlaying(false);
  };

  const isComplete = currentStep >= DEMO_STEPS.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Demo Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {locale === 'en' ? 'PayrollSync Interactive Demo' : 'Διαδραστικό Demo PayrollSync'}
            </h1>
            <p className="text-gray-600">
              {locale === 'en' 
                ? 'See how we process payroll for 25 hotel employees in under 5 minutes'
                : 'Δείτε πώς επεξεργαζόμαστε μισθοδοσία για 25 υπαλλήλους ξενοδοχείου σε λιγότερο από 5 λεπτά'
              }
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}
            >
              {locale === 'en' ? 'EL' : 'EN'}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                {locale === 'en' ? 'Close' : 'Κλείσιμο'}
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePlayPause}
                  disabled={isComplete}
                  className={isComplete ? 'bg-green-600' : ''}
                >
                  {isComplete ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isPlaying ? (
                    <div className="h-4 w-4 border-2 border-white rounded-sm" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm font-medium">
                  {isComplete 
                    ? (locale === 'en' ? 'Demo Complete!' : 'Demo Ολοκληρώθηκε!')
                    : `${locale === 'en' ? 'Step' : 'Βήμα'} ${currentStep + 1}/${DEMO_STEPS.length}`
                  }
                </span>
              </div>
              
              <Button size="sm" variant="ghost" onClick={resetDemo}>
                {locale === 'en' ? 'Restart' : 'Επανεκκίνηση'}
              </Button>
            </div>
            
            {!isComplete && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-gray-500 text-center">
                  {locale === 'en' 
                    ? (locale === 'en' ? DEMO_STEPS[currentStep]?.title : DEMO_STEPS[currentStep]?.titleEl)
                    : DEMO_STEPS[currentStep]?.titleEl
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demo Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Navigator */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {locale === 'en' ? 'Demo Steps' : 'Βήματα Demo'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DEMO_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = completedSteps.includes(index);
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => jumpToStep(index)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-50 border border-blue-200' 
                          : isCompleted 
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isCompleted ? 'bg-green-500' : step.color
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-white" />
                          ) : (
                            <Icon className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {locale === 'en' ? step.title : step.titleEl}
                          </div>
                        </div>
                        {isActive && (
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Area */}
        <div className="lg:col-span-3">
          <DemoStepContent 
            step={currentStep} 
            locale={locale}
            isPlaying={isPlaying}
            isComplete={isComplete}
          />
        </div>
      </div>
    </div>
  );
}

function DemoStepContent({ 
  step, 
  locale, 
  isPlaying, 
  isComplete 
}: { 
  step: number; 
  locale: 'en' | 'el'; 
  isPlaying: boolean;
  isComplete: boolean;
}) {
  if (isComplete) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {locale === 'en' ? 'Payroll Complete!' : 'Μισθοδοσία Ολοκληρώθηκε!'}
            </h3>
            <p className="text-gray-600 mb-4">
              {locale === 'en' 
                ? 'Processed 25 employees in 4 minutes with full Greek compliance'
                : 'Επεξεργάστηκαν 25 υπάλληλοι σε 4 λεπτά με πλήρη ελληνική συμμόρφωση'
              }
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button>
              {locale === 'en' ? 'Start Free Trial' : 'Ξεκινήστε Δωρεάν Δοκιμή'}
            </Button>
            <Button variant="outline">
              {locale === 'en' ? 'Talk to Sales' : 'Επικοινωνία Πωλήσεων'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  switch (step) {
    case 0:
      return <EmployeeOverviewStep locale={locale} isPlaying={isPlaying} />;
    case 1:
      return <TimeAttendanceStep locale={locale} isPlaying={isPlaying} />;
    case 2:
      return <PayrollCalculationStep locale={locale} isPlaying={isPlaying} />;
    case 3:
      return <ComplianceCheckStep locale={locale} isPlaying={isPlaying} />;
    case 4:
      return <SepaPaymentStep locale={locale} isPlaying={isPlaying} />;
    default:
      return <EmployeeOverviewStep locale={locale} isPlaying={isPlaying} />;
  }
}

function EmployeeOverviewStep({ locale, isPlaying }: { locale: 'en' | 'el'; isPlaying: boolean }) {
  const employees = [
    { name: "Maria Komnenos", position: "Front Office Manager", salary: "€1,200", status: "active" },
    { name: "Dimitris Paleologos", position: "Executive Chef", salary: "€1,450", status: "active" },
    { name: "Elena Vassiliou", position: "Restaurant Manager", salary: "€1,100", status: "active" },
    { name: "Kostas Alexandros", position: "Housekeeping Supervisor", salary: "€980", status: "active" },
    { name: "Anna Stavrou", position: "Reception Staff", salary: "€850", status: "active" }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {locale === 'en' ? 'Santikos Princess Hotel - Employees' : 'Ξενοδοχείο Santikos Princess - Υπάλληλοι'}
            </CardTitle>
            <Badge variant="secondary">
              {locale === 'en' ? '25 Employees' : '25 Υπάλληλοι'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employees.map((employee, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${
                  isPlaying ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-blue-600">
                      {employee.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-gray-600">{employee.position}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{employee.salary}</div>
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {locale === 'en' ? 'Active' : 'Ενεργός'}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="text-center py-2 text-gray-500">
              {locale === 'en' ? '+ 20 more employees...' : '+ 20 ακόμη υπάλληλοι...'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimeAttendanceStep({ locale, isPlaying }: { locale: 'en' | 'el'; isPlaying: boolean }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {locale === 'en' ? 'January 2025 - Time Review' : 'Ιανουάριος 2025 - Έλεγχος Χρόνου'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">3,240</div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Regular Hours' : 'Κανονικές Ώρες'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-orange-600">186</div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Overtime Hours' : 'Ώρες Υπερωρίας'}
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${
              isPlaying ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium">Maria Komnenos</div>
                  <div className="text-sm text-gray-600">
                    {locale === 'en' ? 'Sunday work detected' : 'Εντοπίστηκε Κυριακάτικη εργασία'}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'Review' : 'Έλεγχος'}
              </Button>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${
              isPlaying ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Dimitris Paleologos</div>
                  <div className="text-sm text-gray-600">
                    {locale === 'en' ? 'Night shift premium applies' : 'Εφαρμόζεται επίδομα νυχτερινής βάρδιας'}
                  </div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {locale === 'en' ? 'Auto-approved' : 'Αυτό-εγκρίθηκε'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollCalculationStep({ locale, isPlaying }: { locale: 'en' | 'el'; isPlaying: boolean }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {locale === 'en' ? 'Payroll Calculation' : 'Υπολογισμός Μισθοδοσίας'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">€28,450</div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Gross Pay' : 'Μικτές Αποδοχές'}
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">€7,120</div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Tax Deductions' : 'Φορολογικές Κρατήσεις'}
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">€1,898</div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'EFKA (Employee)' : 'ΕΦΚΑ (Υπάλληλος)'}
              </div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">€19,432</div>
              <div className="text-sm text-gray-600">
                {locale === 'en' ? 'Net Pay' : 'Καθαρές Αποδοχές'}
              </div>
            </Card>
          </div>

          <div className={`p-4 rounded-lg border transition-all duration-1000 ${
            isPlaying ? 'bg-green-50 border-green-200' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">
                {locale === 'en' ? 'Calculations Complete' : 'Υπολογισμοί Ολοκληρώθηκαν'}
              </span>
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ {locale === 'en' ? 'Greek tax brackets applied' : 'Εφαρμόστηκαν ελληνικές φορολογικές κλίμακες'}</li>
              <li>✓ {locale === 'en' ? 'EFKA contributions calculated' : 'Υπολογίστηκαν εισφορές ΕΦΚΑ'}</li>
              <li>✓ {locale === 'en' ? 'Overtime premiums included' : 'Συμπεριλήφθηκαν επιδόματα υπερωριών'}</li>
              <li>✓ {locale === 'en' ? 'Sunday/holiday rates applied' : 'Εφαρμόστηκαν τιμές Κυριακής/αργιών'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceCheckStep({ locale, isPlaying }: { locale: 'en' | 'el'; isPlaying: boolean }) {
  const complianceItems = [
    { name: 'ERGANI II', name_el: 'ΕΡΓΑΝΗ ΙΙ', status: 'ready' },
    { name: 'Digital Work Card', name_el: 'Ψηφιακή Κάρτα Εργασίας', status: 'ready' },
    { name: 'AΠΔ Form', name_el: 'Έντυπο ΑΠΔ', status: 'ready' },
    { name: 'ΦΜΥ Submission', name_el: 'Υποβολή ΦΜΥ', status: 'ready' }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            {locale === 'en' ? 'Greek Compliance Validation' : 'Επαλήθευση Ελληνικής Συμμόρφωσης'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complianceItems.map((item, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${
                  isPlaying ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">
                      {locale === 'en' ? item.name : item.name_el}
                    </div>
                    <div className="text-sm text-gray-600">
                      {locale === 'en' ? 'Ready for submission' : 'Έτοιμο για υποβολή'}
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {locale === 'en' ? 'Validated' : 'Επικυρώθηκε'}
                </Badge>
              </div>
            ))}
          </div>

          <div className={`mt-6 p-4 rounded-lg border transition-all duration-1000 ${
            isPlaying ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
          }`}>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800 mb-2">
                {locale === 'en' ? '100% Compliant' : '100% Συμβατό'}
              </div>
              <p className="text-sm text-gray-600">
                {locale === 'en' 
                  ? 'All Greek labor law requirements satisfied'
                  : 'Όλες οι απαιτήσεις του ελληνικού εργατικού δικαίου ικανοποιήθηκαν'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SepaPaymentStep({ locale, isPlaying }: { locale: 'en' | 'el'; isPlaying: boolean }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {locale === 'en' ? 'SEPA Payment Processing' : 'Επεξεργασία Πληρωμών SEPA'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border transition-all duration-1000 ${
              isPlaying ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">
                  {locale === 'en' ? 'Payment Batch Generated' : 'Δημιουργήθηκε Παρτίδα Πληρωμής'}
                </div>
                <Badge className="bg-blue-100 text-blue-800">Alpha Bank</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">
                    {locale === 'en' ? 'Total Amount:' : 'Συνολικό Ποσό:'}
                  </span>
                  <div className="font-semibold">€19,432.00</div>
                </div>
                <div>
                  <span className="text-gray-600">
                    {locale === 'en' ? 'Employees:' : 'Υπάλληλοι:'}
                  </span>
                  <div className="font-semibold">25</div>
                </div>
                <div>
                  <span className="text-gray-600">
                    {locale === 'en' ? 'Format:' : 'Μορφή:'}
                  </span>
                  <div className="font-semibold">pain.001.001.03</div>
                </div>
                <div>
                  <span className="text-gray-600">
                    {locale === 'en' ? 'Execution:' : 'Εκτέλεση:'}
                  </span>
                  <div className="font-semibold">
                    {locale === 'en' ? 'Instant' : 'Άμεση'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" disabled={!isPlaying}>
                <Download className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'Download SEPA File' : 'Λήψη Αρχείου SEPA'}
              </Button>
              <Button variant="outline" className="flex-1" disabled={!isPlaying}>
                <Upload className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'Submit to Bank' : 'Υποβολή στην Τράπεζα'}
              </Button>
            </div>

            <div className={`p-3 rounded-lg transition-all duration-1000 ${
              isPlaying ? 'bg-green-50 border border-green-200' : 'bg-gray-100'
            }`}>
              <div className="text-sm text-green-800 font-medium">
                {locale === 'en' 
                  ? '✓ Ready for instant SEPA transfer'
                  : '✓ Έτοιμο για άμεση μεταφορά SEPA'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}