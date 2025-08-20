/**
 * Integration Marketplace
 * Central hub for discovering, installing, and managing business integrations
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Star,
  Download,
  CheckCircle,
  ExternalLink,
  Filter,
  TrendingUp,
  Users,
  Zap,
  Building2,
  CreditCard,
  FileText,
  MessageSquare,
  Calendar,
  BarChart,
  Shield,
  Clock,
  Euro,
  Globe,
  Settings,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  category: string;
  categoryEl: string;
  developer: string;
  icon: React.ComponentType<any>;
  rating: number;
  reviews: number;
  installations: number;
  price: 'free' | 'paid' | 'freemium';
  priceAmount?: string;
  tags: string[];
  tagsEl: string[];
  features: string[];
  featuresEl: string[];
  isInstalled: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  isGreekSpecific: boolean;
  lastUpdated: string;
  supportedCountries: string[];
  integrationComplexity: 'simple' | 'medium' | 'complex';
  setupTime: string;
  businessImpact: 'low' | 'medium' | 'high';
  networkEffect: number; // 0-100 score
}

const INTEGRATION_CATEGORIES = [
  { id: 'all', name: 'All Categories', nameEl: 'Όλες οι Κατηγορίες', icon: Grid3X3 },
  { id: 'government', name: 'Government & Compliance', nameEl: 'Κυβέρνηση & Συμμόρφωση', icon: Shield },
  { id: 'banking', name: 'Banking & Finance', nameEl: 'Τραπεζικά & Χρηματοοικονομικά', icon: CreditCard },
  { id: 'accounting', name: 'Accounting & ERP', nameEl: 'Λογιστική & ERP', icon: FileText },
  { id: 'hr', name: 'HR & Workforce', nameEl: 'Ανθρώπινο Δυναμικό', icon: Users },
  { id: 'time', name: 'Time & Attendance', nameEl: 'Χρόνος & Παρουσίες', icon: Clock },
  { id: 'communication', name: 'Communication', nameEl: 'Επικοινωνία', icon: MessageSquare },
  { id: 'analytics', name: 'Analytics & BI', nameEl: 'Αναλυτικά & BI', icon: BarChart },
  { id: 'productivity', name: 'Productivity', nameEl: 'Παραγωγικότητα', icon: Zap }
];

const INTEGRATIONS: Integration[] = [
  // Greek Government Integrations
  {
    id: 'ergani-ii',
    name: 'ERGANI II',
    nameEl: 'ΕΡΓΑΝΗ ΙΙ',
    description: 'Official Greek employment system integration',
    descriptionEl: 'Επίσημη ενσωμάτωση ελληνικού συστήματος απασχόλησης',
    category: 'government',
    categoryEl: 'Κυβέρνηση & Συμμόρφωση',
    developer: 'Ministry of Labor',
    icon: Shield,
    rating: 4.9,
    reviews: 1250,
    installations: 5200,
    price: 'free',
    tags: ['Government', 'Compliance', 'Required', 'Official'],
    tagsEl: ['Κυβέρνηση', 'Συμμόρφωση', 'Απαιτούμενο', 'Επίσημο'],
    features: ['Real-time employee reporting', 'Automatic compliance checks', 'Digital work card integration'],
    featuresEl: ['Αναφορά υπαλλήλων σε πραγματικό χρόνο', 'Αυτόματοι έλεγχοι συμμόρφωσης', 'Ενσωμάτωση ψηφιακής κάρτας εργασίας'],
    isInstalled: true,
    isPopular: true,
    isFeatured: true,
    isGreekSpecific: true,
    lastUpdated: '2025-01-15',
    supportedCountries: ['GR'],
    integrationComplexity: 'complex',
    setupTime: '2-3 days',
    businessImpact: 'high',
    networkEffect: 95
  },
  {
    id: 'e-efka',
    name: 'e-EFKA',
    nameEl: 'e-ΕΦΚΑ',
    description: 'Electronic social security contributions system',
    descriptionEl: 'Ηλεκτρονικό σύστημα εισφορών κοινωνικής ασφάλισης',
    category: 'government',
    categoryEl: 'Κυβέρνηση & Συμμόρφωση',
    developer: 'EFKA',
    icon: Euro,
    rating: 4.7,
    reviews: 980,
    installations: 4800,
    price: 'free',
    tags: ['Social Security', 'Contributions', 'Required', 'Official'],
    tagsEl: ['Κοινωνική Ασφάλιση', 'Εισφορές', 'Απαιτούμενο', 'Επίσημο'],
    features: ['Automatic contribution calculations', 'Monthly reporting', 'Penalty prevention'],
    featuresEl: ['Αυτόματοι υπολογισμοί εισφορών', 'Μηνιαία αναφορά', 'Πρόληψη προστίμων'],
    isInstalled: true,
    isPopular: true,
    isFeatured: true,
    isGreekSpecific: true,
    lastUpdated: '2025-01-12',
    supportedCountries: ['GR'],
    integrationComplexity: 'complex',
    setupTime: '1-2 days',
    businessImpact: 'high',
    networkEffect: 92
  },
  // Greek Banking Integrations
  {
    id: 'alpha-bank',
    name: 'Alpha Bank Corporate',
    nameEl: 'Alpha Bank Εταιρικά',
    description: 'Direct integration with Alpha Bank for salary payments',
    descriptionEl: 'Άμεση ενσωμάτωση με Alpha Bank για πληρωμές μισθών',
    category: 'banking',
    categoryEl: 'Τραπεζικά & Χρηματοοικονομικά',
    developer: 'Alpha Bank',
    icon: CreditCard,
    rating: 4.8,
    reviews: 750,
    installations: 2100,
    price: 'free',
    tags: ['SEPA', 'Mass Payments', 'Banking', 'Greek'],
    tagsEl: ['SEPA', 'Μαζικές Πληρωμές', 'Τραπεζικά', 'Ελληνικό'],
    features: ['SEPA bulk payments', 'Real-time status updates', 'Payment reconciliation'],
    featuresEl: ['Μαζικές πληρωμές SEPA', 'Ενημερώσεις κατάστασης', 'Συμφωνία πληρωμών'],
    isInstalled: false,
    isPopular: true,
    isFeatured: true,
    isGreekSpecific: true,
    lastUpdated: '2025-01-10',
    supportedCountries: ['GR', 'CY'],
    integrationComplexity: 'medium',
    setupTime: '3-5 hours',
    businessImpact: 'high',
    networkEffect: 85
  },
  {
    id: 'nbg-business',
    name: 'NBG Business Banking',
    nameEl: 'NBG Επιχειρηματικά Τραπεζικά',
    description: 'National Bank of Greece corporate banking integration',
    descriptionEl: 'Ενσωμάτωση εταιρικών τραπεζικών NBG',
    category: 'banking',
    categoryEl: 'Τραπεζικά & Χρηματοοικονομικά',
    developer: 'National Bank of Greece',
    icon: Building2,
    rating: 4.6,
    reviews: 680,
    installations: 1900,
    price: 'free',
    tags: ['Corporate Banking', 'SEPA', 'Greek', 'Bulk Payments'],
    tagsEl: ['Εταιρικά Τραπεζικά', 'SEPA', 'Ελληνικό', 'Μαζικές Πληρωμές'],
    features: ['Advanced bulk file management', 'SEPA Instant payments', 'Multi-currency support'],
    featuresEl: ['Προηγμένη διαχείριση αρχείων', 'Άμεσες πληρωμές SEPA', 'Υποστήριξη πολλών νομισμάτων'],
    isInstalled: false,
    isPopular: true,
    isFeatured: false,
    isGreekSpecific: true,
    lastUpdated: '2025-01-08',
    supportedCountries: ['GR', 'MK', 'BG'],
    integrationComplexity: 'medium',
    setupTime: '2-4 hours',
    businessImpact: 'high',
    networkEffect: 82
  },
  // International Popular Tools
  {
    id: 'slack',
    name: 'Slack',
    nameEl: 'Slack',
    description: 'Team communication and HR notifications',
    descriptionEl: 'Επικοινωνία ομάδας και ειδοποιήσεις HR',
    category: 'communication',
    categoryEl: 'Επικοινωνία',
    developer: 'Slack Technologies',
    icon: MessageSquare,
    rating: 4.7,
    reviews: 15420,
    installations: 45000,
    price: 'freemium',
    priceAmount: '€6/month per user',
    tags: ['Communication', 'Notifications', 'Popular', 'Global'],
    tagsEl: ['Επικοινωνία', 'Ειδοποιήσεις', 'Δημοφιλές', 'Παγκόσμιο'],
    features: ['Payroll notifications', 'Employee onboarding alerts', 'HR announcements'],
    featuresEl: ['Ειδοποιήσεις μισθοδοσίας', 'Ειδοποιήσεις onboarding', 'Ανακοινώσεις HR'],
    isInstalled: false,
    isPopular: true,
    isFeatured: true,
    isGreekSpecific: false,
    lastUpdated: '2025-01-14',
    supportedCountries: ['Global'],
    integrationComplexity: 'simple',
    setupTime: '30 minutes',
    businessImpact: 'medium',
    networkEffect: 78
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    nameEl: 'Microsoft Teams',
    description: 'Enterprise communication and HR workflows',
    descriptionEl: 'Εταιρική επικοινωνία και ροές εργασίας HR',
    category: 'communication',
    categoryEl: 'Επικοινωνία',
    developer: 'Microsoft',
    icon: MessageSquare,
    rating: 4.5,
    reviews: 22000,
    installations: 38000,
    price: 'paid',
    priceAmount: '€4/month per user',
    tags: ['Enterprise', 'Communication', 'Microsoft', 'Popular'],
    tagsEl: ['Εταιρικό', 'Επικοινωνία', 'Microsoft', 'Δημοφιλές'],
    features: ['HR bot integration', 'Leave approval workflows', 'Team notifications'],
    featuresEl: ['Ενσωμάτωση HR bot', 'Ροές εγκρίσεων αδειών', 'Ειδοποιήσεις ομάδας'],
    isInstalled: true,
    isPopular: true,
    isFeatured: false,
    isGreekSpecific: false,
    lastUpdated: '2025-01-13',
    supportedCountries: ['Global'],
    integrationComplexity: 'medium',
    setupTime: '1-2 hours',
    businessImpact: 'medium',
    networkEffect: 75
  },
  // Greek Accounting Software
  {
    id: 'epsilon-net',
    name: 'Epsilon Net',
    nameEl: 'Epsilon Net',
    description: 'Leading Greek ERP and accounting software',
    descriptionEl: 'Κορυφαίο ελληνικό ERP και λογιστικό λογισμικό',
    category: 'accounting',
    categoryEl: 'Λογιστική & ERP',
    developer: 'Epsilon Net',
    icon: FileText,
    rating: 4.6,
    reviews: 1200,
    installations: 3500,
    price: 'paid',
    priceAmount: '€45/month',
    tags: ['ERP', 'Greek', 'Accounting', 'Popular'],
    tagsEl: ['ERP', 'Ελληνικό', 'Λογιστική', 'Δημοφιλές'],
    features: ['Automatic journal entries', 'Greek tax compliance', 'Financial reporting'],
    featuresEl: ['Αυτόματες λογιστικές εγγραφές', 'Ελληνική φορολογική συμμόρφωση', 'Οικονομικές αναφορές'],
    isInstalled: false,
    isPopular: true,
    isFeatured: true,
    isGreekSpecific: true,
    lastUpdated: '2025-01-11',
    supportedCountries: ['GR', 'CY'],
    integrationComplexity: 'complex',
    setupTime: '1-2 days',
    businessImpact: 'high',
    networkEffect: 88
  },
  // Time Tracking
  {
    id: 'toggl-track',
    name: 'Toggl Track',
    nameEl: 'Toggl Track',
    description: 'Time tracking for project-based payroll',
    descriptionEl: 'Παρακολούθηση χρόνου για μισθοδοσία έργων',
    category: 'time',
    categoryEl: 'Χρόνος & Παρουσίες',
    developer: 'Toggl OÜ',
    icon: Clock,
    rating: 4.8,
    reviews: 8500,
    installations: 12000,
    price: 'freemium',
    priceAmount: '€9/month per user',
    tags: ['Time Tracking', 'Projects', 'Popular', 'Global'],
    tagsEl: ['Παρακολούθηση Χρόνου', 'Έργα', 'Δημοφιλές', 'Παγκόσμιο'],
    features: ['Project time tracking', 'Automated timesheets', 'Client billing integration'],
    featuresEl: ['Παρακολούθηση χρόνου έργων', 'Αυτοματοποιημένα φύλλα χρόνου', 'Ενσωμάτωση τιμολόγησης'],
    isInstalled: false,
    isPopular: true,
    isFeatured: false,
    isGreekSpecific: false,
    lastUpdated: '2025-01-12',
    supportedCountries: ['Global'],
    integrationComplexity: 'simple',
    setupTime: '1-2 hours',
    businessImpact: 'medium',
    networkEffect: 70
  }
];

function Grid3X3(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

interface IntegrationMarketplaceProps {
  locale?: 'en' | 'el';
}

export default function IntegrationMarketplace({ locale = 'en' }: IntegrationMarketplaceProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'recent'>('popular');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const translations = {
    en: {
      title: 'Integration Marketplace',
      subtitle: 'Connect PayrollSync with your favorite business tools',
      search: 'Search integrations...',
      installed: 'Installed',
      install: 'Install',
      configure: 'Configure',
      popular: 'Popular',
      featured: 'Featured',
      greek: 'Greek Specific',
      free: 'Free',
      paid: 'Paid',
      freemium: 'Freemium',
      reviews: 'reviews',
      installations: 'installations',
      lastUpdated: 'Updated',
      networkEffect: 'Network Score',
      businessImpact: 'Business Impact',
      setupTime: 'Setup Time',
      viewAll: 'View All',
      backToMarketplace: 'Back to Marketplace',
      installIntegration: 'Install Integration',
      networkEffects: {
        title: 'Network Effects Dashboard',
        totalIntegrations: 'Total Integrations',
        activeConnections: 'Active Connections',
        networkValue: 'Network Value',
        monthlyGrowth: 'Monthly Growth'
      }
    },
    el: {
      title: 'Αγορά Ενσωματώσεων',
      subtitle: 'Συνδέστε το PayrollSync με τα αγαπημένα σας επιχειρηματικά εργαλεία',
      search: 'Αναζήτηση ενσωματώσεων...',
      installed: 'Εγκατεστημένο',
      install: 'Εγκατάσταση',
      configure: 'Διαμόρφωση',
      popular: 'Δημοφιλές',
      featured: 'Επιλεγμένο',
      greek: 'Ελληνικό',
      free: 'Δωρεάν',
      paid: 'Επί Πληρωμή',
      freemium: 'Freemium',
      reviews: 'κριτικές',
      installations: 'εγκαταστάσεις',
      lastUpdated: 'Ενημερώθηκε',
      networkEffect: 'Βαθμός Δικτύου',
      businessImpact: 'Επιχειρηματικός Αντίκτυπος',
      setupTime: 'Χρόνος Εγκατάστασης',
      viewAll: 'Προβολή Όλων',
      backToMarketplace: 'Επιστροφή στην Αγορά',
      installIntegration: 'Εγκατάσταση Ενσωμάτωσης',
      networkEffects: {
        title: 'Πίνακας Δικτυακών Επιδράσεων',
        totalIntegrations: 'Συνολικές Ενσωματώσεις',
        activeConnections: 'Ενεργές Συνδέσεις',
        networkValue: 'Αξία Δικτύου',
        monthlyGrowth: 'Μηνιαία Αύξηση'
      }
    }
  };

  const t = translations[locale];

  const filteredIntegrations = INTEGRATIONS.filter(integration => {
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const sortedIntegrations = [...filteredIntegrations].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.installations - a.installations;
      case 'rating':
        return b.rating - a.rating;
      case 'recent':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      default:
        return 0;
    }
  });

  const handleInstallIntegration = (integration: Integration) => {
    console.log('Installing integration:', integration.id);
    // In real app, trigger installation flow
  };

  const getPriceColor = (price: string) => {
    switch (price) {
      case 'free': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'freemium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBusinessImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (selectedIntegration) {
    const Icon = selectedIntegration.icon;
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={() => setSelectedIntegration(null)} className="mb-6">
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          {t.backToMarketplace}
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-2xl">
                        {locale === 'en' ? selectedIntegration.name : selectedIntegration.nameEl}
                      </CardTitle>
                      {selectedIntegration.isGreekSpecific && (
                        <Badge className="bg-blue-100 text-blue-800">{t.greek}</Badge>
                      )}
                      {selectedIntegration.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800">{t.featured}</Badge>
                      )}
                    </div>
                    <p className="text-gray-600">
                      {locale === 'en' ? selectedIntegration.description : selectedIntegration.descriptionEl}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedIntegration.rating}</span>
                        <span className="text-sm text-gray-500">
                          ({selectedIntegration.reviews} {t.reviews})
                        </span>
                      </div>
                      <Badge className={getPriceColor(selectedIntegration.price)}>
                        {selectedIntegration.price === 'free' ? t.free : 
                         selectedIntegration.price === 'paid' ? t.paid : t.freemium}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3">Key Features</h4>
                    <div className="grid gap-2">
                      {(locale === 'en' ? selectedIntegration.features : selectedIntegration.featuresEl).map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">{t.businessImpact}</h4>
                      <span className={`font-medium capitalize ${getBusinessImpactColor(selectedIntegration.businessImpact)}`}>
                        {selectedIntegration.businessImpact}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">{t.setupTime}</h4>
                      <span className="text-gray-700">{selectedIntegration.setupTime}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">{t.networkEffect}</h4>
                    <div className="flex items-center gap-3">
                      <Progress value={selectedIntegration.networkEffect} className="flex-1" />
                      <span className="font-medium">{selectedIntegration.networkEffect}/100</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  {selectedIntegration.isInstalled ? (
                    <>
                      <Button className="w-full" variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        {t.configure}
                      </Button>
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">{t.installed}</span>
                      </div>
                    </>
                  ) : (
                    <Button 
                      className="w-full" 
                      onClick={() => handleInstallIntegration(selectedIntegration)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t.installIntegration}
                    </Button>
                  )}
                  
                  {selectedIntegration.priceAmount && (
                    <p className="text-sm text-gray-600">{selectedIntegration.priceAmount}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Installations</span>
                  <span className="font-medium">{selectedIntegration.installations.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Developer</span>
                  <span className="font-medium">{selectedIntegration.developer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t.lastUpdated}</span>
                  <span className="font-medium">{selectedIntegration.lastUpdated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Countries</span>
                  <span className="font-medium">{selectedIntegration.supportedCountries.join(', ')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const totalIntegrations = INTEGRATIONS.length;
  const installedCount = INTEGRATIONS.filter(i => i.isInstalled).length;
  const networkValue = INTEGRATIONS.reduce((acc, integration) => acc + integration.networkEffect, 0);
  const averageNetworkEffect = Math.round(networkValue / totalIntegrations);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-2">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
              <Sparkles className="h-4 w-4 mr-1" />
              {totalIntegrations} Integrations
            </Badge>
            <Badge className="bg-green-100 text-green-800 px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              {installedCount} {t.installed}
            </Badge>
          </div>
        </div>

        {/* Network Effects Dashboard */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              {t.networkEffects.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalIntegrations}</div>
                <div className="text-sm text-gray-600">{t.networkEffects.totalIntegrations}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{installedCount}</div>
                <div className="text-sm text-gray-600">{t.networkEffects.activeConnections}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{averageNetworkEffect}/100</div>
                <div className="text-sm text-gray-600">{t.networkEffects.networkValue}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">+23%</div>
                <div className="text-sm text-gray-600">{t.networkEffects.monthlyGrowth}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="popular">{t.popular}</option>
            <option value="rating">Rating</option>
            <option value="recent">Recent</option>
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-8">
        {INTEGRATION_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          return (
            <Button
              key={category.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {locale === 'en' ? category.name : category.nameEl}
            </Button>
          );
        })}
      </div>

      {/* Integrations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedIntegrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card 
              key={integration.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedIntegration(integration)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {locale === 'en' ? integration.name : integration.nameEl}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {integration.developer}
                      </p>
                    </div>
                  </div>
                  {integration.isInstalled && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1 mt-3">
                  {integration.isFeatured && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">{t.featured}</Badge>
                  )}
                  {integration.isPopular && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">{t.popular}</Badge>
                  )}
                  {integration.isGreekSpecific && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs">{t.greek}</Badge>
                  )}
                  <Badge className={`${getPriceColor(integration.price)} text-xs`}>
                    {integration.price === 'free' ? t.free : 
                     integration.price === 'paid' ? t.paid : t.freemium}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {locale === 'en' ? integration.description : integration.descriptionEl}
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{integration.rating}</span>
                      <span className="text-gray-500">({integration.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">{integration.installations.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t.networkEffect}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={integration.networkEffect} className="w-16 h-2" />
                      <span className="font-medium">{integration.networkEffect}</span>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    {integration.isInstalled ? (
                      <Button variant="outline" className="w-full" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        {t.configure}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInstallIntegration(integration);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t.install}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sortedIntegrations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No integrations found matching your criteria</div>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setSelectedCategory('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}