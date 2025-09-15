import { useAuth } from '@/hooks/useAuth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calculator,
  FileText,
  TrendingUp,
  Shield,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  UserCog,
  Eye,
} from 'lucide-react';
import { Link } from 'wouter';
import GreekComplianceInfo from '@/components/GreekComplianceInfo';
import ComplianceRecommendations from '@/components/ComplianceRecommendations';
import LegalWatchNewsfeed from '@/components/LegalWatchNewsfeed';
import { useAppContext } from '@/contexts/AppContext';
import {
  CompliancePaymentsCues,
  EnhancedKPICard,
} from '@/components/CompliancePaymentsCues';

export default function Home() {
  const { user } = useAuth();
  const { viewingMode, setViewingMode } = useAppContext();

  const toggleEmployeeView = () => {
    if (viewingMode.type === 'normal') {
      setViewingMode({
        type: 'employee_view',
        originalRole: user?.firstName || 'Manager',
      });
    } else {
      setViewingMode({ type: 'normal' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Καλώς ήρθατε, {user?.firstName || 'Χρήστη'}!
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            Επισκόπηση του συστήματος διαχείρισης ανθρώπινων πόρων και
            μισθοδοσίας
          </p>
        </div>

        {/* Demo Context Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant={
              viewingMode.type === 'employee_view' ? 'default' : 'outline'
            }
            size="sm"
            onClick={toggleEmployeeView}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {viewingMode.type === 'employee_view'
              ? 'Έξοδος Προβολής Εργαζομένου'
              : 'Προβολή ως Εργαζόμενος'}
          </Button>

          {viewingMode.type === 'normal' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setViewingMode({
                  type: 'impersonation',
                  originalRole: user?.firstName || 'Manager',
                  targetEmployee: { id: 'emp-123', name: 'Μαρία Παπαδάκη' },
                })
              }
              className="flex items-center gap-2"
            >
              <UserCog className="h-4 w-4" />
              Δοκιμαστική Προσομοίωση
            </Button>
          )}
        </div>
      </div>

      {/* Compliance & Payment Cues */}
      <CompliancePaymentsCues />

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EnhancedKPICard
          title="Σύνολο Εργαζομένων"
          value="147"
          description="Ενεργοί εργαζόμενοι"
          icon={Users}
          trend={{
            value: '+12%',
            isPositive: true,
          }}
          lastUpdated="πριν 2 λεπτά"
          ctaLabel="Διαχείριση"
          ctaHref="/employee-master"
          locale="el"
        />

        <EnhancedKPICard
          title="Μηνιαία Μισθοδοσία"
          value="€187.450,30"
          description="Τρέχων μήνας"
          icon={Calculator}
          trend={{
            value: '+8,5%',
            isPositive: true,
          }}
          lastUpdated="πριν 5 λεπτά"
          ctaLabel="Εκτέλεση"
          ctaHref="/payroll-processing"
          locale="el"
        />

        <EnhancedKPICard
          title="Ώρες Εργασίας"
          value="5.673,5 ώρες"
          description="Τρέχων μήνας"
          icon={TrendingUp}
          trend={{
            value: '+156 ώρες',
            isPositive: true,
          }}
          lastUpdated="πριν 1 ώρα"
          ctaLabel="Ανάλυση"
          ctaHref="/analytics"
          locale="el"
        />
      </div>

      {/* Greek Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Κατάσταση Συμμόρφωσης Ελληνικού Δικαίου 2025
          </CardTitle>
          <CardDescription>
            Ενημερωμένη συμμόρφωση με νόμο 4808/2021 και τελευταίες
            τροποποιήσεις
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  Ελληνικές Ταυτοποιήσεις
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  ΑΦΜ, ΑΜΚΑ, ΔΟΥ
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Ενεργό
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  Μισθοδοσία 2025
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  €760 κατώτατος
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Ενημερωμένο
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  ΕΦΚΑ Εισφορές
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  16% / 24,78%
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Συμμορφή
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  ERGANI II
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Αυτόματη υποβολή
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  Συγχρονισμένο
                </Badge>
              </div>
            </div>
          </div>

          <GreekComplianceInfo />
        </CardContent>
      </Card>

      {/* Legal Watch & Newsfeed */}
      <LegalWatchNewsfeed />

      {/* AI Recommendations */}
      <ComplianceRecommendations />
    </div>
  );
}
