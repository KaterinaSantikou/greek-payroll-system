import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Users, 
  Calculator, 
  Shield, 
  Clock,
  CreditCard,
  Settings,
  AlertTriangle,
  CheckCircle,
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  Download,
  Play,
  Star,
  Bookmark,
  Share2
} from "lucide-react";
import { Link } from "wouter";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number;
  tags: string[];
  content: React.ReactNode;
  popular: boolean;
}

const helpArticles: HelpArticle[] = [
  {
    id: "getting-started",
    title: "Ξεκινώντας με το PayrollSync",
    description: "Πλήρης οδηγός για την αρχική εγκατάσταση και διαμόρφωση του συστήματος",
    category: "getting-started",
    difficulty: "beginner",
    readTime: 5,
    tags: ["εγκατάσταση", "διαμόρφωση", "βασικά"],
    popular: true,
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Καλώς ήρθατε στο PayrollSync!</h4>
          <p className="text-blue-700 text-sm">
            Το PayrollSync είναι μια ολοκληρωμένη πλατφόρμα μισθοδοσίας σχεδιασμένη ειδικά για τις ελληνικές επιχειρήσεις.
          </p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold">Βήμα 1: Δημιουργία Λογαριασμού</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
            <li>Πατήστε "Εγγραφή" στην αρχική σελίδα</li>
            <li>Συμπληρώστε τα στοιχεία της εταιρείας σας</li>
            <li>Επιβεβαιώστε το email σας</li>
            <li>Επιλέξτε το κατάλληλο πακέτο για τις ανάγκες σας</li>
          </ol>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Βήμα 2: Βασική Διαμόρφωση</h4>
          <ul className="list-disc list-inside space-y-2 text-sm ml-4">
            <li>Ρυθμίστε τα στοιχεία της εταιρείας (ΑΦΜ, ΔΟΥ, διεύθυνση)</li>
            <li>Συνδέστε το σύστημα με το ΕΡΓΑΝΗ</li>
            <li>Διαμορφώστε τις βασικές παραμέτρους μισθοδοσίας</li>
            <li>Προσθέστε τους πρώτους εργαζόμενους</li>
          </ul>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Συμβουλή</h4>
          <p className="text-green-700 text-sm">
            Χρησιμοποιήστε τον οδηγό γρήγορης εγκατάστασης για να ρυθμίσετε το σύστημα σε λιγότερο από 10 λεπτά!
          </p>
        </div>
      </div>
    )
  },
  
  {
    id: "employee-management",
    title: "Διαχείριση Εργαζομένων",
    description: "Μάθετε πώς να προσθέτετε, επεξεργάζεστε και διαχειρίζεστε τα στοιχεία των εργαζομένων",
    category: "employees",
    difficulty: "beginner",
    readTime: 8,
    tags: ["εργαζόμενοι", "προσλήψεις", "στοιχεία"],
    popular: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold">Προσθήκη Νέου Εργαζομένου</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Πηγαίνετε στο μενού "Εργαζόμενοι" → "Νέος Εργαζόμενος"</li>
              <li>Συμπληρώστε τα προσωπικά στοιχεία (όνομα, επώνυμο, ΑΦΜ, ΑΜΚΑ)</li>
              <li>Εισάγετε τα στοιχεία της σύμβασης εργασίας</li>
              <li>Ρυθμίστε τις παραμέτρους μισθοδοσίας</li>
              <li>Αποθηκεύστε και στείλτε την δήλωση στο ΕΡΓΑΝΗ</li>
            </ol>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Απαιτούμενα Έγγραφα</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">Βασικά Έγγραφα</h5>
              <ul className="text-xs space-y-1 mt-2">
                <li>• Ταυτότητα/Διαβατήριο</li>
                <li>• Βεβαίωση ΑΦΜ</li>
                <li>• Βεβαίωση ΑΜΚΑ</li>
                <li>• Άδεια εργασίας (για αλλοδαπούς)</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h5 className="font-medium text-sm">Ειδικά Έγγραφα</h5>
              <ul className="text-xs space-y-1 mt-2">
                <li>• Ιατρική εξέταση</li>
                <li>• Πιστοποιητικά σπουδών</li>
                <li>• Βεβαιώσεις προϋπηρεσίας</li>
                <li>• Στοιχεία τραπεζικού λογαριασμού</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-2">Σημαντικό</h4>
          <p className="text-amber-700 text-sm">
            Η δήλωση νέων εργαζομένων στο ΕΡΓΑΝΗ πρέπει να γίνει το αργότερο την προηγούμενη 
            εργάσιμη ημέρα από την έναρξη της εργασίας.
          </p>
        </div>
      </div>
    )
  },
  
  {
    id: "payroll-processing",
    title: "Επεξεργασία Μισθοδοσίας",
    description: "Αναλυτικός οδηγός για την εκτέλεση μηνιαίας μισθοδοσίας",
    category: "payroll",
    difficulty: "intermediate",
    readTime: 12,
    tags: ["μισθοδοσία", "επεξεργασία", "υπολογισμοί"],
    popular: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold">Βήματα Μηνιαίας Μισθοδοσίας</h4>
          <div className="space-y-3">
            {[
              { step: "1. Έλεγχος Στοιχείων", desc: "Επιβεβαίωση ωρών εργασίας και απουσιών" },
              { step: "2. Υπολογισμοί", desc: "Αυτόματος υπολογισμός μισθών και παρακρατήσεων" },
              { step: "3. Έλεγχος", desc: "Επαλήθευση υπολογισμών και εγκρίσεις" },
              { step: "4. Εκτύπωση", desc: "Δημιουργία μισθοδοτικών καταστάσεων" },
              { step: "5. Πληρωμές", desc: "Εξαγωγή αρχείων τραπεζικών εμβασμάτων" },
              { step: "6. Αρχειοθέτηση", desc: "Αποθήκευση και αρχειοθέτηση εγγράφων" }
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                  {index + 1}
                </div>
                <div>
                  <h5 className="font-medium text-sm">{item.step}</h5>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Συχνοί Υπολογισμοί</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-sm mb-2">Υπερωρίες</h5>
              <ul className="text-xs space-y-1">
                <li>• Καθημερινές: +25% για πρώτες 2 ώρες</li>
                <li>• Καθημερινές: +50% μετά τις 2 ώρες</li>
                <li>• Κυριακές/Αργίες: +75%</li>
                <li>• Νυχτερινές: +25% (22:00-06:00)</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-sm mb-2">Παρακρατήσεις</h5>
              <ul className="text-xs space-y-1">
                <li>• Φόρος εισοδήματος: Κλιμάκωση</li>
                <li>• ΕΦΚΑ εργαζόμενου: 14%</li>
                <li>• ΕΦΚΑ εργοδότη: 24.06%</li>
                <li>• Φόρος αλληλεγγύης: 2.2%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  },

  {
    id: "ergani-integration",
    title: "Ενσωμάτωση με ΕΡΓΑΝΗ",
    description: "Πώς να συνδέσετε και να χρησιμοποιήσετε το σύστημα ΕΡΓΑΝΗ",
    category: "compliance",
    difficulty: "intermediate",
    readTime: 10,
    tags: ["εργανη", "συμμόρφωση", "δηλώσεις"],
    popular: false,
    content: (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Τι είναι το ΕΡΓΑΝΗ;</h4>
          <p className="text-blue-700 text-sm">
            Το ΕΡΓΑΝΗ είναι το πληροφοριακό σύστημα του Υπουργείου Εργασίας για την 
            καταγραφή στοιχείων εργαζομένων και ωραρίων εργασίας.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Βήματα Σύνδεσης</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Αποκτήστε διαπιστευτήρια από το gov.gr</li>
            <li>Ενεργοποιήστε την πρόσβαση στο ΕΡΓΑΝΗ</li>
            <li>Συνδέστε το PayrollSync με τα διαπιστευτήρια σας</li>
            <li>Δοκιμάστε τη σύνδεση με μια δοκιμαστική δήλωση</li>
          </ol>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Αυτόματες Δηλώσεις</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Προσλήψεις", desc: "Αυτόματη δήλωση νέων εργαζομένων" },
              { title: "Απολύσεις", desc: "Δήλωση λύσης συμβάσεων εργασίας" },
              { title: "Ωράρια", desc: "Καθημερινή αποστολή ωρών εργασίας" }
            ].map((item, index) => (
              <div key={index} className="p-3 border rounded-lg text-center">
                <h5 className="font-medium text-sm">{item.title}</h5>
                <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h4 className="font-semibold text-red-800 mb-2">Προσοχή</h4>
          <p className="text-red-700 text-sm">
            Η μη δήλωση στο ΕΡΓΑΝΗ μπορεί να οδηγήσει σε πρόστιμα από 500€ έως 10.000€ ανά εργαζόμενο.
          </p>
        </div>
      </div>
    )
  },

  {
    id: "digital-work-card",
    title: "Ψηφιακή Κάρτα Εργασίας",
    description: "Οδηγός για την υλοποίηση και χρήση της ψηφιακής κάρτας εργασίας",
    category: "compliance",
    difficulty: "advanced",
    readTime: 15,
    tags: ["ψηφιακή-κάρτα", "συμμόρφωση", "καταγραφή-ωρών"],
    popular: false,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Νέα Υποχρέωση από 1/9/2024</h4>
          <p className="text-green-700 text-sm">
            Όλες οι επιχειρήσεις με περισσότερους από 20 εργαζόμενους υποχρεούνται να 
            υλοποιήσουν ψηφιακή κάρτα εργασίας.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Τρόποι Υλοποίησης</h4>
          <div className="space-y-3">
            {[
              {
                title: "Mobile App",
                desc: "Εφαρμογή κινητού με GPS και QR codes",
                features: ["GPS tracking", "QR code scanning", "Offline λειτουργία", "Ασφάλεια biometric"]
              },
              {
                title: "Kiosk/Tablet",
                desc: "Σταθερές συσκευές σε χώρους εργασίας",
                features: ["NFC cards", "PIN codes", "Φωτογραφική επιβεβαίωση", "Δακτυλικά αποτυπώματα"]
              },
              {
                title: "Web Browser",
                desc: "Πρόσβαση μέσω browser με επιπλέον ασφάλεια",
                features: ["Two-factor auth", "IP restrictions", "Session monitoring", "Encrypted tokens"]
              }
            ].map((method, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h5 className="font-medium text-sm">{method.title}</h5>
                <p className="text-xs text-gray-600 mt-1 mb-2">{method.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {method.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{feature}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Βασικές Λειτουργίες</h4>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Καταγραφή εισόδου/εξόδου:</strong> Αυτόματη καταγραφή ωρών εργασίας</li>
            <li>• <strong>Διαλείμματα:</strong> Καταγραφή διαλειμμάτων και παύσεων</li>
            <li>• <strong>Υπερωρίες:</strong> Αυτόματη αναγνώριση και έγκριση υπερωριών</li>
            <li>• <strong>Εξαιρέσεις:</strong> Διαχείριση ειδικών περιπτώσεων και εξαιρέσεων</li>
            <li>• <strong>Αναφορές:</strong> Real-time αναφορές για managers και HR</li>
          </ul>
        </div>
      </div>
    )
  },

  {
    id: "tax-compliance",
    title: "Φορολογική Συμμόρφωση",
    description: "Οδηγός για τη συμμόρφωση με τις ελληνικές φορολογικές υποχρεώσεις",
    category: "compliance",
    difficulty: "intermediate",
    readTime: 8,
    tags: ["φόροι", "υποχρεώσεις", "δηλώσεις"],
    popular: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold">Μηνιαίες Υποχρεώσεις</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-sm mb-2">Φόρος Μισθωτών Υπηρεσιών</h5>
              <ul className="text-xs space-y-1">
                <li>• Υποβολή: Έως 15 του επόμενου μήνα</li>
                <li>• Πληρωμή: Έως 30 του επόμενου μήνα</li>
                <li>• Περιλαμβάνει: Φόρο εισοδήματος + αλληλεγγύη</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-sm mb-2">Εισφορές ΕΦΚΑ</h5>
              <ul className="text-xs space-y-1">
                <li>• Υποβολή ΑΠΔ: Έως 16 του επόμενου μήνα</li>
                <li>• Πληρωμή: Σε δόσεις έως 30 του μήνα</li>
                <li>• Περιλαμβάνει: Κύρια + επικουρικά ασφάλιστρα</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Ετήσιες Υποχρεώσεις</h4>
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-800 text-sm">Βεβαιώσεις Αποδοχών</h5>
              <p className="text-blue-700 text-xs mt-1">
                Έκδοση έως 28/2 για όλους τους εργαζόμενους του προηγούμενου έτους
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-medium text-green-800 text-sm">Δήλωση Φόρου Μισθωτών</h5>
              <p className="text-green-700 text-xs mt-1">
                Υποβολή έως 31/7 με συνοπτικά στοιχεία παρακρατήσεων
              </p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-2">Νέες Αλλαγές 2024</h4>
          <ul className="text-amber-700 text-sm space-y-1">
            <li>• Αύξηση αφορολόγητου ορίου στα 10.000€</li>
            <li>• Νέα κλίμακα φορολογίας εισοδήματος</li>
            <li>• Ψηφιακή υποβολή όλων των δηλώσεων</li>
          </ul>
        </div>
      </div>
    )
  },

  {
    id: "payment-methods",
    title: "Μέθοδοι Πληρωμής",
    description: "Διαχείριση τραπεζικών μεταφορών και μεθόδων πληρωμής εργαζομένων",
    category: "payments",
    difficulty: "beginner",
    readTime: 6,
    tags: ["πληρωμές", "τράπεζες", "μεταφορές"],
    popular: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold">Υποστηριζόμενες Μέθοδοι</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-sm mb-2">Τραπεζικές Μεταφορές</h5>
              <ul className="text-xs space-y-1">
                <li>• SEPA Credit Transfer</li>
                <li>• Bulk payments σε όλες τις τράπεζες</li>
                <li>• Αυτόματη συμφωνία</li>
                <li>• Encrypted αρχεία</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h5 className="font-medium text-sm mb-2">Ειδικές Περιπτώσεις</h5>
              <ul className="text-xs space-y-1">
                <li>• Μετρητά (με απόδειξη)</li>
                <li>• Επιταγές (περιορισμένα)</li>
                <li>• Ηλεκτρονικά πορτοφόλια</li>
                <li>• Crypto (υπό εξέταση)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Ρυθμίσεις Πληρωμών</h4>
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-sm">Χρόνοι Εκτέλεσης</h5>
              <ul className="text-xs space-y-1 mt-1">
                <li>• Same day: Έως 14:00 για εκτέλεση την ίδια μέρα</li>
                <li>• Next day: Έως 17:00 για εκτέλεση την επόμενη</li>
                <li>• Bulk transfers: 1-2 εργάσιμες ημέρες</li>
              </ul>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-sm">Κόστη</h5>
              <ul className="text-xs space-y-1 mt-1">
                <li>• SEPA εντός Ελλάδας: 0.50€ ανά μεταφορά</li>
                <li>• SEPA εντός ΕΕ: 1.00€ ανά μεταφορά</li>
                <li>• Bulk discounts: Έκπτωση για >50 μεταφορές</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Ασφάλεια</h4>
          <p className="text-green-700 text-sm">
            Όλες οι πληρωμές γίνονται με 256-bit encryption και two-factor authentication. 
            Τα τραπεζικά στοιχεία αποθηκεύονται σε PCI-DSS compliant servers.
          </p>
        </div>
      </div>
    )
  },

  {
    id: "troubleshooting",
    title: "Επίλυση Προβλημάτων",
    description: "Συχνά προβλήματα και τρόποι επίλυσης",
    category: "support",
    difficulty: "beginner",
    readTime: 4,
    tags: ["προβλήματα", "επίλυση", "βοήθεια"],
    popular: true,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-semibold">Συχνά Προβλήματα</h4>
          <div className="space-y-3">
            {[
              {
                problem: "Δεν μπορώ να συνδεθώ",
                solutions: [
                  "Επιβεβαιώστε τα διαπιστευτήρια σας",
                  "Ελέγξτε τη σύνδεση στο διαδίκτυο",
                  "Καθαρίστε το cache του browser",
                  "Δοκιμάστε από διαφορετικό browser"
                ]
              },
              {
                problem: "Λάθος υπολογισμοί μισθού",
                solutions: [
                  "Ελέγξτε τις παραμέτρους του εργαζομένου",
                  "Επιβεβαιώστε τις ώρες εργασίας",
                  "Ελέγξτε τις κλίμακες φόρου",
                  "Επικοινωνήστε με το support"
                ]
              },
              {
                problem: "Αποτυχία σύνδεσης με ΕΡΓΑΝΗ",
                solutions: [
                  "Ελέγξτε τα διαπιστευτήρια gov.gr",
                  "Επιβεβαιώστε την κατάσταση του ΕΡΓΑΝΗ",
                  "Δοκιμάστε αργότερα (συντήρηση)",
                  "Επικοινωνήστε με το ΕΡΓΑΝΗ helpdesk"
                ]
              }
            ].map((item, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h5 className="font-medium text-sm text-red-700">{item.problem}</h5>
                <ul className="text-xs space-y-1 mt-2">
                  {item.solutions.map((solution, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>{solution}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Χρειάζεστε περισσότερη βοήθεια;</h4>
          <p className="text-blue-700 text-sm">
            Επικοινωνήστε με την ομάδα υποστήριξής μας στο support@payrollsync.gr 
            ή καλέστε στο 210-1234567 (Δευτέρα-Παρασκευή, 09:00-17:00).
          </p>
        </div>
      </div>
    )
  }
];

const categories = [
  { id: "all", name: "Όλα", icon: BookOpen },
  { id: "getting-started", name: "Ξεκινώντας", icon: Play },
  { id: "employees", name: "Εργαζόμενοι", icon: Users },
  { id: "payroll", name: "Μισθοδοσία", icon: Calculator },
  { id: "compliance", name: "Συμμόρφωση", icon: Shield },
  { id: "payments", name: "Πληρωμές", icon: CreditCard },
  { id: "support", name: "Υποστήριξη", icon: HelpCircle }
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  
  const filteredArticles = useMemo(() => {
    return helpArticles.filter(article => {
      const matchesSearch = searchTerm === "" || 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const popularArticles = helpArticles.filter(article => article.popular);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="h-10 w-10 text-blue-600" />
          <div>
            <h1 className="text-4xl font-bold">Κέντρο Βοήθειας</h1>
            <p className="text-xl text-gray-600">PayrollSync Documentation</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Αναζητήστε στην τεκμηρίωση... (π.χ. μισθοδοσία, εργανη, φόροι)"
            className="pl-10 pr-4 py-3 text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Access Cards */}
      {searchTerm === "" && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            Δημοφιλή Άρθρα
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularArticles.map((article) => (
              <Card key={article.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4" onClick={() => setSelectedArticle(article)}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{article.title}</h3>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {article.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {article.readTime} λεπτά
                        </Badge>
                        <Badge 
                          variant={article.difficulty === 'beginner' ? 'default' : 
                                  article.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {article.difficulty === 'beginner' ? 'Αρχάριος' :
                           article.difficulty === 'intermediate' ? 'Μεσαίος' : 'Προχωρημένος'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Κατηγορίες</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const count = category.id === "all" ? helpArticles.length : 
                               helpArticles.filter(a => a.category === category.id).length;
                  
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="flex-1 text-left">{category.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Χρειάζεστε Βοήθεια;</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="mailto:support@payrollsync.gr">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Υποστήριξη
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="tel:+302101234567">
                  <Phone className="h-4 w-4 mr-2" />
                  Τηλέφωνο
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/contact">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Live Chat
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedArticle ? (
            // Article View
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedArticle(null)}
                      className="mb-3"
                    >
                      ← Πίσω στα αποτελέσματα
                    </Button>
                    <CardTitle className="text-2xl mb-2">{selectedArticle.title}</CardTitle>
                    <p className="text-gray-600 mb-4">{selectedArticle.description}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedArticle.readTime} λεπτά ανάγνωση
                      </span>
                      <Badge 
                        variant={selectedArticle.difficulty === 'beginner' ? 'default' : 
                                selectedArticle.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                      >
                        {selectedArticle.difficulty === 'beginner' ? 'Αρχάριος' :
                         selectedArticle.difficulty === 'intermediate' ? 'Μεσαίος' : 'Προχωρημένος'}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {selectedArticle.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  {selectedArticle.content}
                </div>
                
                <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-semibold mb-2">Ήταν χρήσιμο αυτό το άρθρο;</h4>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Ναι
                    </Button>
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Όχι
                    </Button>
                    <Button variant="outline" size="sm" className="ml-auto">
                      Προτείνετε βελτίωση
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Articles List
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {searchTerm ? `Αποτελέσματα για "${searchTerm}"` : 
                   selectedCategory === "all" ? "Όλα τα άρθρα" :
                   categories.find(c => c.id === selectedCategory)?.name}
                </h2>
                <p className="text-gray-600">
                  {filteredArticles.length} άρθρα βρέθηκαν
                </p>
              </div>

              {filteredArticles.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Δεν βρέθηκαν άρθρα</h3>
                    <p className="text-gray-600 mb-4">
                      Δοκιμάστε με διαφορετικούς όρους αναζήτησης ή επιλέξτε διαφορετική κατηγορία.
                    </p>
                    <Button onClick={() => { setSearchTerm(""); setSelectedCategory("all"); }}>
                      Εμφάνιση όλων των άρθρων
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredArticles.map((article) => (
                    <Card key={article.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-6" onClick={() => setSelectedArticle(article)}>
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                                <p className="text-gray-600 mb-3">{article.description}</p>
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {article.readTime} λεπτά
                                  </Badge>
                                  <Badge 
                                    variant={article.difficulty === 'beginner' ? 'default' : 
                                            article.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                                  >
                                    {article.difficulty === 'beginner' ? 'Αρχάριος' :
                                     article.difficulty === 'intermediate' ? 'Μεσαίος' : 'Προχωρημένος'}
                                  </Badge>
                                  {article.popular && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                                      <Star className="h-3 w-3 mr-1" />
                                      Δημοφιλές
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {article.tags.slice(0, 3).map((tag, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {article.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{article.tags.length - 3} ακόμη
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 py-8 border-t text-center">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Χρειάζεστε περισσότερη βοήθεια;</h3>
          <div className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/contact">
                <MessageCircle className="h-4 w-4 mr-2" />
                Επικοινωνία
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@payrollsync.gr">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="tel:+302101234567">
                <Phone className="h-4 w-4 mr-2" />
                Τηλέφωνο
              </a>
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Ώρες λειτουργίας: Δευτέρα-Παρασκευή, 09:00-17:00 | 
            Email υποστήριξη διαθέσιμη 24/7
          </p>
        </div>
      </div>
    </div>
  );
}