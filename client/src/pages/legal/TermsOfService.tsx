import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Scale, 
  Shield, 
  AlertTriangle, 
  Calendar, 
  Users, 
  FileText,
  Globe,
  Lock,
  CreditCard,
  Mail,
  Phone
} from "lucide-react";
import { Link } from "wouter";

export default function TermsOfService() {
  const lastUpdated = "21 Αυγούστου 2025";
  const effectiveDate = "1 Σεπτεμβρίου 2025";

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Scale className="h-10 w-10 text-blue-600" />
          <div>
            <h1 className="text-4xl font-bold">Όροι Χρήσης</h1>
            <p className="text-xl text-gray-600">PayrollSync - Σύστημα Μισθοδοσίας</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Badge variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Τελευταία ενημέρωση: {lastUpdated}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Ισχύς από: {effectiveDate}
          </Badge>
        </div>
      </div>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-2">Σημαντική Ειδοποίηση</h3>
              <p className="text-amber-700 text-sm leading-relaxed">
                Οι παρόντες Όροι Χρήσης διέπουν τη χρήση της πλατφόρμας PayrollSync. 
                Η χρήση της υπηρεσίας συνεπάγεται την πλήρη αποδοχή των όρων. 
                Παρακαλούμε διαβάστε προσεκτικά πριν τη χρήση.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Περιεχόμενα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <a href="#section-1" className="text-blue-600 hover:text-blue-800 py-1">1. Γενικές Διατάξεις</a>
            <a href="#section-2" className="text-blue-600 hover:text-blue-800 py-1">2. Ορισμοί</a>
            <a href="#section-3" className="text-blue-600 hover:text-blue-800 py-1">3. Υπηρεσίες</a>
            <a href="#section-4" className="text-blue-600 hover:text-blue-800 py-1">4. Λογαριασμός Χρήστη</a>
            <a href="#section-5" className="text-blue-600 hover:text-blue-800 py-1">5. Υποχρεώσεις Χρήστη</a>
            <a href="#section-6" className="text-blue-600 hover:text-blue-800 py-1">6. Προσωπικά Δεδομένα</a>
            <a href="#section-7" className="text-blue-600 hover:text-blue-800 py-1">7. Πνευματική Ιδιοκτησία</a>
            <a href="#section-8" className="text-blue-600 hover:text-blue-800 py-1">8. Χρεώσεις & Πληρωμές</a>
            <a href="#section-9" className="text-blue-600 hover:text-blue-800 py-1">9. Περιορισμοί Ευθύνης</a>
            <a href="#section-10" className="text-blue-600 hover:text-blue-800 py-1">10. Τερματισμός</a>
            <a href="#section-11" className="text-blue-600 hover:text-blue-800 py-1">11. Εφαρμοστέο Δίκαιο</a>
            <a href="#section-12" className="text-blue-600 hover:text-blue-800 py-1">12. Επικοινωνία</a>
          </div>
        </CardContent>
      </Card>

      {/* Section 1 - General Provisions */}
      <Card id="section-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            1. Γενικές Διατάξεις
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-relaxed">
            Οι παρόντες Όροι Χρήσης αποτελούν νομικά δεσμευτική συμφωνία μεταξύ του χρήστη 
            και της PayrollSync για τη χρήση της πλατφόρμας μισθοδοσίας και των συναφών υπηρεσιών.
          </p>
          <p className="leading-relaxed">
            Η πλατφόρμα λειτουργεί σύμφωνα με το ελληνικό και ευρωπαϊκό δίκαιο, 
            συμπεριλαμβανομένων των διατάξεων του ΓΚΠΔ και της εργατικής νομοθεσίας.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Αποδοχή Όρων</h4>
            <p className="text-blue-700 text-sm">
              Η εγγραφή ή χρήση της υπηρεσίας συνεπάγεται την πλήρη και ανεπιφύλακτη 
              αποδοχή των παρόντων όρων.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 - Definitions */}
      <Card id="section-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            2. Ορισμοί
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">«Πλατφόρμα»</h4>
              <p className="text-sm text-gray-600">
                Το σύστημα PayrollSync, συμπεριλαμβανομένων των εφαρμογών web, mobile και APIs.
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">«Χρήστης»</h4>
              <p className="text-sm text-gray-600">
                Κάθε φυσικό ή νομικό πρόσωπο που χρησιμοποιεί την πλατφόρμα.
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">«Μισθοδοτικά Δεδομένα»</h4>
              <p className="text-sm text-gray-600">
                Όλες οι πληροφορίες σχετικές με μισθούς, εργαζόμενους και εργοδότες.
              </p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-semibold">«Υπηρεσίες»</h4>
              <p className="text-sm text-gray-600">
                Μισθοδοσία, διαχείριση προσωπικού, φορολογικές υποχρεώσεις, και αναφορές.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 - Services */}
      <Card id="section-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            3. Υπηρεσίες
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-relaxed">
            Η PayrollSync παρέχει ολοκληρωμένες υπηρεσίες διαχείρισης μισθοδοσίας, 
            συμπεριλαμβανομένων:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-2">Βασικές Υπηρεσίες</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Υπολογισμός μισθών και παρακρατήσεων</li>
                <li>• Έκδοση μισθοδοτικών καταστάσεων</li>
                <li>• Διαχείριση προσωπικού</li>
                <li>• Φορολογικές αναφορές</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-700 mb-2">Προηγμένες Υπηρεσίες</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Ενσωμάτωση με ΕΡΓΑΝΗ</li>
                <li>• Ψηφιακή κάρτα εργασίας</li>
                <li>• Αναλυτικά στοιχεία & αναφορές</li>
                <li>• API ενσωμάτωση</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">Διαθεσιμότητα Υπηρεσιών</h4>
            <p className="text-amber-700 text-sm">
              Στοχεύουμε σε διαθεσιμότητα 99.9%. Προγραμματισμένες συντηρήσεις 
              ανακοινώνονται εκ των προτέρων.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 4 - User Account */}
      <Card id="section-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            4. Λογαριασμός Χρήστη
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Δημιουργία Λογαριασμού</h4>
            <p className="text-sm leading-relaxed">
              Για τη χρήση των υπηρεσιών απαιτείται δημιουργία λογαριασμού με έγκυρα στοιχεία. 
              Ο χρήστης ευθύνεται για την ακρίβεια των πληροφοριών.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Ασφάλεια Λογαριασμού</h4>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <ul className="text-sm space-y-1 text-red-700">
                <li>• Χρήση ισχυρών κωδικών πρόσβασης</li>
                <li>• Ενεργοποίηση διπλής πιστοποίησης (όπου διαθέσιμη)</li>
                <li>• Άμεση ενημέρωση για ύποπτη δραστηριότητα</li>
                <li>• Μη κοινοποίηση στοιχείων πρόσβασης</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Αναστολή/Τερματισμός</h4>
            <p className="text-sm leading-relaxed">
              Διατηρούμε το δικαίωμα αναστολής ή τερματισμού λογαριασμού σε περίπτωση 
              παραβίασης των όρων χρήσης.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 5 - User Obligations */}
      <Card id="section-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            5. Υποχρεώσεις Χρήστη
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="p-4 border-l-4 border-red-500 bg-red-50">
              <h4 className="font-semibold text-red-800 mb-2">Απαγορεύονται</h4>
              <ul className="text-sm space-y-1 text-red-700">
                <li>• Παραβίαση νόμων και κανονισμών</li>
                <li>• Χρήση για παράνομες δραστηριότητες</li>
                <li>• Εισαγωγή κακόβουλου κώδικα</li>
                <li>• Παραβίαση ασφάλειας συστήματος</li>
                <li>• Αντιγραφή ή διανομή περιεχομένου χωρίς άδεια</li>
              </ul>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h4 className="font-semibold text-green-800 mb-2">Υποχρεώσεις</h4>
              <ul className="text-sm space-y-1 text-green-700">
                <li>• Παροχή ακριβών στοιχείων</li>
                <li>• Συμμόρφωση με εργατική νομοθεσία</li>
                <li>• Προστασία δεδομένων εργαζομένων</li>
                <li>• Άμεση ενημέρωση για αλλαγές</li>
                <li>• Τήρηση συμβατικών υποχρεώσεων</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 6 - Personal Data */}
      <Card id="section-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            6. Προσωπικά Δεδομένα & ΓΚΠΔ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Συμμόρφωση ΓΚΠΔ</h4>
            <p className="text-blue-700 text-sm leading-relaxed">
              Η επεξεργασία προσωπικών δεδομένων γίνεται σύμφωνα με τον Γενικό Κανονισμό 
              Προστασίας Δεδομένων (ΓΚΠΔ) και την ελληνική νομοθεσία.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Επεξεργασία Δεδομένων</h4>
            <p className="text-sm leading-relaxed">
              Τα προσωπικά δεδομένα επεξεργάζονται αποκλειστικά για την παροχή υπηρεσιών 
              μισθοδοσίας και τη συμμόρφωση με νομικές υποχρεώσεις.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Δικαιώματα Υποκειμένων</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>• Δικαίωμα πρόσβασης</div>
              <div>• Δικαίωμα διόρθωσης</div>
              <div>• Δικαίωμα διαγραφής</div>
              <div>• Δικαίωμα περιορισμού</div>
              <div>• Δικαίωμα φορητότητας</div>
              <div>• Δικαίωμα αντίρρησης</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm">
              Για περισσότερες πληροφορίες, συμβουλευτείτε την 
              <Link href="/privacy" className="text-blue-600 hover:underline ml-1">
                Πολιτική Απορρήτου
              </Link>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 7 - Intellectual Property */}
      <Card id="section-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            7. Πνευματική Ιδιοκτησία
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-relaxed">
            Όλα τα δικαιώματα πνευματικής ιδιοκτησίας της πλατφόρμας ανήκουν στην PayrollSync, 
            συμπεριλαμβανομένων του κώδικα, σχεδιασμού, λογότυπων και περιεχομένου.
          </p>

          <div className="grid gap-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Άδεια Χρήσης</h4>
              <p className="text-amber-700 text-sm">
                Παρέχεται περιορισμένη, μη αποκλειστική άδεια χρήσης της πλατφόρμας 
                αποκλειστικά για τους σκοπούς της μισθοδοσίας.
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">Απαγορεύσεις</h4>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• Αντιγραφή ή αναπαραγωγή κώδικα</li>
                <li>• Δημιουργία παράγωγων έργων</li>
                <li>• Reverse engineering</li>
                <li>• Εμπορική εκμετάλλευση</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 8 - Charges & Payments */}
      <Card id="section-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            8. Χρεώσεις & Πληρωμές
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Τιμολόγηση</h4>
            <p className="text-sm leading-relaxed">
              Οι χρεώσεις καθορίζονται βάσει του επιλεγμένου πακέτου υπηρεσιών. 
              Οι τιμές δημοσιεύονται στην ιστοσελίδα και ενημερώνονται κατά περίπτωση.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-2">Μέθοδοι Πληρωμής</h4>
              <ul className="text-sm space-y-1">
                <li>• Τραπεζικό έμβασμα</li>
                <li>• Κάρτες πίστωσης/χρέωσης</li>
                <li>• PayPal</li>
                <li>• SEPA Direct Debit</li>
              </ul>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-700 mb-2">Όροι Πληρωμής</h4>
              <ul className="text-sm space-y-1">
                <li>• Προπληρωμή μηνιαίων συνδρομών</li>
                <li>• ΦΠΑ 24% (όπου εφαρμόζεται)</li>
                <li>• Πληρωμή εντός 15 ημερών</li>
                <li>• Τόκοι υπερημερίας 8% ετησίως</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">Επιστροφές & Ακυρώσεις</h4>
            <p className="text-amber-700 text-sm">
              Οι συνδρομές μπορούν να ακυρωθούν οποτεδήποτε. Δεν παρέχονται επιστροφές 
              για μερικώς χρησιμοποιημένες περιόδους.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 9 - Liability Limitations */}
      <Card id="section-9">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            9. Περιορισμοί Ευθύνης
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">Σημαντική Ειδοποίηση</h4>
            <p className="text-red-700 text-sm leading-relaxed">
              Οι υπηρεσίες παρέχονται "ως έχουν". Ο χρήστης φέρει την αποκλειστική ευθύνη 
              για τη συμμόρφωση με την εργατική και φορολογική νομοθεσία.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Εξαιρέσεις Ευθύνης</h4>
            <p className="text-sm leading-relaxed">
              Η PayrollSync δεν ευθύνεται για:
            </p>
            <ul className="text-sm space-y-2 ml-4">
              <li>• Έμμεσες ή αποθετικές ζημίες</li>
              <li>• Απώλεια εσόδων ή κερδών</li>
              <li>• Διακοπή επιχειρηματικής δραστηριότητας</li>
              <li>• Νομικές συνέπειες λανθασμένων υπολογισμών</li>
              <li>• Τεχνικά προβλήματα εκτός ελέγχου μας</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Όριο Ευθύνης</h4>
            <p className="text-blue-700 text-sm">
              Η συνολική ευθύνη περιορίζεται στο ποσό των τελευταίων 12 μηνών συνδρομής.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 10 - Termination */}
      <Card id="section-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            10. Τερματισμός
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
              <h4 className="font-semibold text-blue-800 mb-2">Τερματισμός από Χρήστη</h4>
              <p className="text-blue-700 text-sm">
                Ο χρήστης μπορεί να τερματίσει τη σύμβαση οποτεδήποτε με ειδοποίηση 30 ημερών.
              </p>
            </div>

            <div className="p-4 border-l-4 border-red-500 bg-red-50">
              <h4 className="font-semibold text-red-800 mb-2">Τερματισμός από PayrollSync</h4>
              <p className="text-red-700 text-sm mb-2">
                Διατηρούμε το δικαίωμα άμεσου τερματισμού σε περιπτώσεις:
              </p>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• Παραβίασης όρων χρήσης</li>
                <li>• Παράνομης δραστηριότητας</li>
                <li>• Μη πληρωμής συνδρομών</li>
                <li>• Κατάχρησης υπηρεσιών</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">Συνέπειες Τερματισμού</h4>
            <ul className="text-amber-700 text-sm space-y-1">
              <li>• Άμεση παύση πρόσβασης στις υπηρεσίες</li>
              <li>• Διατήρηση δεδομένων για 90 ημέρες</li>
              <li>• Δυνατότητα εξαγωγής δεδομένων</li>
              <li>• Καταστροφή δεδομένων μετά τη νόμιμη περίοδο</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Section 11 - Applicable Law */}
      <Card id="section-11">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            11. Εφαρμοστέο Δίκαιο & Δικαιοδοσία
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Εφαρμοστέο Δίκαιο</h4>
            <p className="text-sm leading-relaxed">
              Οι παρόντες όροι διέπονται από το ελληνικό δίκαιο και τις διατάξεις της 
              Ευρωπαϊκής Ένωσης.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Δικαιοδοσία</h4>
            <p className="text-sm leading-relaxed">
              Για την επίλυση τυχόν διαφορών αρμόδια είναι τα δικαστήρια Αθηνών, 
              εκτός εάν υπάρχει υποχρεωτική αλλη δικαιοδοσία βάσει νόμου.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Εναλλακτική Επίλυση Διαφορών</h4>
            <p className="text-green-700 text-sm">
              Προτιμούμε την φιλική επίλυση διαφορών μέσω διαμεσολάβησης πριν από 
              δικαστική προσφυγή.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 12 - Contact */}
      <Card id="section-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            12. Επικοινωνία & Υποστήριξη
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-3">Στοιχεία Επικοινωνίας</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>legal@payrollsync.gr</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>+30 210 1234567</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span>www.payrollsync.gr</span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-700 mb-3">Ώρες Υποστήριξης</h4>
              <div className="space-y-2 text-sm">
                <div>Δευτέρα - Παρασκευή: 09:00 - 17:00</div>
                <div>Σάββατο: 10:00 - 14:00</div>
                <div>Κυριακή: Κλειστά</div>
                <div className="text-blue-600 mt-2">
                  24/7 online υποστήριξη διαθέσιμη
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Αιτήματα Νομικού Περιεχομένου</h4>
            <p className="text-sm text-gray-700">
              Για αιτήματα σχετικά με δικαιώματα προσωπικών δεδομένων, νομικά ζητήματα 
              ή καταγγελίες, επικοινωνήστε αποκλειστικά στο legal@payrollsync.gr.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-8 border-t">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            © 2025 PayrollSync. Όλα τα δικαιώματα διατηρούνται.
          </p>
          <p className="text-xs text-gray-500">
            Τελευταία ενημέρωση: {lastUpdated} | Έκδοση 2.1
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Πολιτική Απορρήτου
            </Link>
            <Link href="/cookies" className="text-blue-600 hover:underline">
              Πολιτική Cookies
            </Link>
            <Link href="/legal" className="text-blue-600 hover:underline">
              Νομικά Έγγραφα
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}