/**
 * Onboarding Chatbot for PayrollSync
 * Intelligent assistant to guide new Greek customers through setup
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MessageCircle,
  Send,
  Bot,
  User,
  CheckCircle,
  ArrowRight,
  Building2,
  Users,
  CreditCard,
  FileText,
  Settings,
  Globe,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
  Clock,
  Shield,
  Zap,
  Target,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'system';
  content: string;
  timestamp: Date;
  options?: ChatOption[];
  component?: React.ReactNode;
}

interface ChatOption {
  id: string;
  label: string;
  labelEl?: string;
  action: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
}

interface OnboardingStep {
  id: string;
  title: string;
  titleEl: string;
  description: string;
  descriptionEl: string;
  completed: boolean;
  required: boolean;
  icon: React.ElementType;
}

interface OnboardingChatbotProps {
  locale?: 'en' | 'el';
  onClose?: () => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'company-setup',
    title: 'Company Information',
    titleEl: 'Στοιχεία Εταιρείας',
    description: 'Basic company details and Greek business registration',
    descriptionEl:
      'Βασικά στοιχεία εταιρείας και ελληνική επιχειρηματική εγγραφή',
    completed: false,
    required: true,
    icon: Building2,
  },
  {
    id: 'employees',
    title: 'Employee Setup',
    titleEl: 'Ρύθμιση Υπαλλήλων',
    description: 'Import or add employee information and Greek IDs',
    descriptionEl:
      'Εισαγωγή ή προσθήκη στοιχείων υπαλλήλων και ελληνικών ταυτοτήτων',
    completed: false,
    required: true,
    icon: Users,
  },
  {
    id: 'compliance',
    title: 'Greek Compliance',
    titleEl: 'Ελληνική Συμμόρφωση',
    description: 'ERGANI II, e-EFKA, and AADE integration setup',
    descriptionEl: 'Ρύθμιση ενσωμάτωσης ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ και ΑΑΔΕ',
    completed: false,
    required: true,
    icon: Shield,
  },
  {
    id: 'banking',
    title: 'SEPA Banking',
    titleEl: 'Τραπεζικές Υπηρεσίες SEPA',
    description: 'Configure salary payments and Greek bank integration',
    descriptionEl: 'Ρύθμιση πληρωμών μισθών και ενσωμάτωσης ελληνικής τράπεζας',
    completed: false,
    required: true,
    icon: CreditCard,
  },
  {
    id: 'payroll-settings',
    title: 'Payroll Configuration',
    titleEl: 'Ρύθμιση Μισθοδοσίας',
    description: 'Tax rates, insurance, and Greek payroll rules',
    descriptionEl:
      'Φορολογικά ποσοστά, ασφάλιση και κανόνες ελληνικής μισθοδοσίας',
    completed: false,
    required: true,
    icon: Settings,
  },
  {
    id: 'first-payroll',
    title: 'First Payroll Run',
    titleEl: 'Πρώτη Εκτέλεση Μισθοδοσίας',
    description: 'Complete your first Greek payroll calculation',
    descriptionEl: 'Ολοκλήρωση του πρώτου υπολογισμού ελληνικής μισθοδοσίας',
    completed: false,
    required: false,
    icon: Target,
  },
];

export default function OnboardingChatbot({
  locale = 'en',
  onClose,
  minimized = false,
  onToggleMinimize,
}: OnboardingChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onboardingSteps, setOnboardingSteps] = useState(ONBOARDING_STEPS);
  const [currentStep, setCurrentStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const translations = {
    en: {
      title: 'PayrollSync Setup Assistant',
      subtitle: 'Let me help you set up your Greek payroll system',
      placeholder: 'Type your message...',
      send: 'Send',
      minimize: 'Minimize',
      maximize: 'Expand',
      close: 'Close',
      progress: 'Setup Progress',
      completed: 'Completed',
      next: 'Next',
      skip: 'Skip',
      getStarted: 'Get Started',
      help: 'How can I help you?',
      typing: 'Assistant is typing...',
      welcome: {
        message:
          "Welcome to PayrollSync! I'm your setup assistant. I'll help you configure your Greek payroll system step by step. Let's start with your company information.",
        options: [
          "Let's get started!",
          'I need help with compliance',
          'Show me the setup steps',
        ],
      },
      steps: {
        company: {
          message:
            "Great! Let's start with your company information. I'll need some basic details about your Greek business.",
          details:
            "Please provide your company's AFM (Tax Number), name, and address. This is required for ERGANI II integration.",
        },
        employees: {
          message:
            "Perfect! Now let's set up your employees. You can import from Excel or add them manually.",
          details:
            "For each employee, I'll need their AMKA (Social Security Number), AFM, and basic employment details.",
        },
        compliance: {
          message:
            'Time for Greek compliance setup! This is crucial for legal payroll processing.',
          details:
            "I'll help you configure ERGANI II for work cards, e-EFKA for insurance, and AADE for tax reporting.",
        },
        banking: {
          message: "Let's configure your SEPA banking for salary payments.",
          details:
            'Connect your Greek bank account for automated salary transfers. I support all major Greek banks.',
        },
        payroll: {
          message:
            "Now we'll set up your payroll rules and Greek tax settings.",
          details:
            'Configure minimum wage, tax brackets, insurance rates, and collective agreements.',
        },
        first: {
          message:
            "Excellent! You're ready for your first payroll run. I'll guide you through it.",
          details:
            "Let's process a test payroll to make sure everything is configured correctly.",
        },
      },
      quickActions: {
        title: 'Quick Actions',
        importEmployees: 'Import Employees',
        testConnection: 'Test ERGANI Connection',
        viewCompliance: 'View Compliance Status',
        scheduleDemo: 'Schedule Demo',
      },
    },
    el: {
      title: 'Βοηθός Ρύθμισης PayrollSync',
      subtitle: 'Θα σας βοηθήσω να ρυθμίσετε το ελληνικό σύστημα μισθοδοσίας',
      placeholder: 'Γράψτε το μήνυμά σας...',
      send: 'Αποστολή',
      minimize: 'Ελαχιστοποίηση',
      maximize: 'Επέκταση',
      close: 'Κλείσιμο',
      progress: 'Πρόοδος Ρύθμισης',
      completed: 'Ολοκληρώθηκε',
      next: 'Επόμενο',
      skip: 'Παράλειψη',
      getStarted: 'Ας Ξεκινήσουμε',
      help: 'Πώς μπορώ να σας βοηθήσω;',
      typing: 'Ο βοηθός γράφει...',
      welcome: {
        message:
          'Καλώς ήρθατε στο PayrollSync! Είμαι ο βοηθός ρύθμισης. Θα σας βοηθήσω να ρυθμίσετε το ελληνικό σύστημα μισθοδοσίας βήμα προς βήμα. Ας ξεκινήσουμε με τα στοιχεία της εταιρείας σας.',
        options: [
          'Ας ξεκινήσουμε!',
          'Χρειάζομαι βοήθεια με τη συμμόρφωση',
          'Δείξτε μου τα βήματα ρύθμισης',
        ],
      },
      steps: {
        company: {
          message:
            'Υπέροχα! Ας ξεκινήσουμε με τα στοιχεία της εταιρείας σας. Θα χρειαστώ μερικές βασικές πληροφορίες για την ελληνική επιχείρησή σας.',
          details:
            'Παρακαλώ δώστε το ΑΦΜ της εταιρείας σας, την επωνυμία και τη διεύθυνση. Αυτό είναι απαραίτητο για την ενσωμάτωση ΕΡΓΑΝΗ ΙΙ.',
        },
        employees: {
          message:
            'Τέλεια! Τώρα ας ρυθμίσουμε τους υπαλλήλους σας. Μπορείτε να εισάγετε από Excel ή να τους προσθέσετε χειροκίνητα.',
          details:
            'Για κάθε υπάλληλο, θα χρειαστώ το ΑΜΚΑ, το ΑΦΜ και τις βασικές λεπτομέρειες εργασίας.',
        },
        compliance: {
          message:
            'Ώρα για τη ρύθμιση ελληνικής συμμόρφωσης! Αυτό είναι ζωτικό για τη νόμιμη επεξεργασία μισθοδοσίας.',
          details:
            'Θα σας βοηθήσω να ρυθμίσετε την ΕΡΓΑΝΗ ΙΙ για κάρτες εργασίας, το e-ΕΦΚΑ για ασφάλιση και την ΑΑΔΕ για φορολογική αναφορά.',
        },
        banking: {
          message:
            'Ας ρυθμίσουμε την τραπεζική υπηρεσία SEPA για τις πληρωμές μισθών.',
          details:
            'Συνδέστε τον ελληνικό τραπεζικό λογαριασμό σας για αυτοματοποιημένες μεταφορές μισθών. Υποστηρίζω όλες τις μεγάλες ελληνικές τράπεζες.',
        },
        payroll: {
          message:
            'Τώρα θα ρυθμίσουμε τους κανόνες μισθοδοσίας και τις ελληνικές φορολογικές ρυθμίσεις.',
          details:
            'Ρυθμίστε τον κατώτατο μισθό, τις φορολογικές κλίμακες, τα ασφαλιστικά ποσοστά και τις συλλογικές συμβάσεις.',
        },
        first: {
          message:
            'Εξαιρετικά! Είστε έτοιμοι για την πρώτη εκτέλεση μισθοδοσίας. Θα σας καθοδηγήσω.',
          details:
            'Ας επεξεργαστούμε μια δοκιμαστική μισθοδοσία για να βεβαιωθούμε ότι όλα είναι σωστά ρυθμισμένα.',
        },
      },
      quickActions: {
        title: 'Γρήγορες Ενέργειες',
        importEmployees: 'Εισαγωγή Υπαλλήλων',
        testConnection: 'Δοκιμή Σύνδεσης ΕΡΓΑΝΗ',
        viewCompliance: 'Προβολή Κατάστασης Συμμόρφωσης',
        scheduleDemo: 'Προγραμματισμός Επίδειξης',
      },
    },
  };

  const t = translations[locale];

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      type: 'bot',
      content: t.welcome.message,
      timestamp: new Date(),
      options: t.welcome.options.map((option, index) => ({
        id: `welcome-${index}`,
        label: option,
        action: () => handleWelcomeOption(index),
      })),
    };
    setMessages([welcomeMessage]);
  }, [locale]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const simulateTyping = (callback: () => void, delay = 1500) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      callback();
    }, delay);
  };

  const handleWelcomeOption = (index: number) => {
    addMessage({
      type: 'user',
      content: t.welcome.options[index],
    });

    simulateTyping(() => {
      switch (index) {
        case 0: // Get started
          startOnboarding();
          break;
        case 1: // Help with compliance
          showComplianceHelp();
          break;
        case 2: // Show setup steps
          showSetupSteps();
          break;
      }
    });
  };

  const startOnboarding = () => {
    addMessage({
      type: 'bot',
      content: t.steps.company.message,
      options: [
        {
          id: 'setup-company',
          label: 'Set up Company Info',
          labelEl: 'Ρύθμιση Στοιχείων Εταιρείας',
          action: () => handleCompanySetup(),
          variant: 'default',
        },
        {
          id: 'import-data',
          label: 'I have existing data',
          labelEl: 'Έχω υπάρχοντα δεδομένα',
          action: () => handleDataImport(),
          variant: 'outline',
        },
      ],
    });
  };

  const showComplianceHelp = () => {
    addMessage({
      type: 'bot',
      content:
        "I'll help you understand Greek compliance requirements. The main systems you need to integrate with are:",
      component: (
        <div className="space-y-3 mt-3">
          <div className="p-3 border rounded-lg">
            <div className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              ERGANI II
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Digital work cards and employment notifications
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              e-EFKA
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Social security and insurance reporting
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-600" />
              AADE
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Tax authority reporting and compliance
            </div>
          </div>
        </div>
      ),
      options: [
        {
          id: 'setup-compliance',
          label: 'Set up compliance now',
          action: () => handleComplianceSetup(),
        },
        {
          id: 'learn-more',
          label: 'Tell me more',
          action: () => showDetailedCompliance(),
        },
      ],
    });
  };

  const showSetupSteps = () => {
    const completedSteps = onboardingSteps.filter(
      step => step.completed
    ).length;
    const progress = (completedSteps / onboardingSteps.length) * 100;

    addMessage({
      type: 'bot',
      content: `Here's your complete setup roadmap. You've completed ${completedSteps} of ${onboardingSteps.length} steps.`,
      component: (
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="space-y-2">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    step.completed
                      ? 'bg-green-50 border-green-200'
                      : index === currentStep
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      step.completed
                        ? 'text-green-600'
                        : index === currentStep
                          ? 'text-blue-600'
                          : 'text-gray-400'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {locale === 'en' ? step.title : step.titleEl}
                    </div>
                    <div className="text-xs text-gray-600">
                      {locale === 'en' ? step.description : step.descriptionEl}
                    </div>
                  </div>
                  {step.completed && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {step.required && !step.completed && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ),
      options: [
        {
          id: 'continue-setup',
          label: 'Continue Setup',
          action: () => continueFromCurrentStep(),
        },
        {
          id: 'jump-to-step',
          label: 'Jump to Specific Step',
          action: () => showStepSelection(),
        },
      ],
    });
  };

  const handleCompanySetup = () => {
    addMessage({
      type: 'user',
      content: 'Set up Company Info',
    });

    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content: t.steps.company.details,
        component: (
          <div className="mt-4 p-4 border rounded-lg bg-blue-50">
            <div className="font-medium text-sm mb-2">
              Required Information:
            </div>
            <div className="space-y-1 text-sm">
              <div>• Company AFM (Tax Number)</div>
              <div>• Legal Company Name</div>
              <div>• Registered Address</div>
              <div>• Primary Business Activity Code</div>
              <div>• Contact Information</div>
            </div>
          </div>
        ),
        options: [
          {
            id: 'open-company-form',
            label: 'Open Company Setup Form',
            labelEl: 'Άνοιγμα Φόρμας Ρύθμισης Εταιρείας',
            action: () => openCompanyForm(),
            variant: 'default',
          },
          {
            id: 'help-afm',
            label: 'What is AFM?',
            labelEl: 'Τι είναι το ΑΦΜ;',
            action: () => explainAFM(),
            variant: 'outline',
          },
        ],
      });
    });
  };

  const handleDataImport = () => {
    addMessage({
      type: 'user',
      content: 'I have existing data',
    });

    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content:
          'Great! I can help you import existing data from various sources. What type of data do you want to import?',
        options: [
          {
            id: 'import-employees',
            label: 'Employee Data (Excel/CSV)',
            action: () => handleEmployeeImport(),
          },
          {
            id: 'import-payroll',
            label: 'Historical Payroll Data',
            action: () => handlePayrollImport(),
          },
          {
            id: 'import-from-system',
            label: 'From Another Payroll System',
            action: () => handleSystemMigration(),
          },
        ],
      });
    });
  };

  const handleComplianceSetup = () => {
    markStepCompleted('company-setup');
    setCurrentStep(2); // Jump to compliance step

    addMessage({
      type: 'user',
      content: 'Set up compliance now',
    });

    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content: t.steps.compliance.message,
        component: (
          <div className="mt-4 space-y-3">
            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">ERGANI II Integration</div>
                  <div className="text-sm text-gray-600">
                    Connect to government employment system
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">e-EFKA Setup</div>
                  <div className="text-sm text-gray-600">
                    Configure social security reporting
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">AADE Configuration</div>
                  <div className="text-sm text-gray-600">
                    Set up tax authority reporting
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        ),
        options: [
          {
            id: 'test-connections',
            label: 'Test All Connections',
            action: () => testGovernmentConnections(),
          },
          {
            id: 'setup-one-by-one',
            label: 'Set up one by one',
            action: () => setupComplianceStepByStep(),
          },
        ],
      });
    });
  };

  const continueFromCurrentStep = () => {
    const step = onboardingSteps[currentStep];
    if (!step) return;

    addMessage({
      type: 'user',
      content: `Continue with ${step.title}`,
    });

    // Route to appropriate step handler
    switch (step.id) {
      case 'company-setup':
        handleCompanySetup();
        break;
      case 'employees':
        handleEmployeeSetup();
        break;
      case 'compliance':
        handleComplianceSetup();
        break;
      case 'banking':
        handleBankingSetup();
        break;
      case 'payroll-settings':
        handlePayrollSetup();
        break;
      case 'first-payroll':
        handleFirstPayroll();
        break;
    }
  };

  const handleEmployeeSetup = () => {
    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content: t.steps.employees.message,
        options: [
          {
            id: 'add-manually',
            label: 'Add employees manually',
            action: () => openEmployeeForm(),
          },
          {
            id: 'import-excel',
            label: 'Import from Excel',
            action: () => handleEmployeeImport(),
          },
          {
            id: 'download-template',
            label: 'Download Excel template',
            action: () => downloadEmployeeTemplate(),
          },
        ],
      });
    });
  };

  const handleBankingSetup = () => {
    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content: t.steps.banking.message,
        component: (
          <div className="mt-4 space-y-3">
            <div className="text-sm font-medium">Supported Greek Banks:</div>
            <div className="grid grid-cols-2 gap-2">
              {['Alpha Bank', 'Eurobank', 'National Bank', 'Piraeus Bank'].map(
                bank => (
                  <div
                    key={bank}
                    className="p-2 border rounded text-center text-sm"
                  >
                    {bank}
                  </div>
                )
              )}
            </div>
          </div>
        ),
        options: [
          {
            id: 'connect-bank',
            label: 'Connect Bank Account',
            action: () => connectBankAccount(),
          },
          {
            id: 'manual-banking',
            label: 'Set up manually',
            action: () => setupManualBanking(),
          },
        ],
      });
    });
  };

  const handlePayrollSetup = () => {
    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content: t.steps.payroll.message,
        options: [
          {
            id: 'configure-taxes',
            label: 'Configure Tax Settings',
            action: () => configureTaxes(),
          },
          {
            id: 'setup-insurance',
            label: 'Set up Insurance Rates',
            action: () => setupInsurance(),
          },
          {
            id: 'collective-agreements',
            label: 'Apply Collective Agreements',
            action: () => setupCollectiveAgreements(),
          },
        ],
      });
    });
  };

  const handleFirstPayroll = () => {
    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content: t.steps.first.message,
        options: [
          {
            id: 'run-test-payroll',
            label: 'Run Test Payroll',
            action: () => runTestPayroll(),
            variant: 'default',
          },
          {
            id: 'schedule-payroll',
            label: 'Schedule Regular Payroll',
            action: () => schedulePayroll(),
          },
        ],
      });
    });
  };

  // Helper functions for actions
  const markStepCompleted = (stepId: string) => {
    setOnboardingSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  };

  const openCompanyForm = () => {
    addMessage({
      type: 'system',
      content: 'Opening company setup form...',
    });
    // In real implementation, this would open a form or navigate to setup page
  };

  const explainAFM = () => {
    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content:
          "AFM (Αριθμός Φορολογικού Μητρώου) is your Greek Tax Registration Number. It's a 9-digit number that identifies your business to Greek tax authorities. You received it when you registered your company with the tax office.",
        options: [
          {
            id: 'continue-company-setup',
            label: 'Continue with setup',
            action: () => openCompanyForm(),
          },
        ],
      });
    });
  };

  const handleEmployeeImport = () => {
    addMessage({
      type: 'system',
      content: 'Opening employee import wizard...',
    });
  };

  const testGovernmentConnections = () => {
    addMessage({
      type: 'system',
      content: 'Testing connections to ERGANI II, e-EFKA, and AADE...',
    });

    simulateTyping(() => {
      addMessage({
        type: 'bot',
        content:
          "✅ ERGANI II: Connected successfully\n✅ e-EFKA: Connected successfully\n⚠️ AADE: Connection needs configuration\n\nI'll help you configure the AADE connection.",
        options: [
          {
            id: 'fix-aade',
            label: 'Fix AADE Connection',
            action: () => fixAADEConnection(),
          },
          {
            id: 'continue-anyway',
            label: 'Continue anyway',
            action: () => continueSetup(),
          },
        ],
      });
    }, 3000);
  };

  const fixAADEConnection = () => {
    addMessage({
      type: 'system',
      content: 'Opening AADE configuration...',
    });
  };

  const continueSetup = () => {
    markStepCompleted('compliance');
    setCurrentStep(3);
    handleBankingSetup();
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    addMessage({
      type: 'user',
      content: inputMessage,
    });

    const userMessage = inputMessage.toLowerCase();
    setInputMessage('');

    // Simple keyword-based responses
    simulateTyping(() => {
      if (userMessage.includes('help') || userMessage.includes('βοήθεια')) {
        addMessage({
          type: 'bot',
          content:
            "I'm here to help! I can assist you with:\n\n• Company setup and Greek business registration\n• Employee data import and management\n• ERGANI II, e-EFKA, and AADE compliance\n• SEPA banking configuration\n• Payroll rules and Greek tax settings\n• Running your first payroll\n\nWhat would you like help with?",
          options: [
            {
              id: 'company-help',
              label: 'Company setup',
              action: () => handleCompanySetup(),
            },
            {
              id: 'compliance-help',
              label: 'Compliance',
              action: () => showComplianceHelp(),
            },
            {
              id: 'employees-help',
              label: 'Employees',
              action: () => handleEmployeeSetup(),
            },
          ],
        });
      } else if (userMessage.includes('afm') || userMessage.includes('αφμ')) {
        explainAFM();
      } else if (
        userMessage.includes('ergani') ||
        userMessage.includes('εργάνη')
      ) {
        addMessage({
          type: 'bot',
          content:
            "ERGANI II is the Greek electronic system for employment notifications. It's mandatory for all Greek employers to:\n\n• Submit digital work cards for employees\n• Report work schedule changes\n• Notify about overtime work\n• Submit employment start/end notifications\n\nI can help you set up the integration automatically.",
          options: [
            {
              id: 'setup-ergani',
              label: 'Set up ERGANI II',
              action: () => setupERGANI(),
            },
          ],
        });
      } else {
        addMessage({
          type: 'bot',
          content:
            "I understand you're asking about payroll setup. Let me help you with that. Would you like to continue with the guided setup or do you have a specific question?",
          options: [
            {
              id: 'continue-guided',
              label: 'Continue guided setup',
              action: () => continueFromCurrentStep(),
            },
            {
              id: 'ask-question',
              label: 'I have a specific question',
              action: () => askSpecificQuestion(),
            },
          ],
        });
      }
    });
  };

  const setupERGANI = () => {
    addMessage({
      type: 'system',
      content: 'Opening ERGANI II setup wizard...',
    });
  };

  const askSpecificQuestion = () => {
    addMessage({
      type: 'bot',
      content:
        "Sure! I'm here to answer any specific questions about Greek payroll setup. You can ask me about:\n\n• Tax rates and calculations\n• Insurance contributions\n• Employee benefits\n• Compliance requirements\n• Technical setup issues\n\nWhat would you like to know?",
    });
  };

  // Placeholder functions for other actions
  const openEmployeeForm = () =>
    addMessage({ type: 'system', content: 'Opening employee form...' });
  const downloadEmployeeTemplate = () =>
    addMessage({ type: 'system', content: 'Downloading Excel template...' });
  const connectBankAccount = () =>
    addMessage({
      type: 'system',
      content: 'Opening bank connection wizard...',
    });
  const setupManualBanking = () =>
    addMessage({ type: 'system', content: 'Opening manual banking setup...' });
  const configureTaxes = () =>
    addMessage({ type: 'system', content: 'Opening tax configuration...' });
  const setupInsurance = () =>
    addMessage({ type: 'system', content: 'Opening insurance setup...' });
  const setupCollectiveAgreements = () =>
    addMessage({ type: 'system', content: 'Opening collective agreements...' });
  const runTestPayroll = () =>
    addMessage({ type: 'system', content: 'Starting test payroll run...' });
  const schedulePayroll = () =>
    addMessage({ type: 'system', content: 'Opening payroll scheduler...' });
  const handlePayrollImport = () =>
    addMessage({ type: 'system', content: 'Opening payroll data import...' });
  const handleSystemMigration = () =>
    addMessage({
      type: 'system',
      content: 'Opening system migration wizard...',
    });
  const showDetailedCompliance = () =>
    addMessage({ type: 'system', content: 'Opening compliance guide...' });
  const setupComplianceStepByStep = () =>
    addMessage({
      type: 'system',
      content: 'Starting step-by-step compliance setup...',
    });
  const showStepSelection = () =>
    addMessage({ type: 'system', content: 'Opening step selection...' });

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggleMinimize}
          className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[600px] shadow-xl z-50 flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <p className="text-sm text-gray-600">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMinimize}
            className="h-8 w-8 p-0"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{t.progress}</span>
              <span>
                {onboardingSteps.filter(s => s.completed).length}/
                {onboardingSteps.length} {t.completed}
              </span>
            </div>
            <Progress
              value={
                (onboardingSteps.filter(s => s.completed).length /
                  onboardingSteps.length) *
                100
              }
              className="h-1"
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'bot' && (
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3 w-3 text-blue-600" />
                </div>
              )}

              <div
                className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}
              >
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white ml-auto'
                      : message.type === 'system'
                        ? 'bg-gray-100 text-gray-700 italic'
                        : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.content}
                </div>

                {message.component && (
                  <div className="mt-2">{message.component}</div>
                )}

                {message.options && (
                  <div className="mt-2 space-y-2">
                    {message.options.map(option => (
                      <Button
                        key={option.id}
                        variant={option.variant || 'outline'}
                        size="sm"
                        onClick={option.action}
                        className="w-full justify-start text-left"
                      >
                        {locale === 'el' && option.labelEl
                          ? option.labelEl
                          : option.label}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>

              {message.type === 'user' && (
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-blue-600" />
              </div>
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  {t.typing}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 border-t">
          <div className="flex gap-2 mt-3">
            <Input
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder={t.placeholder}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
