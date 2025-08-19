import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, FileText, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Καλώς ήρθατε, {user?.firstName || 'Χρήστη'}!
        </h1>
        <p className="text-neutral-600">
          Επισκόπηση του συστήματος διαχείρισης ανθρώπινων πόρων και μισθοδοσίας
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Σύνολο Εργαζομένων</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Ενεργοί εργαζόμενοι</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Μηνιαία Μισθοδοσία</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-xs text-muted-foreground">Τρέχων μήνας</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Αναφορές</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Δημιουργημένες αναφορές</p>
          </CardContent>
        </Card>

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

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>Πληροφορίες Συστήματος</CardTitle>
          <CardDescription>
            Χαρακτηριστικά και δυνατότητες του συστήματος
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Συμμόρφωση</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Επικύρωση ΑΦΜ (9 ψηφία)</li>
                <li>• Επικύρωση ΑΜΚΑ (11 ψηφία)</li>
                <li>• Καταχώρηση ΔΟΥ</li>
                <li>• Αρχεία ΕΦΚΑ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Μισθοδοσία</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ελληνικές φορολογικές κλίμακες</li>
                <li>• Υπολογισμός ΕΦΚΑ</li>
                <li>• Υπερωρίες και επιδόματα</li>
                <li>• Συλλογικές συμβάσεις</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Αναφορές</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Εξαγωγή σε Excel</li>
                <li>• Δημιουργία PDF</li>
                <li>• Μισθοδοτικές καταστάσεις</li>
                <li>• Στατιστικές αναφορές</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
