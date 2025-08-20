/**
 * Industry Templates Page
 * Main page for industry-specific payroll template selection and configuration
 */

import React, { useState } from 'react';
import IndustryTemplateSelector from '@/components/IndustryTemplateSelector';
import IndustryConfigurationWizard from '@/components/IndustryConfigurationWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Factory,
  Hotel,
  UtensilsCrossed,
  ShoppingBag,
  HardHat,
  Heart,
  CheckCircle,
  Zap,
  Users,
  Globe
} from 'lucide-react';

type ViewState = 'selector' | 'configuration' | 'success';

export default function IndustryTemplates() {
  const [view, setView] = useState<ViewState>('selector');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [locale, setLocale] = useState<'en' | 'el'>('en');

  const translations = {
    en: {
      title: 'Industry-Specific Payroll Templates',
      subtitle: 'Pre-configured solutions for Greek businesses',
      benefits: {
        title: 'Why Choose Industry Templates?',
        items: [
          'Pre-configured for Greek labor laws',
          'Industry-specific allowances included',
          'Collective agreement integration',
          'Compliance requirements built-in',
          'Faster setup (hours vs weeks)',
          'Proven templates used by 1000+ companies'
        ]
      },
      industries: {
        title: 'Supported Industries',
        subtitle: 'Specialized templates for Greece\'s key sectors'
      },
      success: {
        title: 'Industry Template Deployed Successfully!',
        subtitle: 'Your Greek payroll system is ready to use',
        nextSteps: [
          'Import employee data',
          'Configure first payroll run',
          'Test ERGANI II integration',
          'Train your team'
        ],
        startUsing: 'Start Using PayrollSync',
        documentation: 'View Documentation'
      }
    },
    el: {
      title: 'Εξειδικευμένα Πρότυπα Κλάδου',
      subtitle: 'Προ-διαμορφωμένες λύσεις για ελληνικές επιχειρήσεις',
      benefits: {
        title: 'Γιατί να Επιλέξετε Πρότυπα Κλάδου;',
        items: [
          'Προ-διαμορφωμένα για ελληνικούς εργατικούς νόμους',
          'Συμπεριλαμβάνονται επιδόματα κλάδου',
          'Ενσωμάτωση συλλογικών συμβάσεων',
          'Ενσωματωμένες απαιτήσεις συμμόρφωσης',
          'Ταχύτερη εγκατάσταση (ώρες αντί εβδομάδων)',
          'Δοκιμασμένα πρότυπα από 1000+ εταιρείες'
        ]
      },
      industries: {
        title: 'Υποστηριζόμενοι Κλάδοι',
        subtitle: 'Εξειδικευμένα πρότυπα για βασικούς τομείς της Ελλάδας'
      },
      success: {
        title: 'Πρότυπο Κλάδου Εγκαταστάθηκε Επιτυχώς!',
        subtitle: 'Το ελληνικό σύστημα μισθοδοσίας σας είναι έτοιμο',
        nextSteps: [
          'Εισαγωγή δεδομένων υπαλλήλων',
          'Διαμόρφωση πρώτης μισθοδοσίας',
          'Δοκιμή ενσωμάτωσης ΕΡΓΑΝΗ ΙΙ',
          'Εκπαίδευση ομάδας σας'
        ],
        startUsing: 'Ξεκινήστε το PayrollSync',
        documentation: 'Δείτε Τεκμηρίωση'
      }
    }
  };

  const t = translations[locale];

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setView('configuration');
  };

  const handleConfigurationComplete = (config: any) => {
    console.log('Industry configuration completed:', config);
    setView('success');
  };

  const handleBackToSelector = () => {
    setView('selector');
    setSelectedTemplate(null);
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.success.title}</h1>
            <p className="text-gray-600">{t.success.subtitle}</p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                {selectedTemplate && React.createElement(selectedTemplate.icon, { 
                  className: `h-8 w-8 text-white p-1.5 rounded ${selectedTemplate.color}` 
                })}
                <div className="text-left">
                  <h3 className="font-semibold text-lg">
                    {locale === 'en' ? selectedTemplate?.name : selectedTemplate?.nameEl}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Ready for {selectedTemplate?.employees} employees
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-left">Next Steps:</h4>
                <div className="grid grid-cols-1 gap-3">
                  {t.success.nextSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3 text-left">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                      </div>
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button size="lg" className="px-8">
              <Zap className="h-4 w-4 mr-2" />
              {t.success.startUsing}
            </Button>
            <Button variant="outline" size="lg">
              {t.success.documentation}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'configuration') {
    return (
      <IndustryConfigurationWizard
        industryTemplate={selectedTemplate}
        onComplete={handleConfigurationComplete}
        onBack={handleBackToSelector}
        locale={locale}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-xl text-gray-600 mt-2">{t.subtitle}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}
            >
              <Globe className="h-4 w-4 mr-2" />
              {locale === 'en' ? 'EL' : 'EN'}
            </Button>
          </div>

          {/* Benefits */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">{t.benefits.title}</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {t.benefits.items.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Industry Icons */}
          <div className="text-center mb-8">
            <h3 className="text-lg font-semibold mb-4">{t.industries.title}</h3>
            <p className="text-gray-600 mb-6">{t.industries.subtitle}</p>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <Hotel className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs">Hotels</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                  <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-xs">Restaurants</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                  <Factory className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-xs">Manufacturing</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <ShoppingBag className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-xs">Retail</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                  <HardHat className="h-6 w-6 text-yellow-600" />
                </div>
                <span className="text-xs">Construction</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                  <Heart className="h-6 w-6 text-red-600" />
                </div>
                <span className="text-xs">Healthcare</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Selector */}
      <IndustryTemplateSelector 
        onSelectTemplate={handleTemplateSelect}
        locale={locale}
      />
    </div>
  );
}