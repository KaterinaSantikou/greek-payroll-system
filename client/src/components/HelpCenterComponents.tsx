import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Play,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  FileText,
  Video,
  Calendar,
  Clock
} from "lucide-react";

// Video Tutorial Component
interface VideoTutorial {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  views: number;
  rating: number;
}

const videoTutorials: VideoTutorial[] = [
  {
    id: "setup-basic",
    title: "Βασική Εγκατάσταση PayrollSync",
    duration: "8:45",
    thumbnail: "/api/placeholder/400/225",
    description: "Μάθετε τα βασικά βήματα για να ξεκινήσετε με το PayrollSync",
    difficulty: "beginner",
    views: 15420,
    rating: 4.8
  },
  {
    id: "ergani-setup",
    title: "Σύνδεση με ΕΡΓΑΝΗ II",
    duration: "12:30",
    thumbnail: "/api/placeholder/400/225",
    description: "Αναλυτικός οδηγός για την ενσωμάτωση με το σύστημα ΕΡΓΑΝΗ",
    difficulty: "intermediate",
    views: 8932,
    rating: 4.9
  },
  {
    id: "payroll-processing",
    title: "Επεξεργασία Μηνιαίας Μισθοδοσίας",
    duration: "15:22",
    thumbnail: "/api/placeholder/400/225",
    description: "Βήμα προς βήμα διαδικασία για την εκτέλεση μισθοδοσίας",
    difficulty: "intermediate",
    views: 12654,
    rating: 4.7
  },
  {
    id: "digital-cards",
    title: "Υλοποίηση Ψηφιακών Καρτών Εργασίας",
    duration: "18:15",
    thumbnail: "/api/placeholder/400/225",
    description: "Πώς να ρυθμίσετε ψηφιακές κάρτες εργασίας για την επιχείρησή σας",
    difficulty: "advanced",
    views: 6789,
    rating: 4.6
  }
];

export function VideoTutorials() {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Αρχάριος';
      case 'intermediate': return 'Μεσαίος';
      case 'advanced': return 'Προχωρημένος';
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Video Tutorials</h2>
        <p className="text-gray-600">
          Μαθαίνετε με βίντεο οδηγούς από τους ειδικούς μας
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videoTutorials.map((video) => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img 
                src={video.thumbnail} 
                alt={video.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <Button size="lg" className="rounded-full">
                  <Play className="h-6 w-6 mr-2" />
                  Αναπαραγωγή
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-sm">
                {video.duration}
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {video.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={getDifficultyColor(video.difficulty)}>
                    {getDifficultyLabel(video.difficulty)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {video.views.toLocaleString()} προβολές
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">{video.rating}</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span 
                        key={i} 
                        className={`text-xs ${i < Math.floor(video.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Quick Start Guide Component
export function QuickStartGuide() {
  const steps = [
    {
      title: "Δημιουργία Λογαριασμού",
      description: "Εγγραφείτε και επιλέξτε το κατάλληλο πακέτο",
      time: "2 λεπτά",
      completed: true
    },
    {
      title: "Ρύθμιση Εταιρείας",
      description: "Προσθέστε τα στοιχεία της επιχείρησής σας",
      time: "5 λεπτά", 
      completed: true
    },
    {
      title: "Σύνδεση με ΕΡΓΑΝΗ",
      description: "Συνδέστε το σύστημα με την ΕΡΓΑΝΗ",
      time: "10 λεπτά",
      completed: false
    },
    {
      title: "Προσθήκη Εργαζομένων",
      description: "Εισάγετε τους πρώτους εργαζόμενους",
      time: "15 λεπτά",
      completed: false
    },
    {
      title: "Πρώτη Μισθοδοσία",
      description: "Εκτελέστε την πρώτη μισθοδοσία",
      time: "20 λεπτά",
      completed: false
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-yellow-500" />
          Οδηγός Γρήγορης Εκκίνησης
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Πρόοδος: {completedSteps} από {steps.length}</span>
            <span>{Math.round(progress)}% ολοκληρώθηκε</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {step.completed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{step.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {step.time}
                  </Badge>
                  {!step.completed && (
                    <Button size="sm" variant="outline">
                      Ξεκινήστε
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h5 className="font-semibold text-blue-800 mb-1">Χρειάζεστε βοήθεια;</h5>
              <p className="text-blue-700 text-sm mb-2">
                Η ομάδα υποστήριξής μας είναι εδώ για να σας βοηθήσει με την εγκατάσταση.
              </p>
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                Επικοινωνήστε μαζί μας
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// System Status Component
interface SystemStatusItem {
  name: string;
  status: 'operational' | 'maintenance' | 'degraded' | 'outage';
  description: string;
  lastUpdated: string;
}

const systemStatus: SystemStatusItem[] = [
  {
    name: "Κεντρικό Σύστημα",
    status: "operational",
    description: "Όλες οι λειτουργίες διαθέσιμες",
    lastUpdated: "πριν από 5 λεπτά"
  },
  {
    name: "ΕΡΓΑΝΗ Σύνδεση",
    status: "operational", 
    description: "Συγχρονισμός λειτουργεί κανονικά",
    lastUpdated: "πριν από 2 λεπτά"
  },
  {
    name: "ΕΦΚΑ Σύνδεση",
    status: "operational",
    description: "Υποβολές ΑΠΔ διαθέσιμες",
    lastUpdated: "πριν από 10 λεπτά"
  },
  {
    name: "Τραπεζικές Μεταφορές",
    status: "operational",
    description: "SEPA πληρωμές λειτουργούν κανονικά",
    lastUpdated: "πριν από 1 ώρα"
  },
  {
    name: "Ψηφιακές Κάρτες",
    status: "maintenance",
    description: "Προγραμματισμένη συντήρηση έως 14:00",
    lastUpdated: "πριν από 30 λεπτά"
  }
];

export function SystemStatus() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-700 bg-green-100 border-green-200';
      case 'maintenance': return 'text-yellow-700 bg-yellow-100 border-yellow-200';  
      case 'degraded': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'outage': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'operational': return 'Λειτουργικό';
      case 'maintenance': return 'Συντήρηση';
      case 'degraded': return 'Υποβαθμισμένο';
      case 'outage': return 'Διακοπή';
      default: return 'Άγνωστο';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4" />;
      case 'maintenance': return <Clock className="h-4 w-4" />;
      case 'degraded': return <AlertCircle className="h-4 w-4" />;
      case 'outage': return <AlertCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Κατάσταση Συστήματος
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {systemStatus.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                  {getStatusLabel(item.status)}
                </div>
                <div>
                  <h5 className="font-medium">{item.name}</h5>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {item.lastUpdated}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Συνολική Διαθεσιμότητα</span>
            <span className="text-sm font-bold text-green-600">99.9%</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Τελευταίες 30 ημέρες
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4">
          <ExternalLink className="h-4 w-4 mr-2" />
          Ιστορικό Κατάστασης
        </Button>
      </CardContent>
    </Card>
  );
}