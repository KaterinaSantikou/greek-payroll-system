/**
 * Industry Template Selector
 * Choose from Greek industry-specific payroll templates
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Hotel,
  UtensilsCrossed,
  Factory,
  ShoppingBag,
  HardHat,
  Wheat,
  Ship,
  Heart,
  Building2,
  Users,
  Clock,
  Euro,
  FileCheck,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

interface IndustryTemplate {
  id: string;
  name: string;
  nameEl: string;
  icon: React.ComponentType<any>;
  description: string;
  descriptionEl: string;
  employees: string;
  complexity: 'Simple' | 'Medium' | 'Complex';
  setupTime: string;
  features: string[];
  featuresEl: string[];
  collectiveAgreements: string[];
  specialAllowances: string[];
  complianceRequirements: string[];
  popularityScore: number;
  color: string;
}

const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'hotel-tourism',
    name: 'Hotel & Tourism',
    nameEl: 'Ξενοδοχεία & Τουρισμός',
    icon: Hotel,
    description:
      'Complete solution for hotels, resorts, and tourism businesses',
    descriptionEl:
      'Πλήρης λύση για ξενοδοχεία, θέρετρα και επιχειρήσεις τουρισμού',
    employees: '25-500+',
    complexity: 'Complex',
    setupTime: '2-3 days',
    features: [
      'Seasonal worker management',
      'Tip pooling & distribution',
      'Multi-property support',
      'Split shift tracking',
      'Night audit premiums',
      'Tourist season rates',
    ],
    featuresEl: [
      'Διαχείριση εποχιακών εργαζομένων',
      'Διανομή φιλοδωρημάτων',
      'Υποστήριξη πολλαπλών ακινήτων',
      'Παρακολούθηση διαιρεμένων βαρδιών',
      'Επιδόματα νυχτερινού ελέγχου',
      'Τιμές τουριστικής περιόδου',
    ],
    collectiveAgreements: [
      'ΓΣΕΕ - Ξενοδοχοϋπάλληλοι',
      'ΠΝΟ - Τουριστικές Επιχειρήσεις',
    ],
    specialAllowances: [
      'Night Premium (25%)',
      'Sunday Premium (75%)',
      'Holiday Premium (100%)',
      'Tip Distribution',
    ],
    complianceRequirements: [
      'ΕΡΓΑΝΗ ΙΙ - Tourism',
      'Digital Work Card',
      'Seasonal Employment Forms',
    ],
    popularityScore: 95,
    color: 'bg-blue-500',
  },
  {
    id: 'restaurant-food',
    name: 'Restaurant & Food Service',
    nameEl: 'Εστιατόρια & Υπηρεσίες Φαγητού',
    icon: UtensilsCrossed,
    description: 'Specialized for restaurants, cafes, and food service chains',
    descriptionEl: 'Εξειδικευμένη για εστιατόρια, καφέ και αλυσίδες φαγητού',
    employees: '5-200',
    complexity: 'Medium',
    setupTime: '1-2 days',
    features: [
      'Tip tracking & reporting',
      'Kitchen vs service staff rates',
      'Multiple location support',
      'Peak hour premiums',
      'Food handler certifications',
      'Inventory bonus tracking',
    ],
    featuresEl: [
      'Παρακολούθηση φιλοδωρημάτων',
      'Διαφορετικές τιμές κουζίνας/σέρβις',
      'Υποστήριξη πολλών τοποθεσιών',
      'Επιδόματα ώρας αιχμής',
      'Πιστοποιήσεις χειρισμού τροφίμων',
      'Παρακολούθηση μπόνους αποθήκης',
    ],
    collectiveAgreements: ['ΓΣΕΕ - Εστιατόρια', 'ΕΚΠΟΙΖΩ - Ζαχαροπλαστεία'],
    specialAllowances: [
      'Service Premium (15%)',
      'Kitchen Premium (20%)',
      'Late Night (30%)',
      'Tip Share',
    ],
    complianceRequirements: [
      'Health Permits',
      'Food Safety Compliance',
      'Municipal Licenses',
    ],
    popularityScore: 88,
    color: 'bg-orange-500',
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing & Industry',
    nameEl: 'Βιομηχανία & Παραγωγή',
    icon: Factory,
    description: 'Heavy industry, factories, and manufacturing facilities',
    descriptionEl: 'Βαριά βιομηχανία, εργοστάσια και παραγωγικές εγκαταστάσεις',
    employees: '50-1000+',
    complexity: 'Complex',
    setupTime: '3-5 days',
    features: [
      'Hazardous duty pay',
      'Shift differentials',
      'Overtime calculations',
      'Safety compliance tracking',
      'Union contract management',
      'Production bonus systems',
    ],
    featuresEl: [
      'Αμοιβή επικίνδυνης εργασίας',
      'Διαφορές βάρδιας',
      'Υπολογισμοί υπερωριών',
      'Παρακολούθηση ασφάλειας',
      'Διαχείριση συνδικαλιστικών συμβάσεων',
      'Συστήματα μπόνους παραγωγής',
    ],
    collectiveAgreements: [
      'ΓΣΕΕ - Μεταλλεργάτες',
      'ΟΤΟΕ - Βιομήχανος',
      'ΓΣΕΕ - Χημικοί',
    ],
    specialAllowances: [
      'Heavy Work (40%)',
      'Hazard Pay (50%)',
      'Night Shift (25%)',
      'Overtime (125%)',
    ],
    complianceRequirements: [
      'Industrial Safety',
      'Environmental Compliance',
      'Union Agreements',
    ],
    popularityScore: 82,
    color: 'bg-gray-600',
  },
  {
    id: 'retail',
    name: 'Retail & Services',
    nameEl: 'Λιανικό Εμπόριο & Υπηρεσίες',
    icon: ShoppingBag,
    description: 'Retail stores, shopping centers, and service businesses',
    descriptionEl: 'Καταστήματα, εμπορικά κέντρα και επιχειρήσεις υπηρεσιών',
    employees: '3-100',
    complexity: 'Simple',
    setupTime: '4-8 hours',
    features: [
      'Part-time scheduling',
      'Commission tracking',
      'Multiple store management',
      'Seasonal adjustments',
      'Customer service bonuses',
      'Flexible hour tracking',
    ],
    featuresEl: [
      'Προγραμματισμός μερικής απασχόλησης',
      'Παρακολούθηση προμήθειας',
      'Διαχείριση πολλών καταστημάτων',
      'Εποχιακές προσαρμογές',
      'Μπόνους εξυπηρέτησης πελατών',
      'Ευέλικτη παρακολούθηση ωρών',
    ],
    collectiveAgreements: ['ΓΣΕΕ - Εμπόριο', 'ΕΣΕΕ - Επαγγελματίες'],
    specialAllowances: [
      'Sales Commission (2-5%)',
      'Sunday Premium (75%)',
      'Evening Premium (10%)',
    ],
    complianceRequirements: [
      'Commercial Licenses',
      'Tax Compliance',
      'Employment Permits',
    ],
    popularityScore: 75,
    color: 'bg-green-500',
  },
  {
    id: 'construction',
    name: 'Construction & Building',
    nameEl: 'Κατασκευές & Οικοδομή',
    icon: HardHat,
    description: 'Construction companies, contractors, and building projects',
    descriptionEl: 'Κατασκευαστικές εταιρείες, εργολάβοι και οικοδομικά έργα',
    employees: '10-300',
    complexity: 'Complex',
    setupTime: '2-4 days',
    features: [
      'Project-based payroll',
      'Weather day tracking',
      'Safety premium calculations',
      'Equipment operator rates',
      'Prevailing wage compliance',
      'Union benefit tracking',
    ],
    featuresEl: [
      'Μισθοδοσία βάσει έργων',
      'Παρακολούθηση καιρικών ημερών',
      'Υπολογισμοί επιδόματος ασφαλείας',
      'Τιμές χειριστών εξοπλισμού',
      'Συμμόρφωση κρατούντων μισθών',
      'Παρακολούθηση συνδικαλιστικών παροχών',
    ],
    collectiveAgreements: [
      'ΓΣΕΕ - Οικοδόμοι',
      'ΟΤΟΕ - Τεχνίτες',
      'ΓΣΕΕ - Μηχανικοί',
    ],
    specialAllowances: [
      'Height Work (30%)',
      'Hazardous Conditions (45%)',
      'Overtime (150%)',
      'Weather Premium',
    ],
    complianceRequirements: [
      'Construction Safety',
      'Building Permits',
      'Worker Certification',
    ],
    popularityScore: 79,
    color: 'bg-yellow-600',
  },
  {
    id: 'healthcare',
    name: 'Healthcare & Medical',
    nameEl: 'Υγειονομική Περίθαλψη',
    icon: Heart,
    description: 'Hospitals, clinics, and medical facilities',
    descriptionEl: 'Νοσοκομεία, κλινικές και ιατρικές εγκαταστάσεις',
    employees: '20-500+',
    complexity: 'Complex',
    setupTime: '3-4 days',
    features: [
      'Medical specialty rates',
      'On-call duty tracking',
      'Continuing education credits',
      'Night shift differentials',
      'Emergency response bonuses',
      'Medical license tracking',
    ],
    featuresEl: [
      'Τιμές ιατρικών ειδικοτήτων',
      'Παρακολούθηση εφημερίας',
      'Πιστώσεις συνεχιζόμενης εκπαίδευσης',
      'Διαφορές νυχτερινής βάρδιας',
      'Μπόνους επείγουσας ανταπόκρισης',
      'Παρακολούθηση ιατρικής άδειας',
    ],
    collectiveAgreements: ['ΟΕΝΓΕ - Νοσοκομειακοί', 'ΠΟΕΔΗΝ - Υγειονομικοί'],
    specialAllowances: [
      'Medical Premium (35%)',
      'Night Duty (40%)',
      'Emergency Call (100%)',
      'Specialist Rate',
    ],
    complianceRequirements: [
      'Medical Licenses',
      'Patient Privacy (GDPR)',
      'Health Ministry Compliance',
    ],
    popularityScore: 86,
    color: 'bg-red-500',
  },
];

interface IndustryTemplateSelectorProps {
  onSelectTemplate?: (template: IndustryTemplate) => void;
  locale?: 'en' | 'el';
}

export default function IndustryTemplateSelector({
  onSelectTemplate,
  locale = 'en',
}: IndustryTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'comparison'>('grid');

  const translations = {
    en: {
      title: 'Choose Your Industry Template',
      subtitle: 'Select a pre-configured payroll solution for your industry',
      popular: 'Most Popular',
      employees: 'Employees',
      setup: 'Setup Time',
      features: 'Key Features',
      agreements: 'Collective Agreements',
      allowances: 'Special Allowances',
      compliance: 'Compliance Requirements',
      selectTemplate: 'Select Template',
      compareView: 'Compare Templates',
      gridView: 'Grid View',
      customizeSetup: 'Customize & Setup',
      popularity: 'Popularity',
    },
    el: {
      title: 'Επιλέξτε Πρότυπο Κλάδου',
      subtitle: 'Επιλέξτε προ-διαμορφωμένη λύση μισθοδοσίας για τον κλάδο σας',
      popular: 'Πιο Δημοφιλή',
      employees: 'Υπάλληλοι',
      setup: 'Χρόνος Εγκατάστασης',
      features: 'Βασικά Χαρακτηριστικά',
      agreements: 'Συλλογικές Συμβάσεις',
      allowances: 'Ειδικά Επιδόματα',
      compliance: 'Απαιτήσεις Συμμόρφωσης',
      selectTemplate: 'Επιλογή Προτύπου',
      compareView: 'Σύγκριση Προτύπων',
      gridView: 'Προβολή Πλέγματος',
      customizeSetup: 'Προσαρμογή & Εγκατάσταση',
      popularity: 'Δημοτικότητα',
    },
  };

  const t = translations[locale];

  const handleSelectTemplate = (template: IndustryTemplate) => {
    setSelectedTemplate(template.id);
    onSelectTemplate?.(template);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simple':
        return 'bg-green-100 text-green-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Complex':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (view === 'comparison') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-2">{t.subtitle}</p>
          </div>
          <Button variant="outline" onClick={() => setView('grid')}>
            {t.gridView}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-3 text-left">
                  Industry
                </th>
                <th className="border border-gray-200 p-3 text-left">
                  {t.employees}
                </th>
                <th className="border border-gray-200 p-3 text-left">
                  Complexity
                </th>
                <th className="border border-gray-200 p-3 text-left">
                  {t.setup}
                </th>
                <th className="border border-gray-200 p-3 text-left">
                  {t.popularity}
                </th>
                <th className="border border-gray-200 p-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {INDUSTRY_TEMPLATES.map(template => {
                const Icon = template.icon;
                return (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${template.color} text-white`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {locale === 'en' ? template.name : template.nameEl}
                          </div>
                          <div className="text-sm text-gray-600">
                            {locale === 'en'
                              ? template.description
                              : template.descriptionEl}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-200 p-3">
                      {template.employees}
                    </td>
                    <td className="border border-gray-200 p-3">
                      <Badge
                        className={getComplexityColor(template.complexity)}
                      >
                        {template.complexity}
                      </Badge>
                    </td>
                    <td className="border border-gray-200 p-3">
                      {template.setupTime}
                    </td>
                    <td className="border border-gray-200 p-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={template.popularityScore}
                          className="w-20 h-2"
                        />
                        <span className="text-sm">
                          {template.popularityScore}%
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-200 p-3">
                      <Button
                        size="sm"
                        onClick={() => handleSelectTemplate(template)}
                        className={
                          selectedTemplate === template.id ? 'bg-green-600' : ''
                        }
                      >
                        {selectedTemplate === template.id ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          t.selectTemplate
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-600 mt-2">{t.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => setView('comparison')}>
          {t.compareView}
        </Button>
      </div>

      {/* Popular Templates Badge */}
      <div className="mb-6">
        <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
          {t.popular}:{' '}
          {INDUSTRY_TEMPLATES.slice(0, 3)
            .map(t => (locale === 'en' ? t.name : t.nameEl))
            .join(', ')}
        </Badge>
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {INDUSTRY_TEMPLATES.map(template => {
          const Icon = template.icon;
          const isSelected = selectedTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-blue-500 shadow-lg scale-105'
                  : 'hover:shadow-lg hover:scale-102'
              }`}
              onClick={() => handleSelectTemplate(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-lg ${template.color} text-white`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {locale === 'en' ? template.name : template.nameEl}
                      </CardTitle>
                      <Badge
                        className={getComplexityColor(template.complexity)}
                      >
                        {template.complexity}
                      </Badge>
                    </div>
                  </div>
                  {template.popularityScore > 85 && (
                    <Badge className="bg-orange-100 text-orange-800">
                      {t.popular}
                    </Badge>
                  )}
                </div>
                <p className="text-gray-600 text-sm mt-2">
                  {locale === 'en'
                    ? template.description
                    : template.descriptionEl}
                </p>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Quick Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{template.employees}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{template.setupTime}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {t.features}
                    </h4>
                    <div className="space-y-1">
                      {(locale === 'en'
                        ? template.features
                        : template.featuresEl
                      )
                        .slice(0, 3)
                        .map((feature, index) => (
                          <div
                            key={index}
                            className="text-xs text-gray-600 flex items-center gap-2"
                          >
                            <div className="w-1 h-1 bg-blue-500 rounded-full" />
                            {feature}
                          </div>
                        ))}
                      {template.features.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{template.features.length - 3} more features
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collective Agreements */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                      <FileCheck className="h-4 w-4" />
                      {t.agreements}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {template.collectiveAgreements
                        .slice(0, 2)
                        .map((agreement, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {agreement}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  {/* Special Allowances */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      {t.allowances}
                    </h4>
                    <div className="space-y-1">
                      {template.specialAllowances
                        .slice(0, 2)
                        .map((allowance, index) => (
                          <div key={index} className="text-xs text-gray-600">
                            • {allowance}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Popularity Score */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.popularity}</span>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={template.popularityScore}
                        className="w-20 h-2"
                      />
                      <span className="text-sm">
                        {template.popularityScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Template Actions */}
      {selectedTemplate && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {locale === 'en'
                      ? INDUSTRY_TEMPLATES.find(t => t.id === selectedTemplate)
                          ?.name
                      : INDUSTRY_TEMPLATES.find(t => t.id === selectedTemplate)
                          ?.nameEl}{' '}
                    Template Selected
                  </h3>
                  <p className="text-sm text-blue-700">
                    Ready to customize and deploy your industry-specific payroll
                    solution
                  </p>
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                {t.customizeSetup}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
