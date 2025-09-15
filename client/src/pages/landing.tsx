import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, Calculator, Shield, BarChart } from 'lucide-react';

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center mb-6">
            <div className="bg-primary text-white w-16 h-16 rounded-2xl flex items-center justify-center mr-4">
              <Users size={32} />
            </div>
            <h1 className="text-4xl font-bold text-neutral-900">PayrollSync</h1>
          </div>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Σύστημα Διαχείρισης Ανθρώπινων Πόρων & Μισθοδοσίας
          </p>
          <p className="text-lg text-neutral-500 mt-2">
            Ολοκληρωμένη λύση για τη διαχείριση εργαζομένων και υπολογισμό
            μισθοδοσίας σύμφωνα με την ελληνική νομοθεσία
          </p>

          {/* Sign In Button */}
          <div className="mt-8">
            <Button
              onClick={handleSignIn}
              size="lg"
              className="text-lg px-8 py-3"
            >
              Σύνδεση / Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Διαχείριση Εργαζομένων</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Πλήρη διαχείριση στοιχείων εργαζομένων με συμμόρφωση στην
                ελληνική νομοθεσία
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Calculator className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Υπολογισμός Μισθοδοσίας</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Αυτόματος υπολογισμός φόρων και ασφαλιστικών εισφορών με βάση τη
                νομοθεσία
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Συμμόρφωση</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Επικύρωση ΑΦΜ, ΑΜΚΑ και άλλων υποχρεωτικών στοιχείων
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Αναφορές</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Εξαγωγή αναφορών σε Excel και PDF για λογιστική χρήση
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Είσοδος στο Σύστημα</CardTitle>
              <CardDescription>
                Συνδεθείτε για πρόσβαση στο σύστημα διαχείρισης HR & Payroll
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full"
                onClick={() => (window.location.href = '/api/login')}
              >
                Σύνδεση
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-neutral-200">
          <p className="text-neutral-500">
            © 2024 PayrollSync. Όλα τα δικαιώματα διατηρούνται.
          </p>
        </div>
      </div>
    </div>
  );
}
