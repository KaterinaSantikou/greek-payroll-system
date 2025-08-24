import React from 'react';
import { Search, Home, ArrowLeft, MapPin } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const NotFound: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Redirect to a search page or perform search action
      setLocation(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const goBack = () => {
    window.history.back();
  };

  // Common pages for Greek HR/Payroll system
  const suggestedPages = [
    { href: '/', icon: Home, title: 'Αρχική Σελίδα', description: 'Επιστροφή στην κεντρική σελίδα' },
    { href: '/employees', icon: MapPin, title: 'Υπάλληλοι', description: 'Διαχείριση προσωπικού' },
    { href: '/payroll', icon: MapPin, title: 'Μισθοδοσία', description: 'Υπολογισμοί μισθών' },
    { href: '/compliance', icon: MapPin, title: 'Συμμόρφωση', description: 'ΕΡΓΑΝΗ & νομική συμμόρφωση' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">404</span>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Η σελίδα δεν βρέθηκε
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Current URL Info */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">Ζητήθηκε URL:</span>
            </div>
            <div className="mt-1 font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
              {window.location.hostname}{location}
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Αναζήτηση
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ψάξτε για αυτό που χρειάζεστε
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="π.χ. υπάλληλοι, μισθοδοσία, αναφορές..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-404"
                />
              </div>
              <Button type="submit" data-testid="button-search-404">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Navigation Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={goBack}
              variant="outline"
              className="flex items-center gap-2 h-auto p-4"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-5 h-5" />
              <div className="text-left">
                <div className="font-semibold">Επιστροφή</div>
                <div className="text-xs text-gray-500">Προηγούμενη σελίδα</div>
              </div>
            </Button>
            
            <Link href="/">
              <Button
                variant="default"
                className="w-full flex items-center gap-2 h-auto p-4"
                data-testid="button-home-404"
              >
                <Home className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Αρχική</div>
                  <div className="text-xs opacity-80">Κεντρική σελίδα</div>
                </div>
              </Button>
            </Link>
          </div>

          {/* Suggested Pages */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 text-center">
              Δημοφιλείς σελίδες
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestedPages.map((page, index) => {
                const Icon = page.icon;
                return (
                  <Link key={index} href={page.href}>
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-4 text-left justify-start"
                      data-testid={`link-suggestion-${index}`}
                    >
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{page.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {page.description}
                        </div>
                      </div>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 border-t pt-6">
            <p className="mb-2">Χρειάζεστε βοήθεια;</p>
            <p>
              Επικοινωνήστε με την τεχνική υποστήριξη στο{' '}
              <a href="mailto:support@payrollsync.gr" className="text-blue-600 dark:text-blue-400 underline">
                support@payrollsync.gr
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;