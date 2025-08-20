import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search,
  HelpCircle,
  FileText,
  Video,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  Star
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: {
    el: string;
    en: string;
  };
  content: {
    el: string;
    en: string;
  };
  category: 'payroll' | 'ergani' | 'efka' | 'general' | 'setup';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number;
  rating: number;
  views: number;
  lastUpdated: string;
  hasVideo: boolean;
  hasDownload: boolean;
}

interface FAQ {
  id: string;
  question: {
    el: string;
    en: string;
  };
  answer: {
    el: string;
    en: string;
  };
  category: string;
  popularity: number;
}

const helpArticles: HelpArticle[] = [
  {
    id: 'payroll-setup',
    title: {
      el: 'Ρύθμιση Μισθοδοσίας για Ελληνικές Επιχειρήσεις',
      en: 'Payroll Setup for Greek Companies'
    },
    content: {
      el: 'Πλήρης οδηγός για τη ρύθμιση μισθοδοσίας σύμφωνα με την ελληνική νομοθεσία. Περιλαμβάνει ρυθμίσεις ΕΦΚΑ, φορολογικές κλίμακες, και συλλογικές συμβάσεις.',
      en: 'Complete guide for setting up payroll according to Greek legislation. Includes EFKA settings, tax scales, and collective agreements.'
    },
    category: 'payroll',
    tags: ['εφκα', 'φορολογία', 'ρύθμιση'],
    difficulty: 'beginner',
    readTime: 15,
    rating: 4.8,
    views: 2847,
    lastUpdated: '2024-12-20',
    hasVideo: true,
    hasDownload: true
  },
  {
    id: 'ergani-integration',
    title: {
      el: 'Ενσωμάτωση ΕΡΓΑΝΗ II - Βήμα προς Βήμα',
      en: 'ERGANI II Integration - Step by Step'
    },
    content: {
      el: 'Αναλυτικές οδηγίες για την ενσωμάτωση του συστήματος με την ΕΡΓΑΝΗ II. Πιστοποιητικά, ψηφιακές κάρτες εργασίας, και αυτόματες δηλώσεις.',
      en: 'Detailed instructions for integrating the system with ERGANI II. Certificates, digital work cards, and automated declarations.'
    },
    category: 'ergani',
    tags: ['εργανη', 'ψηφιακές κάρτες', 'πιστοποιητικά'],
    difficulty: 'intermediate',
    readTime: 25,
    rating: 4.9,
    views: 1923,
    lastUpdated: '2024-12-18',
    hasVideo: true,
    hasDownload: false
  },
  {
    id: 'minimum-wage-2025',
    title: {
      el: 'Ενημέρωση Κατώτατου Μισθού 2025',
      en: 'Minimum Wage Update 2025'
    },
    content: {
      el: 'Οδηγίες για την εφαρμογή του νέου κατώτατου μισθού €830. Ενημέρωση συμβάσεων, επαναϋπολογισμός μισθοδοσίας, και δηλώσεις ΕΦΚΑ.',
      en: 'Instructions for implementing the new minimum wage of €830. Contract updates, payroll recalculation, and EFKA declarations.'
    },
    category: 'payroll',
    tags: ['κατώτατος μισθός', '2025', 'ενημέρωση'],
    difficulty: 'beginner',
    readTime: 10,
    rating: 4.7,
    views: 3621,
    lastUpdated: '2024-12-15',
    hasVideo: false,
    hasDownload: true
  },
  {
    id: 'digital-work-cards',
    title: {
      el: 'Ψηφιακές Κάρτες Εργασίας - Υλοποίηση',
      en: 'Digital Work Cards - Implementation'
    },
    content: {
      el: 'Πώς να ρυθμίσετε και να χρησιμοποιήσετε ψηφιακές κάρτες εργασίας. QR codes, NFC, mobile app, και συχρονισμός με ΕΡΓΑΝΗ II.',
      en: 'How to set up and use digital work cards. QR codes, NFC, mobile app, and synchronization with ERGANI II.'
    },
    category: 'ergani',
    tags: ['ψηφιακές κάρτες', 'qr', 'nfc', 'mobile'],
    difficulty: 'intermediate',
    readTime: 20,
    rating: 4.6,
    views: 1547,
    lastUpdated: '2024-12-10',
    hasVideo: true,
    hasDownload: false
  },
  {
    id: 'tax-calculations',
    title: {
      el: 'Υπολογισμοί Φορολογίας 2025',
      en: 'Tax Calculations 2025'
    },
    content: {
      el: 'Ενημερωμένοι υπολογισμοί φορολογίας για το 2025. Νέο αφορολόγητο όριο €9.100, κλίμακες, και ειδικές περιπτώσεις.',
      en: 'Updated tax calculations for 2025. New tax-free threshold €9.100, scales, and special cases.'
    },
    category: 'payroll',
    tags: ['φορολογία', 'αφορολόγητο', 'κλίμακες'],
    difficulty: 'advanced',
    readTime: 30,
    rating: 4.9,
    views: 2134,
    lastUpdated: '2024-12-05',
    hasVideo: false,
    hasDownload: true
  }
];

const faqs: FAQ[] = [
  {
    id: 'faq-001',
    question: {
      el: 'Πώς ενημερώνω τον κατώτατο μισθό για το 2025;',
      en: 'How do I update the minimum wage for 2025?'
    },
    answer: {
      el: 'Μεταβείτε στο Μισθοδοσία > Ρυθμίσεις > Κατώτατος Μισθός και ενημερώστε το ποσό σε €830. Το σύστημα θα επαναϋπολογίσει αυτόματα όλους τους μισθούς που επηρεάζονται.',
      en: 'Go to Payroll > Settings > Minimum Wage and update the amount to €830. The system will automatically recalculate all affected salaries.'
    },
    category: 'payroll',
    popularity: 95
  },
  {
    id: 'faq-002',
    question: {
      el: 'Γιατί αποτυγχάνει η υποβολή στην ΕΡΓΑΝΗ;',
      en: 'Why is my ERGANI submission failing?'
    },
    answer: {
      el: 'Συνήθως οφείλεται σε λάθος στοιχεία εργαζομένου (ΑΦΜ/ΑΜΚΑ) ή ληγμένα πιστοποιητικά. Ελέγξτε τα στοιχεία και ανανεώστε τα πιστοποιητικά από Ρυθμίσεις > ΕΡΓΑΝΗ > Πιστοποιητικά.',
      en: 'Usually due to incorrect employee data (AFM/AMKA) or expired certificates. Check the data and renew certificates from Settings > ERGANI > Certificates.'
    },
    category: 'ergani',
    popularity: 89
  },
  {
    id: 'faq-003',
    question: {
      el: 'Πώς λειτουργούν οι ψηφιακές κάρτες εργασίας;',
      en: 'How do digital work cards work?'
    },
    answer: {
      el: 'Οι εργαζόμενοι σαρώνουν QR code ή χρησιμοποιούν NFC για check-in/out. Τα δεδομένα στέλνονται αυτόματα στην ΕΡΓΑΝΗ II. Ρύθμιση: Ψηφιακές Κάρτες > Εγκατάσταση.',
      en: 'Employees scan QR code or use NFC for check-in/out. Data is automatically sent to ERGANI II. Setup: Digital Cards > Installation.'
    },
    category: 'ergani',
    popularity: 82
  },
  {
    id: 'faq-004',
    question: {
      el: 'Πώς υπολογίζονται οι εισφορές ΕΦΚΑ;',
      en: 'How are EFKA contributions calculated?'
    },
    answer: {
      el: 'Εργαζόμενος: 16%, Εργοδότης: 24.78%. Υπολογίζονται επί του μικτού μισθού. Για 2025 έχουν αυξηθεί κατά 0.2%. Ρυθμίσεις: Μισθοδοσία > Εισφορές ΕΦΚΑ.',
      en: 'Employee: 16%, Employer: 24.78%. Calculated on gross salary. For 2025 increased by 0.2%. Settings: Payroll > EFKA Contributions.'
    },
    category: 'efka',
    popularity: 76
  }
];

interface HelpCenterProps {
  defaultLanguage?: 'el' | 'en';
}

export default function HelpCenter({ defaultLanguage = 'el' }: HelpCenterProps) {
  const [language, setLanguage] = useState<'el' | 'en'>(defaultLanguage);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());

  const categories = [
    { value: 'all', label: { el: 'Όλα', en: 'All' } },
    { value: 'payroll', label: { el: 'Μισθοδοσία', en: 'Payroll' } },
    { value: 'ergani', label: { el: 'ΕΡΓΑΝΗ', en: 'ERGANI' } },
    { value: 'efka', label: { el: 'ΕΦΚΑ', en: 'EFKA' } },
    { value: 'setup', label: { el: 'Εγκατάσταση', en: 'Setup' } },
    { value: 'general', label: { el: 'Γενικά', en: 'General' } }
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = searchQuery === '' || 
      article.title[language].toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === '' ||
      faq.question[language].toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer[language].toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).sort((a, b) => b.popularity - a.popularity);

  const toggleFaq = (faqId: string) => {
    const newExpanded = new Set(expandedFaqs);
    if (newExpanded.has(faqId)) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
    }
    setExpandedFaqs(newExpanded);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      beginner: { el: 'Αρχάριος', en: 'Beginner' },
      intermediate: { el: 'Μέτριος', en: 'Intermediate' },
      advanced: { el: 'Προχωρημένος', en: 'Advanced' }
    };
    return labels[difficulty as keyof typeof labels]?.[language] || difficulty;
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl">
              {language === 'el' ? 'Κέντρο Βοήθειας' : 'Help Center'}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={language === 'el' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('el')}
            >
              EL
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
          </div>
        </div>
        <CardDescription>
          {language === 'el' 
            ? 'Αναζητήστε οδηγούς, FAQs και τεκμηρίωση για το PayrollSync' 
            : 'Search guides, FAQs and documentation for PayrollSync'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'el' ? 'Αναζήτηση βοήθειας...' : 'Search help...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label[language]}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {language === 'el' ? 'Οδηγοί' : 'Guides'}
            </TabsTrigger>
            <TabsTrigger value="faqs" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              {language === 'el' ? 'Συχνές Ερωτήσεις' : 'FAQs'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <div className="grid gap-4">
              {filteredArticles.map(article => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {article.title[language]}
                      </h3>
                      <div className="flex items-center gap-2">
                        {article.hasVideo && (
                          <Badge variant="outline" className="text-xs">
                            <Video className="h-3 w-3 mr-1" />
                            Video
                          </Badge>
                        )}
                        {article.hasDownload && (
                          <Badge variant="outline" className="text-xs">
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                      {article.content[language]}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`text-xs ${getDifficultyColor(article.difficulty)}`}>
                          {getDifficultyLabel(article.difficulty)}
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {article.readTime} {language === 'el' ? 'λεπτά' : 'min'}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {article.rating}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {article.views.toLocaleString()}
                        </div>
                      </div>

                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {language === 'el' ? 'Ανάγνωση' : 'Read'}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {article.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="faqs">
            <div className="space-y-2">
              {filteredFaqs.map(faq => (
                <Card key={faq.id}>
                  <CardContent className="p-0">
                    <button
                      className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <span className="font-medium">{faq.question[language]}</span>
                      {expandedFaqs.has(faq.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    
                    {expandedFaqs.has(faq.id) && (
                      <div className="px-4 pb-4">
                        <div className="border-t pt-4">
                          <p className="text-muted-foreground leading-relaxed">
                            {faq.answer[language]}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-xs">
                              {language === 'el' ? 'Δημοφιλία' : 'Popularity'}: {faq.popularity}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}