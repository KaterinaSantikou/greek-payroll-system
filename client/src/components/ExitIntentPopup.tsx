/**
 * Exit-Intent Popup - Capture visitors before they leave
 * Detects exit intent behavior and shows retention popup
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  Gift, 
  Mail, 
  Phone, 
  Calendar, 
  Star, 
  Zap,
  ArrowRight,
  Clock
} from 'lucide-react';

interface ExitIntentPopupProps {
  locale?: 'en' | 'el';
  variant?: 'trial' | 'demo' | 'newsletter' | 'support' | 'discount';
  enabled?: boolean;
  delay?: number; // Minimum time on page before showing (seconds)
  onCapture?: (data: any) => void;
}

export default function ExitIntentPopup({ 
  locale = 'en', 
  variant = 'trial',
  enabled = true,
  delay = 10,
  onCapture 
}: ExitIntentPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);

  const { toast } = useToast();

  const translations = {
    en: {
      trial: {
        title: "Wait! Don't Leave Yet! 🚀",
        subtitle: "Start Your Free 30-Day Trial",
        description: "See why 1,000+ Greek businesses trust PayrollSync for their HR & payroll needs. No credit card required.",
        cta: "Start Free Trial",
        secondary: "Schedule Demo Instead",
        features: ["Greek labor law compliance", "ERGANI II integration", "30-day free trial", "Expert support"]
      },
      demo: {
        title: "Before You Go... 📅",
        subtitle: "See PayrollSync in Action",
        description: "Get a personalized demo and see how PayrollSync can save you 10+ hours per month on payroll.",
        cta: "Book Free Demo",
        secondary: "Download Brochure",
        features: ["15-minute demo", "Personalized for your business", "Greek compliance walkthrough", "No sales pressure"]
      },
      newsletter: {
        title: "Stay Updated! 📧",
        subtitle: "Greek HR & Payroll Updates",
        description: "Get monthly updates on Greek labor law changes, payroll tips, and compliance alerts.",
        cta: "Subscribe Now",
        secondary: "Maybe Later",
        features: ["Monthly labor law updates", "Payroll best practices", "Compliance alerts", "Industry insights"]
      },
      support: {
        title: "Need Help? 🆘",
        subtitle: "Talk to a Greek Payroll Expert",
        description: "Our certified Greek payroll specialists are here to answer your questions.",
        cta: "Get Free Consultation",
        secondary: "Browse Help Center",
        features: ["Certified payroll experts", "Greek labor law specialists", "Free consultation", "Same-day response"]
      },
      discount: {
        title: "Special Offer! 💰",
        subtitle: "50% Off Your First 3 Months",
        description: "Limited time offer for new PayrollSync customers. Transform your Greek payroll today!",
        cta: "Claim Discount",
        secondary: "Learn More",
        features: ["50% discount", "All premium features", "Priority support", "Cancel anytime"]
      },
      common: {
        close: "Close",
        email: "Business Email",
        phone: "Phone (Optional)",
        company: "Company Name",
        submitting: "Processing...",
        success: "Thank you! We'll be in touch soon.",
        error: "Something went wrong. Please try again.",
        privacy: "We respect your privacy. Unsubscribe anytime.",
        timeLeft: "Limited time offer",
        trusted: "Trusted by 1,000+ Greek businesses"
      }
    },
    el: {
      trial: {
        title: "Περιμένετε! Μην Φύγετε Ακόμα! 🚀",
        subtitle: "Ξεκινήστε τη Δωρεάν Δοκιμή 30 Ημερών",
        description: "Δείτε γιατί 1.000+ ελληνικές επιχειρήσεις εμπιστεύονται το PayrollSync για τις ανάγκες HR & μισθοδοσίας τους.",
        cta: "Δωρεάν Δοκιμή",
        secondary: "Προγραμματίστε Demo",
        features: ["Συμμόρφωση ελληνικού εργατικού δικαίου", "Ενσωμάτωση ΕΡΓΑΝΗ ΙΙ", "Δωρεάν δοκιμή 30 ημερών", "Εξειδικευμένη υποστήριξη"]
      },
      demo: {
        title: "Πριν Φύγετε... 📅",
        subtitle: "Δείτε το PayrollSync σε Δράση",
        description: "Λάβετε ένα εξατομικευμένο demo και δείτε πώς το PayrollSync μπορεί να σας εξοικονομήσει 10+ ώρες το μήνα.",
        cta: "Κλείστε Δωρεάν Demo",
        secondary: "Κατεβάστε Ενημερωτικό",
        features: ["Demo 15 λεπτών", "Εξατομικευμένο για την επιχείρησή σας", "Παρουσίαση ελληνικής συμμόρφωσης", "Χωρίς πιέσεις πώλησης"]
      },
      newsletter: {
        title: "Μείνετε Ενημερωμένοι! 📧",
        subtitle: "Ενημερώσεις Ελληνικού HR & Μισθοδοσίας",
        description: "Λαμβάνετε μηνιαίες ενημερώσεις για αλλαγές στο ελληνικό εργατικό δίκαιο και συμβουλές μισθοδοσίας.",
        cta: "Εγγραφή Τώρα",
        secondary: "Ίσως Αργότερα",
        features: ["Μηνιαίες ενημερώσεις νόμων", "Βέλτιστες πρακτικές μισθοδοσίας", "Ειδοποιήσεις συμμόρφωσης", "Κλαδικές αναλύσεις"]
      },
      support: {
        title: "Χρειάζεστε Βοήθεια; 🆘",
        subtitle: "Μιλήστε με Εξειδικευμένο Ελληνικής Μισθοδοσίας",
        description: "Οι πιστοποιημένοι ειδικοί ελληνικής μισθοδοσίας μας είναι εδώ για να απαντήσουν τις ερωτήσεις σας.",
        cta: "Δωρεάν Συμβουλευτική",
        secondary: "Κέντρο Βοήθειας",
        features: ["Πιστοποιημένοι ειδικοί", "Ειδικοί ελληνικού εργατικού δικαίου", "Δωρεάν συμβουλευτική", "Απάντηση ίδια μέρα"]
      },
      discount: {
        title: "Ειδική Προσφορά! 💰",
        subtitle: "50% Έκπτωση στους Πρώτους 3 Μήνες",
        description: "Περιορισμένη προσφορά για νέους πελάτες PayrollSync. Μεταμορφώστε την ελληνική σας μισθοδοσία σήμερα!",
        cta: "Διεκδίκηση Έκπτωσης",
        secondary: "Μάθετε Περισσότερα",
        features: ["50% έκπτωση", "Όλες οι premium δυνατότητες", "Προτεραιότητα υποστήριξης", "Ακύρωση ανά πάσα στιγμή"]
      },
      common: {
        close: "Κλείσιμο",
        email: "Επιχειρηματικό Email",
        phone: "Τηλέφωνο (Προαιρετικό)",
        company: "Όνομα Εταιρείας",
        submitting: "Επεξεργασία...",
        success: "Ευχαριστούμε! Θα επικοινωνήσουμε σύντομα.",
        error: "Κάτι πήγε στραβά. Προσπαθήστε ξανά.",
        privacy: "Σεβόμαστε την ιδιωτικότητά σας. Κατάργηση εγγραφής ανά πάσα στιγμή.",
        timeLeft: "Περιορισμένη προσφορά",
        trusted: "Εμπιστεύονται 1.000+ ελληνικές επιχειρήσεις"
      }
    }
  };

  const t = translations[locale];
  const content = t[variant];

  // Track time on page
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnPage(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Exit intent detection
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (!enabled || hasShown || isOpen || timeOnPage < delay) return;
    
    // Detect if mouse is moving towards the top of the viewport (exit intent)
    if (e.clientY <= 10 && e.movementY < 0) {
      setIsOpen(true);
      setHasShown(true);
    }
  }, [enabled, hasShown, isOpen, timeOnPage, delay]);

  // Mobile exit intent (back button, tab switch)
  const handleVisibilityChange = useCallback(() => {
    if (!enabled || hasShown || isOpen || timeOnPage < delay) return;
    
    if (document.hidden) {
      // User is switching tabs or minimizing - show popup when they return
      setTimeout(() => {
        if (!document.hidden && !hasShown) {
          setIsOpen(true);
          setHasShown(true);
        }
      }, 100);
    }
  }, [enabled, hasShown, isOpen, timeOnPage, delay]);

  useEffect(() => {
    if (!enabled) return;

    // Desktop exit intent
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Mobile/tablet exit intent
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleMouseLeave, handleVisibilityChange, enabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);

    try {
      // In production, this would submit to your CRM/email service
      const captureData = {
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        variant,
        locale,
        timeOnPage,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Exit intent capture:', captureData);

      if (onCapture) {
        onCapture(captureData);
      }

      toast({
        title: t.common.success,
        variant: 'default'
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: t.common.error,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!enabled || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header with close button */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {content.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200">
                  <Clock className="h-3 w-3 mr-1" />
                  {t.common.timeLeft}
                </Badge>
                {variant === 'discount' && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    50% OFF
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                {content.subtitle}
              </h3>
              <DialogDescription className="text-gray-600 dark:text-gray-400 mb-4">
                {content.description}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="ml-2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Features list */}
        <div className="space-y-2 mb-6">
          {content.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder={t.common.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
              disabled={isSubmitting}
            />
          </div>
          
          {(variant === 'demo' || variant === 'support') && (
            <>
              <div>
                <Input
                  type="text"
                  placeholder={t.common.company}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Input
                  type="tel"
                  placeholder={t.common.phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!email.trim() || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t.common.submitting}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {variant === 'trial' && <Zap className="h-4 w-4" />}
                  {variant === 'demo' && <Calendar className="h-4 w-4" />}
                  {variant === 'newsletter' && <Mail className="h-4 w-4" />}
                  {variant === 'support' && <Phone className="h-4 w-4" />}
                  {variant === 'discount' && <Gift className="h-4 w-4" />}
                  {content.cta}
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="w-full"
          >
            {content.secondary}
          </Button>
        </form>

        {/* Trust indicators */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{t.common.trusted}</span>
          </div>
          <p className="text-xs text-center text-gray-400 dark:text-gray-500">
            {t.common.privacy}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}