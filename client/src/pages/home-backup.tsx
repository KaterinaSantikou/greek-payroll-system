import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calculator, FileText, TrendingUp, Shield, CheckCircle, AlertTriangle, Sparkles, UserCog, Eye } from "lucide-react";
import { Link } from "wouter";
import GreekComplianceInfo from "@/components/GreekComplianceInfo";
import ComplianceRecommendations from "@/components/ComplianceRecommendations";
import { useAppContext } from "@/contexts/AppContext";
import { CompliancePaymentsCues, EnhancedKPICard } from "@/components/CompliancePaymentsCues";

export default function Home() {
  const { user } = useAuth();
  const { viewingMode, setViewingMode } = useAppContext();

  const toggleEmployeeView = () => {
    if (viewingMode.type === "normal") {
      setViewingMode({
        type: "employee_view",
        originalRole: user?.firstName || "Manager"
      });
    } else {
      setViewingMode({ type: "normal" });
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Καλώς ήρθατε, {user?.firstName || 'Χρήστη'}!
          </h1>
          <p className="text-neutral-600">
            Επισκόπηση του συστήματος διαχείρισης ανθρώπινων πόρων και μισθοδοσίας
          </p>
        </div>
        
        {/* Demo Context Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant={viewingMode.type === "employee_view" ? "default" : "outline"}
            size="sm"
            onClick={toggleEmployeeView}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {viewingMode.type === "employee_view" ? "Exit Employee View" : "View as Employee"}
          </Button>
          
          {viewingMode.type === "normal" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingMode({
                type: "impersonation",
                originalRole: user?.firstName || "Manager",
                targetEmployee: { id: "emp-123", name: "Maria Papadakis" }
              })}
              className="flex items-center gap-2"
            >
              <UserCog className="h-4 w-4" />
              Demo Impersonation
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
            value: "+12%",
            isPositive: true
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
            value: "+8,5%",
            isPositive: true
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
            value: "+156 ώρες",
            isPositive: true
          }}
          lastUpdated="πριν 1 ώρα"
          ctaLabel="Ανάλυση"
          ctaHref="/analytics"
          locale="el"
        />
      </div>

      {/* Compliance Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Συμμόρφωση</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100%</div>
            <p className="text-xs text-muted-foreground">Ποσοστό συμμόρφωσης</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Γρήγορες Ενέργειες</CardTitle>
            <CardDescription>
              Συχνά χρησιμοποιούμενες λειτουργίες
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/employees">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Προσθήκη Νέου Εργαζομένου
              </Button>
            </Link>
            <Link href="/payroll">
              <Button className="w-full justify-start" variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Υπολογισμός Μισθοδοσίας
              </Button>
            </Link>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Εξαγωγή Αναφορών
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Πρόσφατη Δραστηριότητα</CardTitle>
            <CardDescription>
              Τελευταίες ενέργειες στο σύστημα
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                <div>
                  <p className="text-sm">Καλώς ήρθατε στο PayrollSync!</p>
                  <p className="text-xs text-muted-foreground">Μόλις τώρα</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Δεν υπάρχουν άλλες δραστηριότητες προς εμφάνιση.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Greek Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Κατάσταση Συμμόρφωσης Ελληνικού Δικαίου 2025
          </CardTitle>
          <CardDescription>
            Ενημερωμένη συμμόρφωση με νόμο 4808/2021 και τελευταίες τροποποιήσεις
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm">Ελληνικές Ταυτοποιήσεις</p>
                <p className="text-xs text-muted-foreground">ΑΦΜ, ΑΜΚΑ, ΔΟΥ</p>
                <Badge variant="outline" className="mt-1 text-xs">Ενεργό</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm">Μισθοδοσία 2025</p>
                <p className="text-xs text-muted-foreground">€760 κατώτατος</p>
                <Badge variant="outline" className="mt-1 text-xs">Ενημερωμένο</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm">ΕΦΚΑ Εισφορές</p>
                <p className="text-xs text-muted-foreground">16% / 24.78%</p>
                <Badge variant="outline" className="mt-1 text-xs">Συμμορφή</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-sm">Νόμος 4808/2021</p>
                <p className="text-xs text-muted-foreground">Ψηφιακή κάρτα</p>
                <Badge variant="outline" className="mt-1 text-xs">Έτοιμο</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Απαιτούμενα Ελληνικά Έγγραφα Ταυτοποίησης</h4>
              <Button variant="outline" size="sm">
                Περισσότερες Πληροφορίες
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="text-center p-3 border rounded-lg">
                <p className="font-medium text-sm">ΑΦΜ</p>
                <p className="text-xs text-muted-foreground">9-ψήφιος αριθμός</p>
                <p className="text-xs text-green-600 mt-1">Φορολογικής Ταυτοποίησης</p>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <p className="font-medium text-sm">ΑΜΚΑ</p>
                <p className="text-xs text-muted-foreground">11-ψήφιος αριθμός</p>
                <p className="text-xs text-green-600 mt-1">Κοινωνικής Ασφάλισης</p>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <p className="font-medium text-sm">Αρ. Ταυτότητας</p>
                <p className="text-xs text-muted-foreground">Ελληνικό ID</p>
                <p className="text-xs text-green-600 mt-1">ή διαβατήριο</p>
              </div>
              
              <div className="text-center p-3 border rounded-lg">
                <p className="font-medium text-sm">ΔΟΥ</p>
                <p className="text-xs text-muted-foreground">Φορολογικό γραφείο</p>
                <p className="text-xs text-green-600 mt-1">Ανάθεση</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Features */}
      <Card>
        <CardHeader>
          <CardTitle>Χαρακτηριστικά Συστήματος</CardTitle>
          <CardDescription>
            Πλήρης λύση διαχείρισης ανθρώπινων πόρων με ελληνική συμμόρφωση
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Ελληνική Συμμόρφωση
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Επικύρωση ΑΦΜ με αλγόριθμο checksum</li>
                <li>• Επικύρωση ΑΜΚΑ με Luhn αλγόριθμο</li>
                <li>• Καταχώρηση ΔΟΥ από προκαθορισμένη λίστα</li>
                <li>• Αυτοματοποιημένα αρχεία ΕΦΚΑ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                Μισθοδοσία 2025
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Προοδευτικές φορολογικές κλίμακες</li>
                <li>• Αυτόματος υπολογισμός ΕΦΚΑ</li>
                <li>• Υπερωρίες και νυχτερινές αποζημιώσεις</li>
                <li>• Συλλογικές συμβάσεις ανά κλάδο</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Αναφορές & Εξαγωγές
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Εξαγωγή σε Excel και PDF</li>
                <li>• Μισθοδοτικές καταστάσεις</li>
                <li>• Στατιστικές και αναλυτικές αναφορές</li>
                <li>• Συμμόρφωση με ΓΔΠΡ</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI-Powered Compliance Recommendations */}
      <ComplianceRecommendations />

      {/* Greek Compliance Information */}
      <GreekComplianceInfo />
    </div>
  );
}
