import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowRight, 
  Play, 
  Clock, 
  Shield, 
  Users, 
  Zap, 
  CheckCircle, 
  Star, 
  Globe, 
  Calendar,
  CreditCard,
  FileText,
  Smartphone,
  Building2,
  Award,
  Lock,
  Database,
  Phone,
  MessageCircle,
  X
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { initLandingOptimizations, trackConversion, initPerformanceTracking } from '@/utils/landingOptimizations';

// Analytics tracking helper
const trackEvent = (event: string, properties: Record<string, any> = {}) => {
  // Integration with analytics service (GA4, Mixpanel, etc.)
  if (typeof window !== 'undefined') {
    console.log(`Analytics: ${event}`, properties);
    // window.gtag?.('event', event, properties);
    // window.mixpanel?.track(event, properties);
  }
};

interface LandingPageProps {
  initialLocale?: 'en' | 'el';
}

export default function Landing({ initialLocale = 'en' }: LandingPageProps) {
  const { t, locale, changeLanguage } = useTranslation();
  const [, setLocation] = useLocation();
  const [currentLocale, setCurrentLocale] = useState<'en' | 'el'>(initialLocale);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const [viewedSections, setViewedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize performance optimizations
    initLandingOptimizations();
    initPerformanceTracking();
    
    const handleScroll = () => {
      // Show sticky CTA after scrolling past hero
      const heroHeight = window.innerHeight;
      setStickyCtaVisible(window.scrollY > heroHeight * 0.8);
      
      // Track section views
      const sections = ['hero', 'compliance', 'value-cards', 'how-it-works', 'social-proof', 'pricing', 'security'];
      sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element && !viewedSections.has(sectionId)) {
          const rect = element.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            setViewedSections(prev => new Set([...prev, sectionId]));
            trackEvent('section_view', { section: sectionId, locale: currentLocale });
          }
        }
      });
    };

    // Exit intent detection
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !showExitIntent) {
        setShowExitIntent(true);
        trackEvent('exit_intent_triggered', { locale: currentLocale });
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [viewedSections, showExitIntent, currentLocale]);

  const handleLanguageChange = (newLocale: 'en' | 'el') => {
    setCurrentLocale(newLocale);
    changeLanguage(newLocale);
    // Persist language preference
    localStorage.setItem('preferred-language', newLocale);
    trackEvent('language_changed', { from: currentLocale, to: newLocale });
  };

  const handleCtaClick = (type: 'start_free' | 'demo' | 'pricing') => {
    trackEvent('cta_click', { type, section: 'hero', locale: currentLocale });
    trackConversion('cta_click', { type, section: 'hero', locale: currentLocale });
    
    if (type === 'start_free') {
      setLocation('/auth/signup');
    } else if (type === 'demo') {
      setShowDemoModal(true);
    } else if (type === 'pricing') {
      setLocation('/pricing');
    }
  };

  const translations = {
    en: {
      // Hero Section
      hero: {
        headline: "Run payroll in minutes. Filings done for you.",
        subline: "Automated taxes & forms, time sync, and instant payouts.",
        ctaPrimary: "Start free",
        ctaSecondary: "Watch 1-min demo",
        trustStrip: "★★★★★ Trusted by 500+ Greek businesses",
        rating: "4.8/5"
      },
      // Greek Compliance Bar
      compliance: {
        title: "Greek HR Compliance Built-In",
        ergani: "ERGANI II",
        erganiDesc: "Automatic labor card & time tracking integration",
        digitalCard: "Digital Card",
        digitalCardDesc: "Ψηφιακή Κάρτα Εργασίας compliance",
        apdFmy: "ΑΠΔ/ΦΜΥ",
        apdFmyDesc: "Direct filing to tax & social security systems",
        sepe: "ΣΕΠΕ Alerts",
        sepeDesc: "Real-time unemployment benefit notifications"
      },
      // Value Cards
      valueCards: {
        automation: {
          title: "We calculate & file",
          desc: "Greek taxes, EFKA contributions, and government forms automatically processed and filed.",
          benefits: ["Tax calculations", "EFKA & IKA", "Automatic filings", "Compliance alerts"]
        },
        timeSync: {
          title: "Hours, PTO, holidays flow straight into payroll",
          desc: "Connect time tracking, approve exceptions, and watch everything sync to payroll seamlessly.",
          benefits: ["Time integration", "PTO tracking", "Holiday calendars", "Exception handling"]
        },
        selfService: {
          title: "Employees view pay, update details",
          desc: "Self-service portal for payslips, tax documents, and personal information updates.",
          benefits: ["Digital payslips", "Tax documents", "Personal updates", "Mobile access"]
        },
        integrations: {
          title: "Works with your tools",
          desc: "Connect accounting software, time tracking, and banking for seamless operations.",
          benefits: ["Accounting sync", "Banking APIs", "Time systems", "SEPA payments"]
        }
      },
      // How It Works
      howItWorks: {
        title: "How it works",
        subtitle: "From setup to payment in 4 simple steps",
        steps: [
          {
            title: "Connect company & time",
            desc: "Link your business details, employees, and time tracking system in minutes."
          },
          {
            title: "Review hours & exceptions",
            desc: "Approve overtime, PTO, and holiday pay with one-click validation."
          },
          {
            title: "Run payroll (auto taxes/forms)",
            desc: "Greek tax calculations, EFKA contributions, and forms generated automatically."
          },
          {
            title: "Pay (SEPA/SCT Inst), File (ΑΠΔ/ΦΜΥ)",
            desc: "Instant payments via SEPA and automatic government filings."
          }
        ],
        demoButton: "Watch interactive demo"
      },
      // Social Proof
      socialProof: {
        title: "Trusted by leading Greek businesses",
        testimonials: [
          {
            quote: "Payroll in 5 minutes, less than 1% errors. Game changer for our hotel operations.",
            author: "Maria Konstantinou",
            title: "HR Director",
            company: "Aegean Hotels"
          },
          {
            quote: "ERGANI II compliance was our biggest headache. Now it's completely automated.",
            author: "Dimitris Papadopoulos",
            title: "Finance Manager", 
            company: "TechCorp Athens"
          },
          {
            quote: "Cut our payroll processing time by 80%. The Greek tax integration is flawless.",
            author: "Sofia Angelou",
            title: "Operations Director",
            company: "Mediterranean Retail Group"
          }
        ],
        awards: "Winner: Best HR Tech Solution Greece 2024"
      },
      // Pricing
      pricing: {
        title: "Simple, transparent pricing",
        subtitle: "No extra fees for off-cycle runs or corrections",
        basePrice: "€29/month per company",
        perEmployee: "€3/month per employee",
        features: ["Unlimited payroll runs", "All integrations included", "Greek compliance built-in", "24/7 support"],
        cta: "View full pricing"
      },
      // Security
      security: {
        title: "Enterprise security & reliability",
        subtitle: "Your data stays in the EU with bank-level protection",
        features: [
          { icon: Shield, title: "ISO 27001 Certified", desc: "Bank-level encryption" },
          { icon: Database, title: "EU Data Residency", desc: "Data never leaves Europe" },
          { icon: Users, title: "Role-based Access", desc: "Granular permissions" },
          { icon: Lock, title: "Multi-factor Auth", desc: "Advanced security" }
        ]
      },
      // Final CTA
      finalCta: {
        title: "Run your first payroll this week",
        subtitle: "Join 500+ Greek businesses automating their HR compliance",
        cta: "Start free trial",
        guarantee: "30-day money-back guarantee"
      },
      // Navigation
      nav: {
        features: "Features",
        pricing: "Pricing",
        security: "Security",
        signIn: "Sign In",
        startFree: "Start Free"
      },
      // Exit Intent Modal
      exitIntent: {
        title: "Wait! Get our Greek Payroll Compliance Checklist",
        subtitle: "Free guide covering ERGANI II, tax requirements, and common mistakes",
        emailPlaceholder: "Enter your work email",
        cta: "Send me the checklist",
        close: "No thanks"
      }
    },
    el: {
      // Hero Section  
      hero: {
        headline: "Μισθοδοσία σε λίγα λεπτά. Δηλώσεις αυτόματα.",
        subline: "Αυτόματοι φόροι & φόρμες, συγχρονισμός ωρών, και άμεσες πληρωμές.",
        ctaPrimary: "Έναρξη δωρεάν",
        ctaSecondary: "Δείτε demo 1 λεπτού",
        trustStrip: "★★★★★ Εμπιστεύονται 500+ Ελληνικές επιχειρήσεις",
        rating: "4.8/5"
      },
      // Greek Compliance Bar
      compliance: {
        title: "Ελληνική Συμμόρφωση HR Ενσωματωμένη",
        ergani: "ERGANI II",
        erganiDesc: "Αυτόματη ενσωμάτωση κάρτας εργασίας & παρακολούθησης χρόνου",
        digitalCard: "Ψηφιακή Κάρτα",
        digitalCardDesc: "Συμμόρφωση Ψηφιακής Κάρτας Εργασίας",
        apdFmy: "ΑΠΔ/ΦΜΥ",
        apdFmyDesc: "Άμεση υποβολή σε φορολογικά & ασφαλιστικά συστήματα",
        sepe: "Ειδοποιήσεις ΣΕΠΕ",
        sepeDesc: "Ειδοποιήσεις επιδόματος ανεργίας σε πραγματικό χρόνο"
      },
      // Value Cards
      valueCards: {
        automation: {
          title: "Υπολογίζουμε & υποβάλλουμε",
          desc: "Ελληνικοί φόροι, εισφορές ΕΦΚΑ, και κυβερνητικές φόρμες αυτόματα επεξεργασμένες και υποβληθείσες.",
          benefits: ["Υπολογισμοί φόρων", "ΕΦΚΑ & ΙΚΑ", "Αυτόματες υποβολές", "Ειδοποιήσεις συμμόρφωσης"]
        },
        timeSync: {
          title: "Ώρες, άδειες, αργίες ρέουν απευθείας στη μισθοδοσία",
          desc: "Συνδέστε την παρακολούθηση χρόνου, εγκρίνετε εξαιρέσεις, και παρακολουθήστε τα πάντα να συγχρονίζονται στη μισθοδοσία.",
          benefits: ["Ενσωμάτωση χρόνου", "Παρακολούθηση αδειών", "Ημερολόγια αργιών", "Χειρισμός εξαιρέσεων"]
        },
        selfService: {
          title: "Οι εργαζόμενοι βλέπουν μισθούς, ενημερώνουν στοιχεία",
          desc: "Πύλη αυτοεξυπηρέτησης για μισθολογικά δελτία, φορολογικά έγγραφα και ενημερώσεις προσωπικών πληροφοριών.",
          benefits: ["Ψηφιακά μισθολογικά", "Φορολογικά έγγραφα", "Προσωπικές ενημερώσεις", "Πρόσβαση κινητού"]
        },
        integrations: {
          title: "Λειτουργεί με τα εργαλεία σας",
          desc: "Συνδέστε λογισμικό λογιστικής, παρακολούθηση χρόνου και τραπεζικές για απρόσκοπτες λειτουργίες.",
          benefits: ["Συγχρονισμός λογιστικής", "Banking APIs", "Συστήματα χρόνου", "Πληρωμές SEPA"]
        }
      },
      // How It Works
      howItWorks: {
        title: "Πώς λειτουργεί",
        subtitle: "Από την εγκατάσταση στην πληρωμή σε 4 απλά βήματα",
        steps: [
          {
            title: "Συνδέστε εταιρεία & χρόνο",
            desc: "Συνδέστε τα στοιχεία της επιχείρησης, εργαζόμενους και σύστημα παρακολούθησης χρόνου σε λεπτά."
          },
          {
            title: "Ελέγξτε ώρες & εξαιρέσεις",
            desc: "Εγκρίνετε υπερωρίες, άδειες και αργίες με επικύρωση ενός κλικ."
          },
          {
            title: "Εκτελέστε μισθοδοσία (αυτόματοι φόροι/φόρμες)",
            desc: "Υπολογισμοί ελληνικών φόρων, εισφορές ΕΦΚΑ και φόρμες δημιουργούνται αυτόματα."
          },
          {
            title: "Πληρώστε (SEPA/SCT Inst), Υποβάλλετε (ΑΠΔ/ΦΜΥ)",
            desc: "Άμεσες πληρωμές μέσω SEPA και αυτόματες κυβερνητικές υποβολές."
          }
        ],
        demoButton: "Δείτε διαδραστικό demo"
      },
      // Social Proof
      socialProof: {
        title: "Εμπιστοσύνη από κορυφαίες ελληνικές επιχειρήσεις",
        testimonials: [
          {
            quote: "Μισθοδοσία σε 5 λεπτά, λιγότερο από 1% λάθη. Αλλαγή παιχνιδιού για τις ξενοδοχειακές μας λειτουργίες.",
            author: "Μαρία Κωνσταντίνου",
            title: "Διευθύντρια HR",
            company: "Αιγαίο Ξενοδοχεία"
          },
          {
            quote: "Η συμμόρφωση ERGANI II ήταν ο μεγαλύτερος μας πονοκέφαλος. Τώρα είναι εντελώς αυτοματοποιημένη.",
            author: "Δημήτρης Παπαδόπουλος",
            title: "Διευθυντής Οικονομικών",
            company: "TechCorp Αθήνα"
          },
          {
            quote: "Μειώσαμε τον χρόνο επεξεργασίας μισθοδοσίας κατά 80%. Η ενσωμάτωση ελληνικών φόρων είναι άψογη.",
            author: "Σοφία Αγγέλου",
            title: "Διευθύντρια Λειτουργιών",
            company: "Mediterranean Retail Group"
          }
        ],
        awards: "Βραβείο: Καλύτερη Λύση HR Tech Ελλάδα 2024"
      },
      // Pricing
      pricing: {
        title: "Απλή, διαφανής τιμολόγηση",
        subtitle: "Χωρίς επιπλέον χρεώσεις για εκτός κύκλου εκτελέσεις ή διορθώσεις",
        basePrice: "€29/μήνα ανά εταιρεία",
        perEmployee: "€3/μήνα ανά εργαζόμενο",
        features: ["Απεριόριστες εκτελέσεις μισθοδοσίας", "Όλες οι ενσωματώσεις περιλαμβάνονται", "Ελληνική συμμόρφωση ενσωματωμένη", "Υποστήριξη 24/7"],
        cta: "Δείτε πλήρη τιμολόγηση"
      },
      // Security
      security: {
        title: "Ασφάλεια & αξιοπιστία επιχείρησης",
        subtitle: "Τα δεδομένα σας παραμένουν στην ΕΕ με προστασία επιπέδου τράπεζας",
        features: [
          { icon: Shield, title: "Πιστοποίηση ISO 27001", desc: "Κρυπτογράφηση επιπέδου τράπεζας" },
          { icon: Database, title: "Κατοικία Δεδομένων ΕΕ", desc: "Δεδομένα δεν φεύγουν από Ευρώπη" },
          { icon: Users, title: "Πρόσβαση Βάσει Ρόλων", desc: "Λεπτομερή δικαιώματα" },
          { icon: Lock, title: "Πολυπαραγοντική Αυθεντικοποίηση", desc: "Προηγμένη ασφάλεια" }
        ]
      },
      // Final CTA
      finalCta: {
        title: "Τρέξτε την πρώτη σας μισθοδοσία αυτή την εβδομάδα",
        subtitle: "Ενωθείτε με 500+ ελληνικές επιχειρήσεις που αυτοματοποιούν τη συμμόρφωση HR τους",
        cta: "Ξεκινήστε δωρεάν δοκιμή",
        guarantee: "Εγγύηση επιστροφής χρημάτων 30 ημερών"
      },
      // Navigation
      nav: {
        features: "Χαρακτηριστικά",
        pricing: "Τιμολόγηση",
        security: "Ασφάλεια",
        signIn: "Σύνδεση",
        startFree: "Έναρξη Δωρεάν"
      },
      // Exit Intent Modal
      exitIntent: {
        title: "Περιμένετε! Λάβετε τη Λίστα Ελέγχου Ελληνικής Συμμόρφωσης Μισθοδοσίας",
        subtitle: "Δωρεάν οδηγός που καλύπτει ERGANI II, φορολογικές απαιτήσεις και συνήθη λάθη",
        emailPlaceholder: "Εισάγετε το email εργασίας σας",
        cta: "Στείλτε μου τη λίστα",
        close: "Όχι ευχαριστώ"
      }
    }
  };

  const text = translations[currentLocale];

  // Customer logos (Greek businesses)
  const customerLogos = [
    "Aegean Hotels", "TechCorp Athens", "Mediterranean Retail Group", 
    "Hellenic Manufacturing", "Athens Finance Group", "Greek Hospitality Partners"
  ];

  // Integration logos
  const integrationLogos = [
    { name: "Xero", category: "Accounting" },
    { name: "Sage", category: "Accounting" },
    { name: "Alpha Bank", category: "Banking" },
    { name: "Piraeus Bank", category: "Banking" },
    { name: "Workday", category: "Time Tracking" },
    { name: "BambooHR", category: "HR" }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 overflow-x-hidden">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">PayrollSync</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#value-cards" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                {text.nav.features}
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                {text.nav.pricing}
              </a>
              <a href="#security" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                {text.nav.security}
              </a>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Toggle */}
              <Select value={currentLocale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-20">
                  <Globe className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">EN</SelectItem>
                  <SelectItem value="el">EL</SelectItem>
                </SelectContent>
              </Select>

              <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                {text.nav.signIn}
              </Link>
              
              <Button 
                onClick={() => handleCtaClick('start_free')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {text.nav.startFree}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sticky CTA Bar */}
      {stickyCtaVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-600 text-white p-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5" />
              <span className="font-medium">{text.hero.headline}</span>
            </div>
            <Button 
              variant="secondary"
              onClick={() => handleCtaClick('start_free')}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              {text.hero.ctaPrimary}
            </Button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6 max-w-4xl mx-auto leading-tight">
              {text.hero.headline}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              {text.hero.subline}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                size="lg" 
                onClick={() => handleCtaClick('start_free')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3 min-w-[200px]"
              >
                {text.hero.ctaPrimary}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => handleCtaClick('demo')}
                className="text-lg px-8 py-3 min-w-[200px]"
              >
                <Play className="mr-2 h-5 w-5" />
                {text.hero.ctaSecondary}
              </Button>
            </div>

            {/* Trust Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <span className="ml-1 font-medium">{text.hero.rating}</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
              <span>{text.hero.trustStrip}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Greek Compliance Bar */}
      <section id="compliance" className="py-12 bg-gray-50 dark:bg-gray-800" data-lazy-section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            {text.compliance.title}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: 'ergani', title: text.compliance.ergani, desc: text.compliance.erganiDesc, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
              { key: 'digitalCard', title: text.compliance.digitalCard, desc: text.compliance.digitalCardDesc, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
              { key: 'apdFmy', title: text.compliance.apdFmy, desc: text.compliance.apdFmyDesc, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
              { key: 'sepe', title: text.compliance.sepe, desc: text.compliance.sepeDesc, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
            ].map((item) => (
              <Card key={item.key} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <Badge className={`${item.color} mb-3`}>
                    {item.title}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Value Cards */}
      <section id="value-cards" className="py-20 bg-white dark:bg-gray-900" data-lazy-section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {Object.entries(text.valueCards).map(([key, card], index) => (
              <Card key={key} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 dark:hover:border-blue-800">
                <CardContent className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {key === 'automation' && <Zap className="h-6 w-6" />}
                        {key === 'timeSync' && <Clock className="h-6 w-6" />}
                        {key === 'selfService' && <Users className="h-6 w-6" />}
                        {key === 'integrations' && <Building2 className="h-6 w-6" />}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        {card.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {card.desc}
                      </p>
                      <ul className="space-y-2">
                        {card.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Integrations Row */}
          <div className="mt-16">
            <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-8">
              Works with your favorite tools
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              {integrationLogos.map((integration, index) => (
                <div key={index} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {integration.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50 dark:bg-gray-800" data-lazy-section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {text.howItWorks.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              {text.howItWorks.subtitle}
            </p>
            <Button 
              variant="outline" 
              onClick={() => handleCtaClick('demo')}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Play className="mr-2 h-4 w-4" />
              {text.howItWorks.demoButton}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {text.howItWorks.steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {step.desc}
                  </p>
                </div>
                
                {index < text.howItWorks.steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full transform -translate-y-1/2 w-full">
                    <ArrowRight className="h-6 w-6 text-gray-400 mx-auto" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="social-proof" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {text.socialProof.title}
            </h2>
            
            {/* Customer Logos */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-12 opacity-60">
              {customerLogos.map((logo, index) => (
                <div key={index} className="text-gray-600 dark:text-gray-400 font-medium">
                  {logo}
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {text.socialProof.testimonials.map((testimonial, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 dark:text-gray-300 mb-4 italic">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="border-t pt-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.author}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.title}, {testimonial.company}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Award */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-full">
              <Award className="h-5 w-5" />
              <span className="font-medium">{text.socialProof.awards}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="py-20 bg-blue-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {text.pricing.title}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            {text.pricing.subtitle}
          </p>
          
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">€29</div>
                <div className="text-gray-600 dark:text-gray-400">/month per company</div>
              </div>
              <div className="text-gray-400">+</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">€3</div>
                <div className="text-gray-600 dark:text-gray-400">/month per employee</div>
              </div>
            </div>
            
            <ul className="space-y-2 mb-8">
              {text.pricing.features.map((feature, index) => (
                <li key={index} className="flex items-center justify-center text-gray-700 dark:text-gray-300">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
            
            <Button 
              onClick={() => handleCtaClick('pricing')}
              variant="outline"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              {text.pricing.cta}
            </Button>
          </div>
        </div>
      </section>

      {/* Security & Reliability */}
      <section id="security" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {text.security.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {text.security.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {text.security.features.map((feature, index) => (
              <Card key={index} className="text-center group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {text.finalCta.title}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {text.finalCta.subtitle}
          </p>
          
          <Button 
            size="lg"
            onClick={() => handleCtaClick('start_free')}
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3 mb-4"
          >
            {text.finalCta.cta}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <div className="text-sm opacity-75">
            {text.finalCta.guarantee}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="font-bold text-xl">PayrollSync</span>
              </div>
              <p className="text-gray-400 text-sm">
                Modern payroll for Greek businesses. ERGANI II compliant, tax automated, SEPA ready.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#value-cards" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#security" className="hover:text-white">Security</a></li>
                <li><a href="/integrations" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/about" className="hover:text-white">About</a></li>
                <li><a href="/blog" className="hover:text-white">Blog</a></li>
                <li><a href="/careers" className="hover:text-white">Careers</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/legal/terms" className="hover:text-white">Terms of Service</a></li>
                <li><a href="/legal/privacy" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="/legal/gdpr" className="hover:text-white">GDPR Compliance</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 PayrollSync. All rights reserved. Made in Greece 🇬🇷
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <a href="tel:+302101234567" className="text-gray-400 hover:text-white">
                <Phone className="h-5 w-5" />
              </a>
              <a href="https://wa.me/302101234567" className="text-gray-400 hover:text-white">
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  PayrollSync Demo
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => setShowDemoModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Play className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Interactive demo coming soon</p>
                  <p className="text-sm text-gray-500 mt-2">Book a live demo with our team</p>
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Demo Call
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Intent Modal */}
      {showExitIntent && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {text.exitIntent.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {text.exitIntent.subtitle}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowExitIntent(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder={text.exitIntent.emailPlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <div className="flex space-x-3">
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      trackEvent('exit_intent_signup', { locale: currentLocale });
                      setShowExitIntent(false);
                    }}
                  >
                    {text.exitIntent.cta}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowExitIntent(false)}
                  >
                    {text.exitIntent.close}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}