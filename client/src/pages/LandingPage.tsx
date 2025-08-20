import { useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  Shield,
  Users,
  Zap,
  CheckCircle,
  Play,
  Star,
  Globe,
  CreditCard,
  FileText,
  Calculator,
  ArrowRight,
  Building2,
  Timer,
  Eye,
  Phone,
  MessageCircle
} from 'lucide-react';

export default function LandingPage() {
  const { locale, setLocale } = useLocale();
  const [email, setEmail] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleStartFree = () => {
    console.log('Start free clicked', { email, locale });
    // Track: cta_click:start_free
  };

  const handleWatchDemo = () => {
    setShowDemo(true);
    // Track: cta_click:demo
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Language Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex gap-2">
          <Button
            variant={locale === 'en' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLocale('en')}
            className="text-xs"
          >
            EN
          </Button>
          <Button
            variant={locale === 'el' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLocale('el')}
            className="text-xs"
          >
            ΕΛ
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Headline */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {locale === 'el' 
                ? 'Μισθοδοσία σε λίγα λεπτά. Δηλώσεις αυτόματα.'
                : 'Run payroll in minutes. Filings done for you.'}
            </h1>
            
            {/* Hero Subline */}
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {locale === 'el'
                ? 'Αυτόματοι φόροι & έντυπα, συμμόρφωση με ΕΡΓΑΝΗ ΙΙ και Ψηφιακή Κάρτα, άμεσες πληρωμές SEPA.'
                : 'Automated taxes & forms, ERGANI II and Digital Work Card compliance, instant SEPA payouts.'}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-4 text-lg" onClick={handleStartFree}>
                <Zap className="h-5 w-5 mr-2" />
                {locale === 'el' ? 'Ξεκινήστε δωρεάν' : 'Start free'}
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg" onClick={handleWatchDemo}>
                <Play className="h-5 w-5 mr-2" />
                {locale === 'el' ? 'Δείτε demo' : 'Watch 1-min demo'}
              </Button>
            </div>

            {/* Trust Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="ml-2">4.9/5</span>
              </div>
              <span className="hidden sm:block">•</span>
              <span>
                {locale === 'el' 
                  ? 'Εμπιστεύονται 500+ Ελληνικές επιχειρήσεις'
                  : 'Trusted by 500+ Greek businesses'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Greek Compliance Bar */}
      <section className="bg-blue-600 text-white py-4">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <Shield className="h-4 w-4 mr-1" />
              ΕΡΓΑΝΗ ΙΙ
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <CreditCard className="h-4 w-4 mr-1" />
              {locale === 'el' ? 'Ψηφιακή Κάρτα' : 'Digital Work Card'}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <FileText className="h-4 w-4 mr-1" />
              ΑΠΔ/ΦΜΥ
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <Eye className="h-4 w-4 mr-1" />
              {locale === 'el' ? 'ΣΕΠΕ ειδοποιήσεις' : 'SEPE alerts'}
            </Badge>
          </div>
        </div>
      </section>

      {/* Value Cards */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Calculator className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">
                  {locale === 'el' ? 'Αυτοματισμός' : 'Automation'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {locale === 'el' 
                    ? 'Υπολογίζουμε & καταθέτουμε όλες τις δηλώσεις αυτόματα'
                    : 'We calculate & file all forms automatically'}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">
                  {locale === 'el' ? 'Συγχρονισμός Χρόνου' : 'Time Sync'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {locale === 'el'
                    ? 'Ώρες, άδειες, αργίες μεταφέρονται απευθείας στη μισθοδοσία'
                    : 'Hours, PTO, holidays flow straight into payroll'}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">
                  {locale === 'el' ? 'Αυτοεξυπηρέτηση' : 'Self-Service'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {locale === 'el'
                    ? 'Οι εργαζόμενοι βλέπουν μισθοδοσία, ενημερώνουν στοιχεία'
                    : 'Employees view pay, update details themselves'}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-lg">
                  {locale === 'el' ? 'Ενσωματώσεις' : 'Integrations'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  {locale === 'el'
                    ? 'Συνδέεται με λογιστικά & χρονομέτρηση συστήματα'
                    : 'Connects with accounting & time tracking apps'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {locale === 'el' ? 'Πώς λειτουργεί' : 'How it works'}
            </h2>
            <p className="text-xl text-gray-600">
              {locale === 'el' 
                ? 'Μισθοδοσία σε 4 απλά βήματα'
                : 'Payroll in 4 simple steps'}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: 1,
                titleEn: 'Connect company & time',
                titleEl: 'Συνδέστε εταιρεία & χρόνο',
                descEn: 'Import your employees and time tracking data',
                descEl: 'Εισάγετε τους εργαζομένους και τα χρονοδεδομένα'
              },
              {
                step: 2,
                titleEn: 'Review hours & exceptions',
                titleEl: 'Ελέγξτε ώρες & εξαιρέσεις',
                descEn: 'Check overtime, missing punches, and adjustments',
                descEl: 'Ελέγξτε υπερωρίες, λείπουσες καταγραφές και προσαρμογές'
              },
              {
                step: 3,
                titleEn: 'Run payroll (auto taxes)',
                titleEl: 'Τρέξτε μισθοδοσία (αυτόματοι φόροι)',
                descEn: 'Calculate wages, taxes, and all compliance forms',
                descEl: 'Υπολογισμός μισθών, φόρων και όλων των εντύπων συμμόρφωσης'
              },
              {
                step: 4,
                titleEn: 'Pay & File',
                titleEl: 'Πληρωμή & Κατάθεση',
                descEn: 'SEPA payouts and automatic ΑΠΔ/ΦΜΥ filing',
                descEl: 'Πληρωμές SEPA και αυτόματη κατάθεση ΑΠΔ/ΦΜΥ'
              }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4 font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {locale === 'el' ? item.titleEl : item.titleEn}
                </h3>
                <p className="text-gray-600">
                  {locale === 'el' ? item.descEl : item.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            {locale === 'el' 
              ? 'Εμπιστεύονται από κορυφαίες επιχειρήσεις'
              : 'Trusted by leading businesses'}
          </h2>
          
          {/* Customer Logos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 opacity-60">
            {['Hotel Princess', 'Luxury Collection', 'Greek Hospitality', 'Aegean Corp'].map((company) => (
              <div key={company} className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
                <Building2 className="h-8 w-8 mr-2 text-gray-400" />
                <span className="font-medium text-gray-600">{company}</span>
              </div>
            ))}
          </div>

          {/* Customer Quotes */}
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: locale === 'el' 
                  ? '"Μισθοδοσία σε 5 λεπτά, λιγότερο από 1% λάθη"'
                  : '"Payroll in 5 minutes, less than 1% errors"',
                name: 'Maria K.',
                title: locale === 'el' ? 'HR Manager' : 'HR Manager'
              },
              {
                quote: locale === 'el'
                  ? '"Όλες οι δηλώσεις γίνονται αυτόματα - τέλος το στρες"'
                  : '"All filings done automatically - no more stress"',
                name: 'Nikos P.',
                title: locale === 'el' ? 'Λογιστής' : 'Accountant'
              },
              {
                quote: locale === 'el'
                  ? '"Τέλεια ενσωμάτωση με το σύστημα χρονομέτρησής μας"'
                  : '"Perfect integration with our time tracking system"',
                name: 'Elena S.',
                title: locale === 'el' ? 'Operations Manager' : 'Operations Manager'
              }
            ].map((testimonial, idx) => (
              <Card key={idx} className="p-6">
                <CardContent className="pt-0">
                  <p className="text-gray-600 mb-4 italic">{testimonial.quote}</p>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {locale === 'el' ? 'Απλές τιμές' : 'Simple pricing'}
          </h2>
          <div className="max-w-md mx-auto bg-white rounded-lg p-8 shadow-lg">
            <div className="text-4xl font-bold text-blue-600 mb-2">€29</div>
            <div className="text-gray-600 mb-4">
              {locale === 'el' ? 'ανά εταιρεία + €8 ανά εργαζόμενο' : 'per company + €8 per employee'}
            </div>
            <p className="text-sm text-gray-500 mb-6">
              {locale === 'el' 
                ? 'Χωρίς επιπλέον χρέωση για έκτακτες μισθοδοσίες'
                : 'No extra fee for off-cycle runs'}
            </p>
            <Button className="w-full">
              {locale === 'el' ? 'Δείτε πλήρη τιμολόγηση' : 'View full pricing'}
            </Button>
          </div>
        </div>
      </section>

      {/* Security & Reliability */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            {locale === 'el' ? 'Ασφάλεια & Αξιοπιστία' : 'Security & Reliability'}
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center">
              <Shield className="h-12 w-12 text-green-600 mb-2" />
              <span className="font-semibold">ISO 27001</span>
            </div>
            <div className="flex flex-col items-center">
              <Globe className="h-12 w-12 text-blue-600 mb-2" />
              <span className="font-semibold">
                {locale === 'el' ? 'Δεδομένα στην ΕΕ' : 'EU Data Residency'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-purple-600 mb-2" />
              <span className="font-semibold">
                {locale === 'el' ? 'Έλεγχος Πρόσβασης' : 'Role-based Access'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-600 mb-2" />
              <span className="font-semibold">
                {locale === 'el' ? 'Πιστοποίηση MFA' : 'MFA Certified'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            {locale === 'el' 
              ? 'Τρέξτε την πρώτη σας μισθοδοσία αυτή την εβδομάδα'
              : 'Run your first payroll this week'}
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            {locale === 'el'
              ? 'Ξεκινήστε δωρεάν σήμερα. Καμία πιστωτική κάρτα δεν απαιτείται.'
              : 'Start free today. No credit card required.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <div className="flex gap-2">
              <Input 
                placeholder={locale === 'el' ? 'Εισάγετε το email σας' : 'Enter your email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white text-gray-900"
              />
              <Button size="lg" variant="secondary" onClick={handleStartFree}>
                {locale === 'el' ? 'Ξεκινήστε δωρεάν' : 'Start free'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <span>+30 210 123 4567</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span>{locale === 'el' ? 'Chat υποστήριξης' : 'Live Chat Support'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky CTA on scroll */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button size="lg" className="shadow-lg">
          {locale === 'el' ? 'Ξεκινήστε δωρεάν' : 'Start free'}
        </Button>
      </div>
    </div>
  );
}