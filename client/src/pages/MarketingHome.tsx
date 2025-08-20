/**
 * Marketing Landing Page
 * Bilingual EN/EL marketing site with language toggle
 */

import { useTranslation } from '@/hooks/useLanguage';
import { LanguageToggle } from '@/components/marketing/LanguageToggle';
import { Link } from 'wouter';
import {
  Clock,
  FileCheck,
  Zap,
  BarChart3,
  Lock,
  Puzzle,
  Shield,
  Star,
  ArrowRight,
  CheckCircle,
  Play,
} from 'lucide-react';

const marketingContent = {
  seo: {
    title_en: "Next-Gen Greek Payroll — Digital Work Card, ERGANI II, APD/ΦΜΥ, Instant SEPA",
    title_el: "Επόμενης Γενιάς Μισθοδοσία — Ψηφιακή Κάρτα, ΕΡΓΑΝΗ ΙΙ, ΑΠΔ/ΦΜΥ, Άμεσα SEPA",
  },
  navbar: {
    links: [
      { label_en: "Product", label_el: "Προϊόν", href: "#product" },
      { label_en: "Pricing", label_el: "Τιμολόγηση", href: "#pricing" },
      { label_en: "Security", label_el: "Ασφάλεια", href: "/security" },
      { label_en: "Contact", label_el: "Επικοινωνία", href: "#contact" },
    ],
    ctas: [
      { id: "signup", label_en: "Start free trial", label_el: "Έναρξη δωρεάν δοκιμής", href: "/signup" },
      { id: "demo", label_en: "Book a demo", label_el: "Κλείστε demo", href: "/contact" },
    ],
  },
  hero: {
    headline_en: "Payroll built for Greece. Fast. Compliant. Instant.",
    headline_el: "Μισθοδοσία σχεδιασμένη για την Ελλάδα. Γρήγορη. Συμμορφωμένη. Άμεση.",
    subhead_en: "Run payroll in minutes with Digital Work Card, ERGANI II, APD/ΦΜΥ automation and instant euro payouts.",
    subhead_el: "Ολοκληρώστε μισθοδοσία σε λίγα λεπτά με Ψηφιακή Κάρτα, ΕΡΓΑΝΗ ΙΙ, ΑΠΔ/ΦΜΥ και άμεσες πληρωμές σε ευρώ.",
  },
  socialProof: [
    { value: "99.5%", label_en: "filing success (ERGANI/APD/ΦΜΥ)", label_el: "επιτυχία δηλώσεων (ΕΡΓΑΝΗ/ΑΠΔ/ΦΜΥ)" },
    { value: "< 15 min", label_en: "end-to-end payroll run", label_el: "ολοκλήρωση μισθοδοσίας" },
    { value: "10s", label_en: "instant payout target (SCT Inst)", label_el: "στόχος άμεσης πληρωμής (SCT Inst)" },
  ],
  features: [
    {
      icon: Clock,
      title_en: "Digital Work Card in real time",
      title_el: "Ψηφιακή Κάρτα σε πραγματικό χρόνο",
      desc_en: "Live punches, exception workflows, and automatic ERGANI II events.",
      desc_el: "Ζωντανές καταγραφές, ροές εξαιρέσεων και αυτόματες δηλώσεις ΕΡΓΑΝΗ ΙΙ.",
    },
    {
      icon: FileCheck,
      title_en: "APD & FMY automation",
      title_el: "Αυτοματοποίηση ΑΠΔ & ΦΜΥ",
      desc_en: "Build, validate, submit and store receipts for e-EFKA/APD and AADE/FMY.",
      desc_el: "Δημιουργία, έλεγχος, υποβολή και αποθήκευση αποδεικτικών για e-ΕΦΚΑ/ΑΠΔ και ΑΑΔΕ/ΦΜΥ.",
    },
    {
      icon: Zap,
      title_en: "Instant payouts (SCT Inst)",
      title_el: "Άμεσες πληρωμές (SCT Inst)",
      desc_en: "Handle off-cycle fixes with instant euro transfers; auto-fallback to standard SCT.",
      desc_el: "Διαχειριστείτε διορθώσεις εκτός κύκλου με άμεσες μεταφορές ευρώ· αυτόματη εναλλακτική σε τυπικό SCT.",
    },
    {
      icon: BarChart3,
      title_en: "Analytics & forecasting",
      title_el: "Αναλύσεις & προβλέψεις",
      desc_en: "Overtime, night/Sunday premiums, labor vs budget, tip pooling and more.",
      desc_el: "Υπερωρίες, νυχτερινά/Κυριακές, κόστος vs προϋπολογισμός, ταμείο φιλοδωρημάτων κ.ά.",
    },
    {
      icon: Lock,
      title_en: "Security & compliance",
      title_el: "Ασφάλεια & συμμόρφωση",
      desc_en: "SOC-ready controls, MFA/SSO, audit logs, GDPR and pay-transparency support.",
      desc_el: "Έλεγχοι επιπέδου SOC, MFA/SSO, ημερολόγια ενεργειών, GDPR και υποστήριξη pay transparency.",
    },
    {
      icon: Puzzle,
      title_en: "Open integrations",
      title_el: "Ανοικτές διασυνδέσεις",
      desc_en: "Native Xero/QBO connectors and a developer-grade GL API—no CSVs.",
      desc_el: "Έτοιμες συνδέσεις με Xero/QBO και GL API για προγραμματιστές—χωρίς CSV.",
    },
  ],
  pricing: {
    title_en: "Simple, transparent pricing",
    title_el: "Απλή, διαφανής τιμολόγηση",
    plans: [
      {
        name_en: "Starter",
        name_el: "Starter",
        price: "€19/user/mo",
        features_en: ["Payroll runs", "Digital Work Card", "ERGANI/APD/ΦΜΥ exports"],
        features_el: ["Κύκλοι μισθοδοσίας", "Ψηφιακή Κάρτα", "Εξαγωγές ΕΡΓΑΝΗ/ΑΠΔ/ΦΜΥ"],
        cta: "/signup",
      },
      {
        name_en: "Growth",
        name_el: "Growth",
        price: "€49/user/mo",
        features_en: ["APD/ΦΜΥ submit", "SEPA files", "Xero/QBO connector"],
        features_el: ["Υποβολή ΑΠΔ/ΦΜΥ", "Αρχεία SEPA", "Σύνδεση Xero/QBO"],
        cta: "/signup",
        popular: true,
      },
      {
        name_en: "Scale",
        name_el: "Scale",
        price_en: "Talk to us",
        price_el: "Επικοινωνήστε μαζί μας",
        features_en: ["Instant payouts cockpit", "GL API", "SLA & dedicated support"],
        features_el: ["Cockpit άμεσων πληρωμών", "GL API", "SLA & υποστήριξη"],
        cta: "/contact",
      },
    ],
  },
};

export default function MarketingHome() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                PayrollSync
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {marketingContent.navbar.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {t({ link: link.label_en, link_el: link.label_el })}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <LanguageToggle />
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t({
                  cta: marketingContent.navbar.ctas[0].label_en,
                  cta_el: marketingContent.navbar.ctas[0].label_el,
                })}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t({ hero: marketingContent.hero.headline_en, hero_el: marketingContent.hero.headline_el })}
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t({ sub: marketingContent.hero.subhead_en, sub_el: marketingContent.hero.subhead_el })}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {t({ try: "Try it free", try_el: "Δοκιμάστε δωρεάν" })}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Play className="w-5 h-5" />
                {t({ watch: "Watch 2-min tour", watch_el: "Δείτε το 2-λεπτο βίντεο" })}
              </button>
            </div>

            {/* Trust Logos */}
            <div className="mt-16 flex justify-center items-center gap-8 opacity-60">
              <div className="text-sm font-medium">Xero</div>
              <div className="text-sm font-medium">QuickBooks</div>
              <div className="text-sm font-medium">Piraeus Bank</div>
              <div className="text-sm font-medium">NBG</div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {marketingContent.socialProof.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">
                  {t({ stat: stat.label_en, stat_el: stat.label_el })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="product" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t({
                features: "Everything you need to run Greek payroll",
                features_el: "Ό,τι χρειάζεστε για μισθοδοσία στην Ελλάδα",
              })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {marketingContent.features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {t({ title: feature.title_en, title_el: feature.title_el })}
                  </h3>
                  <p className="text-gray-600">
                    {t({ desc: feature.desc_en, desc_el: feature.desc_el })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t({ security: "Security & Trust", security_el: "Ασφάλεια & Εμπιστοσύνη" })}
              </h2>
              <ul className="space-y-4 mb-8">
                {[
                  {
                    en: "MFA, SSO (OIDC/SAML), role-based access",
                    el: "MFA, SSO (OIDC/SAML), πρόσβαση βάσει ρόλων",
                  },
                  {
                    en: "Encryption in transit & at rest, secrets in KMS/Vault",
                    el: "Κρυπτογράφηση σε μεταφορά & αποθήκευση, μυστικά σε KMS/Vault",
                  },
                  {
                    en: "Immutable audit logs; inspector packs on demand",
                    el: "Αμετάβλητα logs· φάκελοι επιθεώρησης κατ' απαίτηση",
                  },
                  {
                    en: "GDPR compliance with data residency in EU",
                    el: "Συμμόρφωση GDPR με αποθήκευση δεδομένων στην ΕΕ",
                  },
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{t({ sec: item.en, sec_el: item.el })}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/security"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                {t({
                  read: "Read our Security Overview",
                  read_el: "Διαβάστε τη σελίδα Ασφάλειας",
                })}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl">
              <Shield className="w-16 h-16 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {t({ trust: "Enterprise-grade security", trust_el: "Ασφάλεια επιχειρηματικού επιπέδου" })}
              </h3>
              <p className="text-gray-600">
                {t({
                  desc: "Built with security-first principles and compliance frameworks that meet the highest standards for financial data protection.",
                  desc_el: "Κατασκευασμένο με αρχές προτεραιότητας ασφάλειας και πλαίσια συμμόρφωσης που ικανοποιούν τα υψηλότερα πρότυπα για προστασία οικονομικών δεδομένων.",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t({
                pricing: marketingContent.pricing.title_en,
                pricing_el: marketingContent.pricing.title_el,
              })}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {marketingContent.pricing.plans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white p-8 rounded-2xl shadow-sm ${
                  plan.popular ? 'ring-2 ring-blue-600 relative' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {t({ popular: "Most Popular", popular_el: "Πιο Δημοφιλής" })}
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t({ name: plan.name_en, name_el: plan.name_el })}
                </h3>
                <div className="text-3xl font-bold text-gray-900 mb-6">
                  {plan.price_en ? t({ price: plan.price_en, price_el: plan.price_el! }) : plan.price}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features_en.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600">
                        {t({ feature, feature_el: plan.features_el[featureIndex] })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.cta}
                  className={`block w-full text-center py-3 px-6 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {t({
                    get_started: "Get started",
                    get_started_el: "Ξεκινήστε",
                    contact: "Contact us",
                    contact_el: "Επικοινωνήστε",
                  })}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t({
              ready: "Ready to modernize your Greek payroll?",
              ready_el: "Έτοιμοι να εκσυγχρονίσετε την ελληνική σας μισθοδοσία;",
            })}
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            {t({
              contact_desc: "Join hundreds of Greek businesses who trust PayrollSync for their payroll needs.",
              contact_desc_el: "Συμμετέχετε σε εκατοντάδες ελληνικές επιχειρήσεις που εμπιστεύονται το PayrollSync για τις ανάγκες μισθοδοσίας τους.",
            })}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              {t({ start: "Start free trial", start_el: "Έναρξη δωρεάν δοκιμής" })}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/contact"
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center justify-center"
            >
              {t({ schedule: "Schedule a demo", schedule_el: "Κλείστε μια επίδειξη" })}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">PayrollSync</h3>
              <p className="text-gray-400">
                {t({
                  footer: "Modern payroll platform built specifically for Greek businesses.",
                  footer_el: "Σύγχρονη πλατφόρμα μισθοδοσίας κατασκευασμένη ειδικά για ελληνικές επιχειρήσεις.",
                })}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t({ product: "Product", product_el: "Προϊόν" })}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">{t({ features: "Features", features_el: "Χαρακτηριστικά" })}</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">{t({ pricing: "Pricing", pricing_el: "Τιμολόγηση" })}</a></li>
                <li><Link href="/security" className="hover:text-white transition-colors">{t({ security: "Security", security_el: "Ασφάλεια" })}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t({ company: "Company", company_el: "Εταιρεία" })}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/contact" className="hover:text-white transition-colors">{t({ about: "About", about_el: "Σχετικά" })}</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">{t({ contact: "Contact", contact_el: "Επικοινωνία" })}</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">{t({ support: "Support", support_el: "Υποστήριξη" })}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t({ legal: "Legal", legal_el: "Νομικά" })}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">{t({ privacy: "Privacy Policy", privacy_el: "Πολιτική Απορρήτου" })}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t({ terms: "Terms of Service", terms_el: "Όροι Χρήσης" })}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
            <p>&copy; 2025 PayrollSync. {t({ rights: "All rights reserved.", rights_el: "Όλα τα δικαιώματα διατηρούνται." })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}