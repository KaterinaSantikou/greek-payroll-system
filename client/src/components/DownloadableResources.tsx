import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  FileText,
  File,
  FileSpreadsheet,
  Video,
  Calendar,
  Star,
  Eye,
  Clock
} from "lucide-react";

interface DownloadableResource {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'excel' | 'word' | 'video' | 'template';
  category: string;
  size: string;
  downloads: number;
  rating: number;
  lastUpdated: string;
  downloadUrl: string;
  featured: boolean;
}

const resources: DownloadableResource[] = [
  {
    id: "payroll-checklist-2024",
    title: "Μηνιαίο Checklist Μισθοδοσίας 2024",
    description: "Πλήρης λίστα ελέγχου για την εκτέλεση μηνιαίας μισθοδοσίας σύμφωνα με την ελληνική νομοθεσία",
    type: "pdf",
    category: "Μισθοδοσία",
    size: "2.4 MB",
    downloads: 15420,
    rating: 4.9,
    lastUpdated: "15/12/2024",
    downloadUrl: "/downloads/payroll-checklist-2024.pdf",
    featured: true
  },
  {
    id: "ergani-setup-guide",
    title: "Οδηγός Εγκατάστασης ΕΡΓΑΝΗ II",
    description: "Αναλυτικός οδηγός βήμα προς βήμα για την ενσωμάτωση με το σύστημα ΕΡΓΑΝΗ",
    type: "pdf",
    category: "ΕΡΓΑΝΗ",
    size: "5.7 MB",
    downloads: 8932,
    rating: 4.8,
    lastUpdated: "10/12/2024",
    downloadUrl: "/downloads/ergani-setup-guide.pdf",
    featured: true
  },
  {
    id: "tax-calculator-2025",
    title: "Υπολογιστής Φόρων 2025",
    description: "Excel υπολογιστής με τις νέες φορολογικές κλίμακες και το αφορολόγητο όριο",
    type: "excel",
    category: "Φορολογία",
    size: "1.2 MB",
    downloads: 12654,
    rating: 4.7,
    lastUpdated: "01/12/2024",
    downloadUrl: "/downloads/tax-calculator-2025.xlsx",
    featured: true
  },
  {
    id: "employee-contract-template",
    title: "Πρότυπο Σύμβασης Εργασίας",
    description: "Τυποποιημένο πρότυπο σύμβασης εργασίας σύμφωνα με την ελληνική νομοθεσία",
    type: "word",
    category: "Έγγραφα",
    size: "845 KB",
    downloads: 9876,
    rating: 4.6,
    lastUpdated: "20/11/2024",
    downloadUrl: "/downloads/employee-contract-template.docx",
    featured: false
  },
  {
    id: "digital-work-cards-video",
    title: "Βίντεο: Ψηφιακές Κάρτες Εργασίας",
    description: "Οδηγός βίντεο για την υλοποίηση ψηφιακών καρτών εργασίας στην επιχείρησή σας",
    type: "video",
    category: "Εκπαίδευση",
    size: "45.2 MB",
    downloads: 6789,
    rating: 4.9,
    lastUpdated: "05/12/2024",
    downloadUrl: "/downloads/digital-work-cards-tutorial.mp4",
    featured: false
  },
  {
    id: "efka-rates-2025",
    title: "Πίνακας Εισφορών ΕΦΚΑ 2025",
    description: "Ενημερωμένος πίνακας με τις εισφορές ΕΦΚΑ για το 2025",
    type: "excel",
    category: "ΕΦΚΑ",
    size: "567 KB",
    downloads: 11234,
    rating: 4.8,
    lastUpdated: "18/12/2024",
    downloadUrl: "/downloads/efka-rates-2025.xlsx",
    featured: false
  },
  {
    id: "leave-policy-template",
    title: "Πρότυπο Πολιτικής Αδειών",
    description: "Έτοιμο πρότυπο για τη δημιουργία πολιτικής διαχείρισης αδειών εργαζομένων",
    type: "word",
    category: "Πολιτικές",
    size: "1.1 MB",
    downloads: 7543,
    rating: 4.5,
    lastUpdated: "25/11/2024",
    downloadUrl: "/downloads/leave-policy-template.docx",
    featured: false
  },
  {
    id: "payroll-calendar-2025",
    title: "Ημερολόγιο Μισθοδοσίας 2025",
    description: "Ημερολόγιο με όλες τις σημαντικές ημερομηνίες για τη μισθοδοσία το 2025",
    type: "pdf",
    category: "Προγραμματισμός",
    size: "892 KB",
    downloads: 13567,
    rating: 4.9,
    lastUpdated: "30/11/2024",
    downloadUrl: "/downloads/payroll-calendar-2025.pdf",
    featured: false
  },
  {
    id: "compliance-checklist",
    title: "Checklist Συμμόρφωσης HR",
    description: "Πλήρης λίστα ελέγχου για τη διασφάλιση συμμόρφωσης με την ελληνική εργατική νομοθεσία",
    type: "pdf",
    category: "Συμμόρφωση",
    size: "1.8 MB",
    downloads: 9321,
    rating: 4.7,
    lastUpdated: "12/12/2024",
    downloadUrl: "/downloads/compliance-checklist.pdf",
    featured: false
  },
  {
    id: "sepa-payment-template",
    title: "Πρότυπο SEPA Πληρωμών",
    description: "Excel πρότυπο για τη δημιουργία αρχείων SEPA Credit Transfer",
    type: "excel",
    category: "Πληρωμές",
    size: "654 KB",
    downloads: 8765,
    rating: 4.6,
    lastUpdated: "08/12/2024",
    downloadUrl: "/downloads/sepa-payment-template.xlsx",
    featured: false
  }
];

export default function DownloadableResources() {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-5 w-5 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'word': return <File className="h-5 w-5 text-blue-500" />;
      case 'video': return <Video className="h-5 w-5 text-purple-500" />;
      case 'template': return <Calendar className="h-5 w-5 text-orange-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf': return 'PDF';
      case 'excel': return 'Excel';
      case 'word': return 'Word';
      case 'video': return 'Video';
      case 'template': return 'Template';
      default: return type.toUpperCase();
    }
  };

  const featuredResources = resources.filter(resource => resource.featured);
  const otherResources = resources.filter(resource => !resource.featured);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Πόροι & Λήψεις</h2>
        <p className="text-gray-600">
          Κατεβάστε χρήσιμους οδηγούς, πρότυπα και εργαλεία για τη διαχείριση της μισθοδοσίας σας
        </p>
      </div>

      {/* Featured Resources */}
      {featuredResources.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Προτεινόμενα
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredResources.map((resource) => (
              <Card key={resource.id} className="hover:shadow-lg transition-shadow border-2 border-yellow-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getFileIcon(resource.type)}
                      <Badge variant="outline" className="text-xs">
                        {getFileTypeLabel(resource.type)}
                      </Badge>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      <Star className="h-3 w-3 mr-1" />
                      Προτείνεται
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {resource.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {resource.downloads.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      {resource.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resource.lastUpdated}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {resource.category}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {resource.size}
                      </div>
                    </div>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Λήψη
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Resources */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Όλοι οι Πόροι</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {otherResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  {getFileIcon(resource.type)}
                  <Badge variant="outline" className="text-xs">
                    {getFileTypeLabel(resource.type)}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {resource.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {resource.downloads.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    {resource.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {resource.lastUpdated}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      {resource.category}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {resource.size}
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Λήψη
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Download Statistics */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl text-blue-800">Στατιστικά Λήψεων</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">
                {resources.reduce((sum, r) => sum + r.downloads, 0).toLocaleString()}
              </div>
              <div className="text-sm text-blue-600">Συνολικές Λήψεις</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{resources.length}</div>
              <div className="text-sm text-blue-600">Διαθέσιμοι Πόροι</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">
                {(resources.reduce((sum, r) => sum + r.rating, 0) / resources.length).toFixed(1)}
              </div>
              <div className="text-sm text-blue-600">Μέση Αξιολόγηση</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">24/7</div>
              <div className="text-sm text-blue-600">Διαθεσιμότητα</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}