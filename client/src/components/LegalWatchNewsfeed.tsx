import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  ExternalLink, 
  AlertTriangle, 
  FileText, 
  TrendingUp,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Link } from 'wouter';

interface LegalUpdate {
  id: string;
  title: string;
  summary: string;
  publishDate: string;
  effectiveDate?: string;
  priority: 'high' | 'medium' | 'low';
  category: 'tax' | 'labor' | 'insurance' | 'ergani' | 'collective';
  source: string;
  actionItems: Array<{
    title: string;
    description: string;
    href: string;
    urgent: boolean;
  }>;
  complianceImpact: number; // 1-5 scale
}

const legalUpdates: LegalUpdate[] = [
  {
    id: 'update-2025-001',
    title: 'Αύξηση Κατώτατου Μισθού 2025 - Νέες Προδιαγραφές ΕΦΚΑ',
    summary: 'Ο κατώτατος μισθός αυξάνεται σε €830 από 1/1/2025. Απαιτούνται ενημερώσεις στις δηλώσεις ΕΦΚΑ και προσαρμογή συμβάσεων εργασίας.',
    publishDate: '2024-12-15',
    effectiveDate: '2025-01-01',
    priority: 'high',
    category: 'labor',
    source: 'Υπουργείο Εργασίας',
    actionItems: [
      {
        title: 'Ενημέρωση Συμβάσεων Εργασίας',
        description: 'Προσαρμογή όλων των συμβάσεων με μισθό κάτω από €830',
        href: '/employee-master?filter=salary_below_830',
        urgent: true
      },
      {
        title: 'Ενημέρωση Μισθοδοτικών Στοιχείων',
        description: 'Προσαρμογή βασικών μισθών και επανυπολογισμός ωρομισθίου',
        href: '/payroll-processing?action=salary_update',
        urgent: true
      },
      {
        title: 'Δηλώσεις ΕΦΚΑ',
        description: 'Υποβολή τροποποιητικών δηλώσεων για τον Ιανουάριο',
        href: '/ergani-compliance?form=efka_amendment',
        urgent: false
      }
    ],
    complianceImpact: 5
  },
  {
    id: 'update-2025-002',
    title: 'Νέες Απαιτήσεις ΕΡΓΑΝΗ II - Ψηφιακές Κάρτες Εργασίας',
    summary: 'Υποχρεωτική χρήση ψηφιακών καρτών εργασίας από 15/1/2025 για όλες τις επιχειρήσεις με πάνω από 50 εργαζόμενους.',
    publishDate: '2024-12-10',
    effectiveDate: '2025-01-15',
    priority: 'high',
    category: 'ergani',
    source: 'ΣΕΠΕ',
    actionItems: [
      {
        title: 'Εγγραφή στο Σύστημα Ψηφιακών Καρτών',
        description: 'Εγγραφή επιχείρησης και εργαζομένων στην πλατφόρμα ΕΡΓΑΝΗ II',
        href: '/digital-work-card?action=setup',
        urgent: true
      },
      {
        title: 'Εκπαίδευση Εργαζομένων',
        description: 'Ενημέρωση εργαζομένων για χρήση ψηφιακών καρτών',
        href: '/onboarding?module=digital_cards',
        urgent: false
      }
    ],
    complianceImpact: 4
  },
  {
    id: 'update-2024-045',
    title: 'Τροποποίηση Συλλογικής Σύμβασης Ξενοδοχοϋπαλλήλων',
    summary: 'Νέες ρυθμίσεις για αποζημίωση υπερωριών και εργασία Κυριακής στον κλάδο φιλοξενίας. Ισχύς από 1/12/2024.',
    publishDate: '2024-11-28',
    effectiveDate: '2024-12-01',
    priority: 'medium',
    category: 'collective',
    source: 'ΓΣΕΕ',
    actionItems: [
      {
        title: 'Ενημέρωση Υπολογισμών Υπερωριών',
        description: 'Προσαρμογή συντελεστών υπερωρίας για ξενοδοχοϋπαλλήλους',
        href: '/overtime?category=hotel_staff',
        urgent: false
      },
      {
        title: 'Επαναϋπολογισμός Δεκεμβρίου',
        description: 'Επαναϋπολογισμός μισθοδοσίας Δεκεμβρίου με νέους συντελεστές',
        href: '/payroll-processing?month=2024-12&recalculate=overtime',
        urgent: false
      }
    ],
    complianceImpact: 3
  },
  {
    id: 'update-2024-043',
    title: 'Αλλαγές στη Φορολογία Εργαζομένων - Αφορολόγητο Όριο',
    summary: 'Αύξηση αφορολόγητου ορίου σε €9.100 για το 2025. Προσαρμογή κλιμάκων φορολογίας και παρακράτησης.',
    publishDate: '2024-11-20',
    effectiveDate: '2025-01-01',
    priority: 'medium',
    category: 'tax',
    source: 'ΑΑΔΕ',
    actionItems: [
      {
        title: 'Ενημέρωση Φορολογικών Υπολογισμών',
        description: 'Προσαρμογή κλιμάκων φορολογίας στο σύστημα μισθοδοσίας',
        href: '/payroll-processing?action=tax_update_2025',
        urgent: false
      },
      {
        title: 'Επαναϋπολογισμός Ιανουαρίου',
        description: 'Εφαρμογή νέων φορολογικών συντελεστών από Ιανουάριο 2025',
        href: '/payroll-processing?month=2025-01&tax_update=true',
        urgent: false
      }
    ],
    complianceImpact: 3
  },
  {
    id: 'update-2024-041',
    title: 'Νέες Εισφορές ΕΦΚΑ - Προσαρμογή Ποσοστών 2025',
    summary: 'Μικρή αύξηση εισφορών εργοδότη κατά 0,2% για το ασφαλιστικό έτος 2025. Ισχύς από 1/1/2025.',
    publishDate: '2024-11-15',
    effectiveDate: '2025-01-01',
    priority: 'low',
    category: 'insurance',
    source: 'ΕΦΚΑ',
    actionItems: [
      {
        title: 'Ενημέρωση Εισφορών ΕΦΚΑ',
        description: 'Προσαρμογή ποσοστών εισφορών εργοδότη στο σύστημα',
        href: '/payroll-processing?action=efka_rates_2025',
        urgent: false
      }
    ],
    complianceImpact: 2
  }
];

const priorityConfig = {
  high: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    label: 'Υψηλή Προτεραιότητα'
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    label: 'Μέτρια Προτεραιότητα'
  },
  low: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    label: 'Χαμηλή Προτεραιότητα'
  }
};

const categoryConfig = {
  tax: { label: 'Φορολογία', icon: FileText },
  labor: { label: 'Εργατική Νομοθεσία', icon: TrendingUp },
  insurance: { label: 'Ασφαλίσεις', icon: FileText },
  ergani: { label: 'ΕΡΓΑΝΗ', icon: AlertTriangle },
  collective: { label: 'Συλλογικές Συμβάσεις', icon: FileText }
};

export default function LegalWatchNewsfeed() {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getComplianceImpactColor = (impact: number) => {
    if (impact >= 4) return 'text-red-600';
    if (impact >= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Νομικό Παρατηρητήριο & Ενημερώσεις
        </CardTitle>
        <CardDescription>
          Επιλεγμένες ενημερώσεις εργατικής νομοθεσίας με οδηγίες ενεργειών
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {legalUpdates.map((update) => {
          const CategoryIcon = categoryConfig[update.category].icon;
          const priorityStyle = priorityConfig[update.priority];
          
          return (
            <div key={update.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">
                      {categoryConfig[update.category].label}
                    </Badge>
                    <Badge className={`text-xs ${priorityStyle.color}`}>
                      {priorityStyle.label}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm leading-tight mb-2">
                    {update.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {update.summary}
                  </p>
                </div>
                <div className={`text-xs font-medium ${getComplianceImpactColor(update.complianceImpact)}`}>
                  Επίδραση: {update.complianceImpact}/5
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Δημοσιεύθηκε: {formatDate(update.publishDate)}</span>
                </div>
                {update.effectiveDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Ισχύς: {formatDate(update.effectiveDate)}</span>
                  </div>
                )}
                <div className="text-xs">
                  <span className="font-medium">Πηγή:</span> {update.source}
                </div>
              </div>

              {/* Action Items */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-foreground">Τι πρέπει να κάνετε τώρα:</h5>
                <div className="space-y-2">
                  {update.actionItems.map((action, index) => (
                    <Link key={index} href={action.href}>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{action.title}</span>
                            {action.urgent && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                Επείγον
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* View All Updates Link */}
        <div className="pt-4 border-t">
          <Link href="/legal-updates">
            <Button variant="outline" className="w-full" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Προβολή Όλων των Ενημερώσεων
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}