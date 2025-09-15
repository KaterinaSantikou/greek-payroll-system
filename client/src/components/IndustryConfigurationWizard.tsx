/**
 * Industry Configuration Wizard
 * Step-by-step setup for industry-specific payroll templates
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Building2,
  Users,
  Clock,
  Euro,
  FileCheck,
  Settings,
  Zap,
} from 'lucide-react';

interface IndustryConfig {
  companyInfo: {
    name: string;
    industry: string;
    size: string;
    locations: number;
  };
  payrollSettings: {
    payPeriod: 'weekly' | 'biweekly' | 'monthly';
    overtimeThreshold: number;
    nightShiftStart: string;
    nightShiftEnd: string;
    enableTipTracking: boolean;
    enableShiftDifferentials: boolean;
  };
  allowances: Array<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    enabled: boolean;
  }>;
  collectiveAgreements: Array<{
    name: string;
    effectiveDate: string;
    enabled: boolean;
  }>;
  complianceSettings: {
    erganiEnabled: boolean;
    efkaEnabled: boolean;
    digitalWorkCard: boolean;
    automaticFilings: boolean;
  };
}

const WIZARD_STEPS = [
  {
    id: 'company',
    title: 'Company Information',
    titleEl: 'Στοιχεία Εταιρείας',
    icon: Building2,
  },
  {
    id: 'payroll',
    title: 'Payroll Settings',
    titleEl: 'Ρυθμίσεις Μισθοδοσίας',
    icon: Euro,
  },
  {
    id: 'allowances',
    title: 'Allowances & Premiums',
    titleEl: 'Επιδόματα & Πρόσθετα',
    icon: Clock,
  },
  {
    id: 'agreements',
    title: 'Collective Agreements',
    titleEl: 'Συλλογικές Συμβάσεις',
    icon: FileCheck,
  },
  {
    id: 'compliance',
    title: 'Greek Compliance',
    titleEl: 'Ελληνική Συμμόρφωση',
    icon: Settings,
  },
  {
    id: 'review',
    title: 'Review & Deploy',
    titleEl: 'Επισκόπηση & Εγκατάσταση',
    icon: Zap,
  },
];

interface IndustryConfigurationWizardProps {
  industryTemplate: any;
  onComplete?: (config: IndustryConfig) => void;
  onBack?: () => void;
  locale?: 'en' | 'el';
}

export default function IndustryConfigurationWizard({
  industryTemplate,
  onComplete,
  onBack,
  locale = 'en',
}: IndustryConfigurationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<IndustryConfig>({
    companyInfo: {
      name: '',
      industry: industryTemplate.name,
      size: '',
      locations: 1,
    },
    payrollSettings: {
      payPeriod: 'monthly',
      overtimeThreshold: 40,
      nightShiftStart: '22:00',
      nightShiftEnd: '06:00',
      enableTipTracking:
        industryTemplate.id === 'hotel-tourism' ||
        industryTemplate.id === 'restaurant-food',
      enableShiftDifferentials: true,
    },
    allowances: industryTemplate.specialAllowances.map((allowance: string) => ({
      name: allowance,
      type: 'percentage' as const,
      value: 25,
      enabled: true,
    })),
    collectiveAgreements: industryTemplate.collectiveAgreements.map(
      (agreement: string) => ({
        name: agreement,
        effectiveDate: new Date().toISOString().split('T')[0],
        enabled: true,
      })
    ),
    complianceSettings: {
      erganiEnabled: true,
      efkaEnabled: true,
      digitalWorkCard: true,
      automaticFilings: true,
    },
  });

  const translations = {
    en: {
      title: 'Configure Your Industry Template',
      subtitle: 'Customize the payroll settings for your business',
      next: 'Next Step',
      previous: 'Previous',
      finish: 'Deploy Configuration',
      skip: 'Skip This Step',
      companyName: 'Company Name',
      companySize: 'Number of Employees',
      locations: 'Number of Locations',
      payPeriod: 'Pay Period',
      overtimeThreshold: 'Overtime Threshold (hours)',
      nightShiftStart: 'Night Shift Start Time',
      nightShiftEnd: 'Night Shift End Time',
      enableTipTracking: 'Enable Tip Tracking',
      enableShiftDifferentials: 'Enable Shift Differentials',
      allowanceName: 'Allowance Name',
      allowanceValue: 'Value',
      allowanceType: 'Type',
      effectiveDate: 'Effective Date',
      enabled: 'Enabled',
      erganiIntegration: 'ERGANI II Integration',
      efkaIntegration: 'e-EFKA Integration',
      digitalWorkCard: 'Digital Work Card',
      automaticFilings: 'Automatic Government Filings',
      configurationSummary: 'Configuration Summary',
      deploymentReady:
        'Your industry-specific payroll system is ready to deploy',
      estimatedSetupTime: 'Estimated Setup Time',
      includedFeatures: 'Included Features',
    },
    el: {
      title: 'Διαμόρφωση Προτύπου Κλάδου',
      subtitle: 'Προσαρμόστε τις ρυθμίσεις μισθοδοσίας για την επιχείρησή σας',
      next: 'Επόμενο Βήμα',
      previous: 'Προηγούμενο',
      finish: 'Εγκατάσταση Διαμόρφωσης',
      skip: 'Παράλειψη Βήματος',
      companyName: 'Όνομα Εταιρείας',
      companySize: 'Αριθμός Υπαλλήλων',
      locations: 'Αριθμός Τοποθεσιών',
      payPeriod: 'Περίοδος Μισθοδοσίας',
      overtimeThreshold: 'Όριο Υπερωριών (ώρες)',
      nightShiftStart: 'Έναρξη Νυχτερινής Βάρδιας',
      nightShiftEnd: 'Λήξη Νυχτερινής Βάρδιας',
      enableTipTracking: 'Ενεργοποίηση Παρακολούθησης Φιλοδωρημάτων',
      enableShiftDifferentials: 'Ενεργοποίηση Διαφορών Βάρδιας',
      allowanceName: 'Όνομα Επιδόματος',
      allowanceValue: 'Αξία',
      allowanceType: 'Τύπος',
      effectiveDate: 'Ημερομηνία Ισχύος',
      enabled: 'Ενεργοποιημένο',
      erganiIntegration: 'Ενσωμάτωση ΕΡΓΑΝΗ ΙΙ',
      efkaIntegration: 'Ενσωμάτωση e-ΕΦΚΑ',
      digitalWorkCard: 'Ψηφιακή Κάρτα Εργασίας',
      automaticFilings: 'Αυτόματες Κυβερνητικές Υποβολές',
      configurationSummary: 'Περίληψη Διαμόρφωσης',
      deploymentReady:
        'Το εξειδικευμένο σύστημα μισθοδοσίας σας είναι έτοιμο για εγκατάσταση',
      estimatedSetupTime: 'Εκτιμώμενος Χρόνος Εγκατάστασης',
      includedFeatures: 'Συμπεριλαμβανόμενα Χαρακτηριστικά',
    },
  };

  const t = translations[locale];

  const updateConfig = (section: keyof IndustryConfig, updates: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.(config);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack?.();
    }
  };

  const renderStepContent = () => {
    const step = WIZARD_STEPS[currentStep];

    switch (step.id) {
      case 'company':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="companyName">{t.companyName}</Label>
              <Input
                id="companyName"
                value={config.companyInfo.name}
                onChange={e =>
                  updateConfig('companyInfo', { name: e.target.value })
                }
                placeholder="Santikos Princess Hotel"
              />
            </div>
            <div>
              <Label htmlFor="companySize">{t.companySize}</Label>
              <Input
                id="companySize"
                value={config.companyInfo.size}
                onChange={e =>
                  updateConfig('companyInfo', { size: e.target.value })
                }
                placeholder="25"
              />
            </div>
            <div>
              <Label htmlFor="locations">{t.locations}</Label>
              <Input
                id="locations"
                type="number"
                value={config.companyInfo.locations}
                onChange={e =>
                  updateConfig('companyInfo', {
                    locations: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>
        );

      case 'payroll':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="payPeriod">{t.payPeriod}</Label>
              <select
                id="payPeriod"
                value={config.payrollSettings.payPeriod}
                onChange={e =>
                  updateConfig('payrollSettings', { payPeriod: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <Label htmlFor="overtime">{t.overtimeThreshold}</Label>
              <Input
                id="overtime"
                type="number"
                value={config.payrollSettings.overtimeThreshold}
                onChange={e =>
                  updateConfig('payrollSettings', {
                    overtimeThreshold: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nightStart">{t.nightShiftStart}</Label>
                <Input
                  id="nightStart"
                  type="time"
                  value={config.payrollSettings.nightShiftStart}
                  onChange={e =>
                    updateConfig('payrollSettings', {
                      nightShiftStart: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="nightEnd">{t.nightShiftEnd}</Label>
                <Input
                  id="nightEnd"
                  type="time"
                  value={config.payrollSettings.nightShiftEnd}
                  onChange={e =>
                    updateConfig('payrollSettings', {
                      nightShiftEnd: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t.enableTipTracking}</Label>
                <Switch
                  checked={config.payrollSettings.enableTipTracking}
                  onCheckedChange={checked =>
                    updateConfig('payrollSettings', {
                      enableTipTracking: checked,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t.enableShiftDifferentials}</Label>
                <Switch
                  checked={config.payrollSettings.enableShiftDifferentials}
                  onCheckedChange={checked =>
                    updateConfig('payrollSettings', {
                      enableShiftDifferentials: checked,
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'allowances':
        return (
          <div className="space-y-4">
            {config.allowances.map((allowance, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">{allowance.name}</h4>
                    <Switch
                      checked={allowance.enabled}
                      onCheckedChange={checked => {
                        const newAllowances = [...config.allowances];
                        newAllowances[index].enabled = checked;
                        setConfig(prev => ({
                          ...prev,
                          allowances: newAllowances,
                        }));
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t.allowanceType}</Label>
                      <select
                        value={allowance.type}
                        onChange={e => {
                          const newAllowances = [...config.allowances];
                          newAllowances[index].type = e.target.value as
                            | 'percentage'
                            | 'fixed';
                          setConfig(prev => ({
                            ...prev,
                            allowances: newAllowances,
                          }));
                        }}
                        className="w-full p-2 border rounded"
                        disabled={!allowance.enabled}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (€)</option>
                      </select>
                    </div>
                    <div>
                      <Label>{t.allowanceValue}</Label>
                      <Input
                        type="number"
                        value={allowance.value}
                        onChange={e => {
                          const newAllowances = [...config.allowances];
                          newAllowances[index].value = parseFloat(
                            e.target.value
                          );
                          setConfig(prev => ({
                            ...prev,
                            allowances: newAllowances,
                          }));
                        }}
                        disabled={!allowance.enabled}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'agreements':
        return (
          <div className="space-y-4">
            {config.collectiveAgreements.map((agreement, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">{agreement.name}</h4>
                    <Switch
                      checked={agreement.enabled}
                      onCheckedChange={checked => {
                        const newAgreements = [...config.collectiveAgreements];
                        newAgreements[index].enabled = checked;
                        setConfig(prev => ({
                          ...prev,
                          collectiveAgreements: newAgreements,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>{t.effectiveDate}</Label>
                    <Input
                      type="date"
                      value={agreement.effectiveDate}
                      onChange={e => {
                        const newAgreements = [...config.collectiveAgreements];
                        newAgreements[index].effectiveDate = e.target.value;
                        setConfig(prev => ({
                          ...prev,
                          collectiveAgreements: newAgreements,
                        }));
                      }}
                      disabled={!agreement.enabled}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'compliance':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.erganiIntegration}</Label>
                <p className="text-sm text-gray-600">
                  Automatic ERGANI II submissions
                </p>
              </div>
              <Switch
                checked={config.complianceSettings.erganiEnabled}
                onCheckedChange={checked =>
                  updateConfig('complianceSettings', { erganiEnabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.efkaIntegration}</Label>
                <p className="text-sm text-gray-600">
                  e-EFKA contribution calculations
                </p>
              </div>
              <Switch
                checked={config.complianceSettings.efkaEnabled}
                onCheckedChange={checked =>
                  updateConfig('complianceSettings', { efkaEnabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.digitalWorkCard}</Label>
                <p className="text-sm text-gray-600">
                  Digital work card integration
                </p>
              </div>
              <Switch
                checked={config.complianceSettings.digitalWorkCard}
                onCheckedChange={checked =>
                  updateConfig('complianceSettings', {
                    digitalWorkCard: checked,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t.automaticFilings}</Label>
                <p className="text-sm text-gray-600">
                  Automatic government filings
                </p>
              </div>
              <Switch
                checked={config.complianceSettings.automaticFilings}
                onCheckedChange={checked =>
                  updateConfig('complianceSettings', {
                    automaticFilings: checked,
                  })
                }
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.configurationSummary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">Company Information</h4>
                  <p>
                    {config.companyInfo.name} - {config.companyInfo.size}{' '}
                    employees
                  </p>
                  <p>{config.companyInfo.locations} location(s)</p>
                </div>
                <div>
                  <h4 className="font-semibold">Payroll Settings</h4>
                  <p>Pay Period: {config.payrollSettings.payPeriod}</p>
                  <p>
                    Overtime: {config.payrollSettings.overtimeThreshold} hours
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold">{t.includedFeatures}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(locale === 'en'
                      ? industryTemplate.features
                      : industryTemplate.featuresEl
                    ).map((feature: string, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">
                {t.deploymentReady}
              </h4>
              <p className="text-green-700 text-sm">
                {t.estimatedSetupTime}: {industryTemplate.setupTime}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <Button variant="ghost" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600">
              {locale === 'en'
                ? industryTemplate.name
                : industryTemplate.nameEl}{' '}
              • {t.subtitle}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentStep + 1) / WIZARD_STEPS.length) * 100)}%
              Complete
            </span>
          </div>
          <Progress value={((currentStep + 1) / WIZARD_STEPS.length) * 100} />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between mt-6">
          {WIZARD_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={`flex flex-col items-center gap-2 ${
                  isActive
                    ? 'text-blue-600'
                    : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-400'
                }`}
              >
                <div
                  className={`p-2 rounded-full border-2 ${
                    isActive
                      ? 'border-blue-600 bg-blue-50'
                      : isCompleted
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span className="text-xs text-center font-medium">
                  {locale === 'en' ? step.title : step.titleEl}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {React.createElement(WIZARD_STEPS[currentStep].icon, {
              className: 'h-5 w-5',
            })}
            {locale === 'en'
              ? WIZARD_STEPS[currentStep].title
              : WIZARD_STEPS[currentStep].titleEl}
          </CardTitle>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Back to Templates' : t.previous}
        </Button>

        <div className="flex gap-3">
          {currentStep < WIZARD_STEPS.length - 1 && (
            <Button variant="ghost">{t.skip}</Button>
          )}
          <Button onClick={handleNext}>
            {currentStep === WIZARD_STEPS.length - 1 ? t.finish : t.next}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
