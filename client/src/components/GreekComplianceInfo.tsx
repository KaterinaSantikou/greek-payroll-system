import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText, Users, Shield } from "lucide-react";

/**
 * Greek Compliance Information Component
 * Displays comprehensive information about Greek labor law compliance requirements
 */
export default function GreekComplianceInfo() {
  return (
    <div className="space-y-6">
      {/* Personal Identification & Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Προσωπική Ταυτοποίηση & Έγγραφα
          </CardTitle>
          <CardDescription>
            Απαιτούμενα ελληνικά έγγραφα ταυτοποίησης
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <h4 className="font-medium">ΑΦΜ (Αριθμός Φορολογικού Μητρώου)</h4>
                  <p className="text-sm text-muted-foreground">9-ψήφιος αριθμός φορολογικής ταυτοποίησης</p>
                  <Badge variant="outline" className="mt-1">Υποχρεωτικό</Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <h4 className="font-medium">ΑΜΚΑ (Αριθμός Μητρώου Κοινωνικής Ασφάλισης)</h4>
                  <p className="text-sm text-muted-foreground">11-ψήφιος αριθμός κοινωνικής ασφάλισης</p>
                  <Badge variant="outline" className="mt-1">Υποχρεωτικό</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <h4 className="font-medium">Αριθμός Ταυτότητας</h4>
                  <p className="text-sm text-muted-foreground">Ελληνικό δελτίο ταυτότητας ή διαβατήριο</p>
                  <Badge variant="outline" className="mt-1">Υποχρεωτικό</Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <h4 className="font-medium">ΔΟΥ (Δημόσια Οικονομική Υπηρεσία)</h4>
                  <p className="text-sm text-muted-foreground">Ανάθεση φορολογικού γραφείου</p>
                  <Badge variant="outline" className="mt-1">Υποχρεωτικό</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2025 Greek Labor Law Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Συμμόρφωση με Ελληνικό Εργατικό Δίκαιο 2025
          </CardTitle>
          <CardDescription>
            Ενημερωμένες απαιτήσεις νόμου 4808/2021 και τελευταίες τροποποιήσεις
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Κατώτατος Μισθός</h4>
              <p className="text-2xl font-bold">€760/μήνα</p>
              <p className="text-sm text-muted-foreground">Ενημερωμένος για το 2025</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">Εισφορές ΕΦΚΑ</h4>
              <p className="text-sm">Εργαζόμενος: <span className="font-semibold">16%</span></p>
              <p className="text-sm">Εργοδότης: <span className="font-semibold">24,78%</span></p>
              <p className="text-xs text-muted-foreground">+ Ανεργία: 0,5%/2,55%</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-purple-700">Φορολογικές Κλίμακες</h4>
              <div className="text-sm space-y-1">
                <p>9% • 22% • 28% • 36% • 44%</p>
                <p className="text-xs text-muted-foreground">Προοδευτικό σύστημα 2025</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div>
              <h4 className="font-medium mb-2">Άδειες & Απουσίες</h4>
              <div className="space-y-1 text-sm">
                <p>• Ετήσια άδεια: <span className="font-semibold">24+ ημέρες</span></p>
                <p>• Μητρότητα: <span className="font-semibold">119 ημέρες</span></p>
                <p>• Πατρότητα: <span className="font-semibold">14 ημέρες</span></p>
                <p>• Ασθενείας: <span className="font-semibold">30 ημέρες</span></p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Ωράριο Εργασίας</h4>
              <div className="space-y-1 text-sm">
                <p>• Μέγιστο εβδομαδιαίο: <span className="font-semibold">40 ώρες</span></p>
                <p>• Μέγιστο ημερήσιο: <span className="font-semibold">8 ώρες</span></p>
                <p>• Υπερωρίες: <span className="font-semibold">+25% - +35%</span></p>
                <p>• Κυριακή: <span className="font-semibold">+75%</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Digital Labor Card (Law 4808/2021) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ψηφιακή Κάρτα Εργασίας (Νόμος 4808/2021)
          </CardTitle>
          <CardDescription>
            Υποχρεωτικές ψηφιακές απαιτήσεις τεκμηρίωσης
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Ψηφιακή καταγραφή ωραρίου εργασίας</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Δικαίωμα αποσύνδεσης μετά το ωράριο</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Ευέλικτες ρυθμίσεις εργασίας & τηλεργασία</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Αυτοματοποιημένη συμμόρφωση με συλλογικές συμβάσεις</span>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Διαθέσιμες Συλλογικές Συμβάσεις 2025
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>• Γενική Συλλογική Σύμβαση</div>
              <div>• Τραπεζικός Κλάδος</div>
              <div>• Τουρισμός & Εστίαση</div>
              <div>• Οικοδομικός Κλάδος</div>
              <div>• Εμπόριο & Υπηρεσίες</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}