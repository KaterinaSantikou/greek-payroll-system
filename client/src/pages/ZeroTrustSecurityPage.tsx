/**
 * Zero-Trust Security Page
 * Main page for zero-trust security management and monitoring
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ZeroTrustDashboard from '@/components/ZeroTrustDashboard';
import MultiFactorAuth from '@/components/MultiFactorAuth';
import DeviceComplianceMonitor from '@/components/DeviceComplianceMonitor';
import {
  Shield,
  ShieldCheck,
  Key,
  Monitor,
  Users,
  Lock,
  Eye,
  Activity,
  CheckCircle,
  AlertTriangle,
  Globe,
  ArrowRight,
  Zap,
  FileText,
  Settings
} from 'lucide-react';

type View = 'landing' | 'dashboard' | 'mfa' | 'devices' | 'audit';

export default function ZeroTrustSecurityPage() {
  const [view, setView] = useState<View>('landing');
  const [locale, setLocale] = useState<'en' | 'el'>('en');

  const translations = {
    en: {
      title: 'Zero-Trust Security Platform',
      subtitle: 'Never trust, always verify - Comprehensive security for Greek payroll data',
      hero: {
        title: 'Protect Your Greek Payroll Data with Zero-Trust Security',
        subtitle: 'Military-grade security architecture designed specifically for Greek businesses handling sensitive employee data, government integrations, and GDPR compliance.',
        cta: 'View Security Dashboard',
        ctaSecondary: 'Setup Multi-Factor Auth'
      },
      features: {
        title: 'Enterprise-Grade Security Features',
        zeroTrust: {
          title: 'Zero-Trust Architecture',
          description: 'Never trust, always verify every user, device, and network connection accessing your payroll data.'
        },
        mfa: {
          title: 'Multi-Factor Authentication',
          description: 'Multiple verification methods including authenticator apps, SMS, biometrics, and hardware keys.'
        },
        deviceCompliance: {
          title: 'Device Compliance',
          description: 'Monitor and enforce security policies across all devices accessing sensitive payroll information.'
        },
        dataProtection: {
          title: 'Data Protection',
          description: 'End-to-end encryption, data loss prevention, and GDPR compliance for Greek employee data.'
        }
      },
      benefits: {
        title: 'Why Zero-Trust is Critical for Greek Payroll',
        greekCompliance: {
          title: 'Greek Government Integration Security',
          description: 'Secure connections to ERGANI II, e-EFKA, and other Greek government systems with enterprise-grade protection.'
        },
        gdprCompliance: {
          title: 'GDPR & Greek Data Protection',
          description: 'Full compliance with European and Greek data protection laws for employee personal information.'
        },
        threatPrevention: {
          title: 'Advanced Threat Prevention',
          description: 'Real-time threat detection, anomaly monitoring, and automated security response for payroll systems.'
        }
      },
      sections: {
        dashboard: 'Security Dashboard',
        mfa: 'Multi-Factor Authentication',
        devices: 'Device Compliance',
        audit: 'Audit & Compliance'
      },
      stats: {
        securityScore: 'Security Score',
        threats: 'Threats Blocked',
        compliance: 'Compliance Rate',
        devices: 'Protected Devices'
      }
    },
    el: {
      title: 'Πλατφόρμα Ασφαλείας Zero-Trust',
      subtitle: 'Ποτέ μην εμπιστεύεσαι, πάντα επαληθεύεις - Ολοκληρωμένη ασφάλεια για ελληνικά δεδομένα μισθοδοσίας',
      hero: {
        title: 'Προστατέψτε τα Ελληνικά Δεδομένα Μισθοδοσίας με Ασφάλεια Zero-Trust',
        subtitle: 'Αρχιτεκτονική ασφαλείας στρατιωτικού επιπέδου σχεδιασμένη ειδικά για ελληνικές επιχειρήσεις που διαχειρίζονται ευαίσθητα δεδομένα υπαλλήλων, κυβερνητικές ενσωματώσεις και συμμόρφωση GDPR.',
        cta: 'Προβολή Πίνακα Ασφαλείας',
        ctaSecondary: 'Ρύθμιση Πολυπαραγοντικής Αυθεντικοποίησης'
      },
      features: {
        title: 'Χαρακτηριστικά Ασφαλείας Εταιρικού Επιπέδου',
        zeroTrust: {
          title: 'Αρχιτεκτονική Zero-Trust',
          description: 'Ποτέ μην εμπιστεύεσαι, πάντα επαληθεύεις κάθε χρήστη, συσκευή και σύνδεση δικτύου που έχει πρόσβαση στα δεδομένα μισθοδοσίας σας.'
        },
        mfa: {
          title: 'Πολυπαραγοντική Αυθεντικοποίηση',
          description: 'Πολλαπλές μέθοδοι επαλήθευσης συμπεριλαμβανομένων εφαρμογών αυθεντικοποίησης, SMS, βιομετρικών και κλειδιών υλικού.'
        },
        deviceCompliance: {
          title: 'Συμμόρφωση Συσκευών',
          description: 'Παρακολουθήστε και επιβάλλετε πολιτικές ασφαλείας σε όλες τις συσκευές που έχουν πρόσβαση σε ευαίσθητες πληροφορίες μισθοδοσίας.'
        },
        dataProtection: {
          title: 'Προστασία Δεδομένων',
          description: 'Κρυπτογράφηση από άκρο σε άκρο, πρόληψη απώλειας δεδομένων και συμμόρφωση GDPR για ελληνικά δεδομένα υπαλλήλων.'
        }
      },
      benefits: {
        title: 'Γιατί το Zero-Trust είναι Κρίσιμο για την Ελληνική Μισθοδοσία',
        greekCompliance: {
          title: 'Ασφάλεια Ενσωμάτωσης Ελληνικής Κυβέρνησης',
          description: 'Ασφαλείς συνδέσεις με ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ και άλλα ελληνικά κυβερνητικά συστήματα με προστασία εταιρικού επιπέδου.'
        },
        gdprCompliance: {
          title: 'GDPR & Ελληνική Προστασία Δεδομένων',
          description: 'Πλήρης συμμόρφωση με ευρωπαϊκούς και ελληνικούς νόμους προστασίας δεδομένων για προσωπικές πληροφορίες υπαλλήλων.'
        },
        threatPrevention: {
          title: 'Προηγμένη Πρόληψη Απειλών',
          description: 'Ανίχνευση απειλών σε πραγματικό χρόνο, παρακολούθηση ανωμαλιών και αυτοματοποιημένη απόκριση ασφαλείας για συστήματα μισθοδοσίας.'
        }
      },
      sections: {
        dashboard: 'Πίνακας Ασφαλείας',
        mfa: 'Πολυπαραγοντική Αυθεντικοποίηση',
        devices: 'Συμμόρφωση Συσκευών',
        audit: 'Έλεγχος & Συμμόρφωση'
      },
      stats: {
        securityScore: 'Βαθμός Ασφαλείας',
        threats: 'Απειλές Αποκλεισμένες',
        compliance: 'Ποσοστό Συμμόρφωσης',
        devices: 'Προστατευμένες Συσκευές'
      }
    }
  };

  const t = translations[locale];

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Security Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('mfa')}>
                <Key className="h-4 w-4 mr-2" />
                {t.sections.mfa}
              </Button>
              <Button variant="outline" onClick={() => setView('devices')}>
                <Monitor className="h-4 w-4 mr-2" />
                {t.sections.devices}
              </Button>
              <Button variant="outline" onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}>
                <Globe className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'EL' : 'EN'}
              </Button>
            </div>
          </div>
        </div>
        <ZeroTrustDashboard locale={locale} />
      </div>
    );
  }

  if (view === 'mfa') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Security Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('dashboard')}>
                <Shield className="h-4 w-4 mr-2" />
                {t.sections.dashboard}
              </Button>
              <Button variant="outline" onClick={() => setView('devices')}>
                <Monitor className="h-4 w-4 mr-2" />
                {t.sections.devices}
              </Button>
              <Button variant="outline" onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}>
                <Globe className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'EL' : 'EN'}
              </Button>
            </div>
          </div>
        </div>
        <MultiFactorAuth locale={locale} />
      </div>
    );
  }

  if (view === 'devices') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Security Overview
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setView('dashboard')}>
                <Shield className="h-4 w-4 mr-2" />
                {t.sections.dashboard}
              </Button>
              <Button variant="outline" onClick={() => setView('mfa')}>
                <Key className="h-4 w-4 mr-2" />
                {t.sections.mfa}
              </Button>
              <Button variant="outline" onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}>
                <Globe className="h-4 w-4 mr-2" />
                {locale === 'en' ? 'EL' : 'EN'}
              </Button>
            </div>
          </div>
        </div>
        <DeviceComplianceMonitor locale={locale} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocale(locale === 'en' ? 'el' : 'en')}
            >
              <Globe className="h-4 w-4 mr-2" />
              {locale === 'en' ? 'EL' : 'EN'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Zero-Trust Security Platform
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {t.hero.title}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            {t.hero.subtitle}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => setView('dashboard')}
            >
              <Shield className="h-5 w-5 mr-2" />
              {t.hero.cta}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => setView('mfa')}
            >
              <Key className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Security Stats */}
        <Card className="mb-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
          <CardContent className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-green-400">96%</div>
                <div className="text-gray-300">{t.stats.securityScore}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-red-400">2,847</div>
                <div className="text-gray-300">{t.stats.threats}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-blue-400">100%</div>
                <div className="text-gray-300">{t.stats.compliance}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2 text-purple-400">156</div>
                <div className="text-gray-300">{t.stats.devices}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card 
              className="text-center p-8 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setView('dashboard')}
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.zeroTrust.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.zeroTrust.description}</p>
            </Card>

            <Card 
              className="text-center p-8 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setView('mfa')}
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Key className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.mfa.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.mfa.description}</p>
            </Card>

            <Card 
              className="text-center p-8 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setView('devices')}
            >
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Monitor className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.deviceCompliance.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.deviceCompliance.description}</p>
            </Card>

            <Card className="text-center p-8 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.dataProtection.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.dataProtection.description}</p>
            </Card>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.benefits.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <Settings className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.greekCompliance.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.greekCompliance.description}</p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.gdprCompliance.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.gdprCompliance.description}</p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.threatPrevention.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.threatPrevention.description}</p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center p-12">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Secure Your Greek Payroll Data?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Implement enterprise-grade zero-trust security for your Greek business today.
          </p>
          <div className="flex items-center justify-center gap-6">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
              onClick={() => setView('dashboard')}
            >
              <Shield className="h-5 w-5 mr-2" />
              Start Security Assessment
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
              onClick={() => setView('mfa')}
            >
              <Key className="h-5 w-5 mr-2" />
              Enable Multi-Factor Auth
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}