/**
 * Automated Training Demo Page
 * Showcase of the personalized learning system for Greek payroll
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AutomatedTraining from '@/components/AutomatedTraining';
import {
  GraduationCap,
  Brain,
  Users,
  Target,
  Zap,
  BookOpen,
  TrendingUp,
  Award,
  Globe,
  ChevronRight,
  Clock,
  Star,
  CheckCircle,
  Lightbulb,
  Shield,
  Calculator
} from 'lucide-react';

interface DemoProps {
  locale?: 'en' | 'el';
}

export default function AutomatedTrainingDemo({ locale = 'en' }: DemoProps) {
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'el'>(locale);
  const [selectedRole, setSelectedRole] = useState('HR Professional');
  const [selectedExperience, setSelectedExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [showFullSystem, setShowFullSystem] = useState(false);

  const translations = {
    en: {
      title: 'Automated Training System',
      subtitle: 'Personalized Learning Paths for Greek Payroll Excellence',
      hero: {
        title: 'AI-Powered Learning That Adapts to You',
        subtitle: 'Revolutionary training system that creates personalized learning paths based on your role, experience level, and learning progress. Master complex Greek payroll processes through intelligent, adaptive education.',
        cta: 'Launch Training System',
        ctaSecondary: 'Explore Features'
      },
      features: {
        title: 'Intelligent Training Features',
        personalized: {
          title: 'Personalized Paths',
          description: 'AI creates custom learning journeys based on your role, experience, and progress patterns.'
        },
        adaptive: {
          title: 'Adaptive Content',
          description: 'Training automatically adjusts difficulty and pace based on your learning performance.'
        },
        practical: {
          title: 'Practical Exercises',
          description: 'Hands-on training with real Greek payroll scenarios and interactive simulations.'
        },
        certification: {
          title: 'Certification Ready',
          description: 'Structured paths prepare you for Greek payroll certifications and professional recognition.'
        }
      },
      benefits: {
        title: 'Why Automated Training Revolutionizes Greek Payroll Education',
        efficiency: {
          title: 'Accelerated Learning',
          description: 'AI-driven personalization reduces training time by 60% while improving knowledge retention and practical application.'
        },
        compliance: {
          title: 'Always Current',
          description: 'Content automatically updates with latest Greek regulations, ensuring your knowledge stays compliant and accurate.'
        },
        scalability: {
          title: 'Organization-Wide',
          description: 'Scale training across your entire organization with role-based paths and progress tracking for every team member.'
        }
      },
      trainingAreas: {
        title: 'Comprehensive Training Coverage',
        fundamentals: 'Greek Payroll Fundamentals',
        compliance: 'Government Compliance (ERGANI II, e-EFKA, AADE)',
        calculations: 'Advanced Payroll Calculations',
        banking: 'SEPA Banking & Payments',
        legal: 'Labor Law & Collective Agreements',
        industry: 'Industry-Specific Applications',
        systems: 'System Integration & Automation',
        management: 'Payroll Management & Leadership'
      },
      learningFormats: {
        title: 'Diverse Learning Formats',
        video: 'Interactive Video Lessons',
        practical: 'Hands-On Exercises',
        reading: 'Comprehensive Reading Materials',
        quiz: 'Knowledge Assessment Quizzes',
        simulation: 'Real-World Simulations',
        discussion: 'Peer Discussion Forums'
      },
      performance: {
        title: 'Training Performance Metrics',
        completion: 'Course Completion Rate',
        satisfaction: 'Learner Satisfaction',
        retention: 'Knowledge Retention',
        timeToCompetency: 'Time to Competency'
      },
      customization: {
        title: 'Experience the Personalized System',
        description: 'Customize the demo to see how the training system adapts to different roles and experience levels.',
        role: 'Select Role',
        experience: 'Experience Level',
        launch: 'Launch Personalized Demo'
      },
      roles: {
        'HR Professional': 'HR Professional',
        'Payroll Specialist': 'Payroll Specialist',
        'Manager': 'Manager',
        'Hotel Specialist': 'Hotel Specialist'
      },
      experiences: {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced'
      }
    },
    el: {
      title: 'Σύστημα Αυτοματοποιημένης Εκπαίδευσης',
      subtitle: 'Εξατομικευμένες Μαθησιακές Διαδρομές για Αριστεία στην Ελληνική Μισθοδοσία',
      hero: {
        title: 'Μάθηση με Τεχνητή Νοημοσύνη που Προσαρμόζεται σε Εσάς',
        subtitle: 'Επαναστατικό σύστημα εκπαίδευσης που δημιουργεί εξατομικευμένες μαθησιακές διαδρομές βάσει του ρόλου, του επιπέδου εμπειρίας και της μαθησιακής προόδου σας. Κυριαρχήστε σε περίπλοκες ελληνικές διαδικασίες μισθοδοσίας μέσω έξυπνης, προσαρμοστικής εκπαίδευσης.',
        cta: 'Εκκίνηση Συστήματος Εκπαίδευσης',
        ctaSecondary: 'Εξερεύνηση Χαρακτηριστικών'
      },
      features: {
        title: 'Έξυπνα Χαρακτηριστικά Εκπαίδευσης',
        personalized: {
          title: 'Εξατομικευμένες Διαδρομές',
          description: 'Η AI δημιουργεί προσαρμοσμένα μαθησιακά ταξίδια βάσει του ρόλου, της εμπειρίας και των προτύπων προόδου σας.'
        },
        adaptive: {
          title: 'Προσαρμοστικό Περιεχόμενο',
          description: 'Η εκπαίδευση προσαρμόζεται αυτόματα στη δυσκολία και τον ρυθμό βάσει της μαθησιακής σας απόδοσης.'
        },
        practical: {
          title: 'Πρακτικές Ασκήσεις',
          description: 'Πρακτική εκπαίδευση με πραγματικά ελληνικά σενάρια μισθοδοσίας και διαδραστικές προσομοιώσεις.'
        },
        certification: {
          title: 'Έτοιμο για Πιστοποίηση',
          description: 'Δομημένες διαδρομές σας προετοιμάζουν για πιστοποιήσεις ελληνικής μισθοδοσίας και επαγγελματική αναγνώριση.'
        }
      },
      benefits: {
        title: 'Γιατί η Αυτοματοποιημένη Εκπαίδευση Επαναστατεί την Ελληνική Εκπαίδευση Μισθοδοσίας',
        efficiency: {
          title: 'Επιταχυνόμενη Μάθηση',
          description: 'Η εξατομίκευση με AI μειώνει τον χρόνο εκπαίδευσης κατά 60% βελτιώνοντας παράλληλα τη διατήρηση γνώσεων και την πρακτική εφαρμογή.'
        },
        compliance: {
          title: 'Πάντα Ενημερωμένο',
          description: 'Το περιεχόμενο ενημερώνεται αυτόματα με τους τελευταίους ελληνικούς κανονισμούς, διασφαλίζοντας ότι οι γνώσεις σας παραμένουν συμβατές και ακριβείς.'
        },
        scalability: {
          title: 'Σε Όλο τον Οργανισμό',
          description: 'Κλιμάκωση εκπαίδευσης σε όλο τον οργανισμό με διαδρομές βάσει ρόλων και παρακολούθηση προόδου για κάθε μέλος της ομάδας.'
        }
      },
      trainingAreas: {
        title: 'Περιεκτική Κάλυψη Εκπαίδευσης',
        fundamentals: 'Βασικά Ελληνικής Μισθοδοσίας',
        compliance: 'Κυβερνητική Συμμόρφωση (ΕΡΓΑΝΗ ΙΙ, e-ΕΦΚΑ, ΑΑΔΕ)',
        calculations: 'Προχωρημένοι Υπολογισμοί Μισθοδοσίας',
        banking: 'Τραπεζικές Υπηρεσίες SEPA & Πληρωμές',
        legal: 'Εργατικό Δίκαιο & Συλλογικές Συμβάσεις',
        industry: 'Κλαδικές Εφαρμογές',
        systems: 'Ενσωμάτωση Συστημάτων & Αυτοματισμός',
        management: 'Διαχείριση Μισθοδοσίας & Ηγεσία'
      },
      learningFormats: {
        title: 'Ποικιλία Μαθησιακών Μορφών',
        video: 'Διαδραστικά Βίντεο Μαθήματα',
        practical: 'Πρακτικές Ασκήσεις',
        reading: 'Περιεκτικό Υλικό Ανάγνωσης',
        quiz: 'Κουίζ Αξιολόγησης Γνώσεων',
        simulation: 'Προσομοιώσεις Πραγματικού Κόσμου',
        discussion: 'Φόρουμ Συζήτησης με Συναδέλφους'
      },
      performance: {
        title: 'Μετρικές Απόδοσης Εκπαίδευσης',
        completion: 'Ποσοστό Ολοκλήρωσης Μαθήματος',
        satisfaction: 'Ικανοποίηση Μαθητών',
        retention: 'Διατήρηση Γνώσεων',
        timeToCompetency: 'Χρόνος μέχρι την Ικανότητα'
      },
      customization: {
        title: 'Δοκιμάστε το Εξατομικευμένο Σύστημα',
        description: 'Προσαρμόστε την επίδειξη για να δείτε πώς το σύστημα εκπαίδευσης προσαρμόζεται σε διαφορετικούς ρόλους και επίπεδα εμπειρίας.',
        role: 'Επιλογή Ρόλου',
        experience: 'Επίπεδο Εμπειρίας',
        launch: 'Εκκίνηση Εξατομικευμένης Επίδειξης'
      },
      roles: {
        'HR Professional': 'Επαγγελματίας HR',
        'Payroll Specialist': 'Ειδικός Μισθοδοσίας',
        'Manager': 'Μάνατζερ',
        'Hotel Specialist': 'Ειδικός Ξενοδοχείων'
      },
      experiences: {
        beginner: 'Αρχάριο',
        intermediate: 'Μεσαίο',
        advanced: 'Προχωρημένο'
      }
    }
  };

  const t = translations[selectedLocale];

  const trainingAreas = [
    { key: 'fundamentals', icon: BookOpen, color: 'text-blue-600' },
    { key: 'compliance', icon: Shield, color: 'text-green-600' },
    { key: 'calculations', icon: Calculator, color: 'text-purple-600' },
    { key: 'banking', icon: Target, color: 'text-orange-600' },
    { key: 'legal', icon: Award, color: 'text-red-600' },
    { key: 'industry', icon: Users, color: 'text-indigo-600' },
    { key: 'systems', icon: Zap, color: 'text-yellow-600' },
    { key: 'management', icon: TrendingUp, color: 'text-pink-600' }
  ];

  const learningFormats = [
    { key: 'video', icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
    { key: 'practical', icon: Target, color: 'bg-green-100 text-green-600' },
    { key: 'reading', icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
    { key: 'quiz', icon: Brain, color: 'bg-orange-100 text-orange-600' },
    { key: 'simulation', icon: Zap, color: 'bg-red-100 text-red-600' },
    { key: 'discussion', icon: Users, color: 'bg-indigo-100 text-indigo-600' }
  ];

  const performanceMetrics = [
    { key: 'completion', value: '94%', icon: CheckCircle, color: 'text-green-600' },
    { key: 'satisfaction', value: '4.8/5', icon: Star, color: 'text-yellow-600' },
    { key: 'retention', value: '87%', icon: Brain, color: 'text-blue-600' },
    { key: 'timeToCompetency', value: '40% faster', icon: Clock, color: 'text-purple-600' }
  ];

  if (showFullSystem) {
    return (
      <AutomatedTraining 
        locale={selectedLocale}
        userRole={selectedRole}
        experienceLevel={selectedExperience}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedLocale(selectedLocale === 'en' ? 'el' : 'en')}
              >
                <Globe className="h-4 w-4 mr-2" />
                {selectedLocale === 'en' ? 'EL' : 'EN'}
              </Button>
              <Button
                onClick={() => setShowFullSystem(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                {t.hero.cta}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Brain className="h-4 w-4" />
            AI-Powered Personalized Learning
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
              className="px-8 py-3 text-lg bg-purple-600 hover:bg-purple-700"
              onClick={() => setShowFullSystem(true)}
            >
              <GraduationCap className="h-5 w-5 mr-2" />
              {t.hero.cta}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-3 text-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Lightbulb className="h-5 w-5 mr-2" />
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t.performance.title}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {performanceMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${metric.color.replace('text-', 'text-')}`}>
                    {metric.value}
                  </div>
                  <div className="text-gray-300 flex items-center justify-center gap-2">
                    <Icon className="h-4 w-4" />
                    {t.performance[metric.key as keyof typeof t.performance]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.personalized.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.personalized.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.adaptive.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.adaptive.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.practical.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.practical.description}</p>
            </div>

            <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.features.certification.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.features.certification.description}</p>
            </div>
          </div>
        </div>

        {/* Training Areas */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.trainingAreas.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trainingAreas.map((area, index) => {
              const Icon = area.icon;
              return (
                <div key={index} className="p-6 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${area.color}`} />
                    <span className="font-medium text-sm">
                      {t.trainingAreas[area.key as keyof typeof t.trainingAreas]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Formats */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.learningFormats.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {learningFormats.map((format, index) => {
              const Icon = format.icon;
              return (
                <div key={index} className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                  <div className={`w-12 h-12 ${format.color} rounded-lg flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t.learningFormats[format.key as keyof typeof t.learningFormats]}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t.benefits.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.efficiency.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.efficiency.description}</p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.compliance.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.compliance.description}</p>
            </div>

            <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{t.benefits.scalability.title}</h3>
              <p className="text-gray-600 leading-relaxed">{t.benefits.scalability.description}</p>
            </div>
          </div>
        </div>

        {/* Customization Demo */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">{t.customization.title}</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            {t.customization.description}
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-md mx-auto">
            <div>
              <label className="block text-left text-purple-100 mb-2 font-medium">{t.customization.role}</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(t.roles).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-left text-purple-100 mb-2 font-medium">{t.customization.experience}</label>
              <Select value={selectedExperience} onValueChange={(value) => setSelectedExperience(value as any)}>
                <SelectTrigger className="bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(t.experiences).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            size="lg" 
            className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3"
            onClick={() => setShowFullSystem(true)}
          >
            <GraduationCap className="h-5 w-5 mr-2" />
            {t.customization.launch}
          </Button>
        </div>
      </div>
    </div>
  );
}