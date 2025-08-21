import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Video, 
  Download, 
  HelpCircle, 
  Activity,
  Rocket,
  Users,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink
} from "lucide-react";
import HelpCenter from "./HelpCenter";
import { VideoTutorials, QuickStartGuide, SystemStatus } from "@/components/HelpCenterComponents";
import DownloadableResources from "@/components/DownloadableResources";

export default function ComprehensiveHelpCenter() {
  const [activeTab, setActiveTab] = useState("documentation");

  const supportChannels = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Live Chat",
      description: "Άμεση βοήθεια από την ομάδα υποστήριξής μας",
      availability: "Δευτέρα-Παρασκευή, 09:00-18:00",
      action: "Ξεκινήστε Chat",
      href: "/chat"
    },
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Τηλεφωνική Υποστήριξη", 
      description: "Καλέστε μας για άμεση βοήθεια",
      availability: "210-1234567",
      action: "Καλέστε Τώρα",
      href: "tel:+302101234567"
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email Υποστήριξη",
      description: "Στείλτε μας email για λεπτομερή βοήθεια",
      availability: "Απάντηση εντός 2 ωρών",
      action: "Στείλτε Email",
      href: "mailto:support@payrollsync.gr"
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Κέντρο Βοήθειας PayrollSync</h1>
        <p className="text-xl text-gray-600 mb-6">
          Όλα όσα χρειάζεστε για να χρησιμοποιήσετε αποτελεσματικά το PayrollSync
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">500+</div>
            <div className="text-sm text-gray-600">Άρθρα</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">50+</div>
            <div className="text-sm text-gray-600">Video Tutorials</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">100+</div>
            <div className="text-sm text-gray-600">Πρότυπα</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">24/7</div>
            <div className="text-sm text-gray-600">Υποστήριξη</div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Τεκμηρίωση</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Videos</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Λήψεις</span>
          </TabsTrigger>
          <TabsTrigger value="quickstart" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Γρήγορη Έναρξη</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Κατάσταση</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Υποστήριξη</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="space-y-6">
          <HelpCenter />
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <VideoTutorials />
        </TabsContent>

        <TabsContent value="downloads" className="space-y-6">
          <DownloadableResources />
        </TabsContent>

        <TabsContent value="quickstart" className="space-y-6">
          <QuickStartGuide />
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SystemStatus />
            </div>
            <div className="space-y-6">
              {/* Maintenance Window */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Προγραμματισμένη Συντήρηση</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="font-medium text-yellow-800">Κυριακή, 25 Αυγούστου</div>
                      <div className="text-sm text-yellow-700">02:00 - 04:00</div>
                      <div className="text-sm text-yellow-600 mt-1">
                        Ενημέρωση συστήματος ΕΡΓΑΝΗ
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Περισσότερες Πληροφορίες
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Updates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Πρόσφατες Ενημερώσεις</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium">v2.8.1 - Νέες Φορολογικές Κλίμακες</div>
                      <div className="text-gray-600">20 Δεκεμβρίου 2024</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">v2.8.0 - Ψηφιακές Κάρτες Εργασίας</div>
                      <div className="text-gray-600">15 Δεκεμβρίου 2024</div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Changelog
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Επικοινωνήστε Μαζί Μας</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Η ομάδα υποστήριξής μας είναι εδώ για να σας βοηθήσει. 
              Επιλέξτε τον καλύτερο τρόπο επικοινωνίας για εσάς.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {supportChannels.map((channel, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      {channel.icon}
                    </div>
                    <CardTitle className="text-lg">{channel.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">{channel.description}</p>
                  <div className="text-sm font-medium text-green-700">
                    {channel.availability}
                  </div>
                  <Button className="w-full" asChild>
                    <a href={channel.href}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {channel.action}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl">Συχνές Ερωτήσεις Υποστήριξης</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Ποιες είναι οι ώρες υποστήριξης;</h4>
                    <p className="text-sm text-gray-600">
                      Η υποστήριξη μας είναι διαθέσιμη Δευτέρα-Παρασκευή από 09:00 έως 18:00. 
                      Για επείγοντα θέματα, υπάρχει 24/7 email υποστήριξη.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Πώς μπορώ να αναφέρω ένα bug;</h4>
                    <p className="text-sm text-gray-600">
                      Χρησιμοποιήστε το live chat ή στείλτε email με λεπτομερή περιγραφή του προβλήματος 
                      και screenshots αν είναι δυνατόν.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Υπάρχει κόστος για την υποστήριξη;</h4>
                    <p className="text-sm text-gray-600">
                      Η βασική υποστήριξη είναι δωρεάν για όλους τους χρήστες. 
                      Για εκπαίδευση και consulting υπάρχουν ξεχωριστά πακέτα.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Πόσο γρήγορα θα πάρω απάντηση;</h4>
                    <p className="text-sm text-gray-600">
                      Live chat: Άμεσα | Email: Εντός 2 ωρών | Τηλέφωνο: Άμεσα
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Μπορώ να κλείσω ραντεβού για training;</h4>
                    <p className="text-sm text-gray-600">
                      Ναι! Προσφέρουμε εξατομικευμένα training sessions. 
                      Επικοινωνήστε μαζί μας για να κλείσετε ραντεβού.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Υποστηρίζετε remote assistance;</h4>
                    <p className="text-sm text-gray-600">
                      Ναι, μπορούμε να συνδεθούμε απομακρυσμένα για να σας βοηθήσουμε 
                      με τη ρύθμιση και επίλυση προβλημάτων.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-blue-800 mb-4">
                  Επικοινωνία & Διευθύνσεις
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Κεντρικά Γραφεία</h4>
                    <p className="text-blue-600">
                      Λεωφόρος Κηφισίας 123<br />
                      11526 Αθήνα<br />
                      Τ: 210-1234567
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Γραφείο Θεσσαλονίκης</h4>
                    <p className="text-blue-600">
                      Τσιμισκή 45<br />
                      54622 Θεσσαλονίκη<br />
                      Τ: 2310-987654
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-700 mb-2">Ηλεκτρονική Επικοινωνία</h4>
                    <p className="text-blue-600">
                      support@payrollsync.gr<br />
                      sales@payrollsync.gr<br />
                      info@payrollsync.gr
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}