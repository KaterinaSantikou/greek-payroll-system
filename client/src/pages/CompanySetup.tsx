/**
 * Company Setup - New user onboarding for Greek business registration
 * Handles company registration, ERGANI II integration, and employee discovery
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Link,
  Database,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  Eye,
  EyeOff
} from 'lucide-react';

interface CompanyInfo {
  // Basic Company Information
  name: string;
  legalName: string;
  taxisCode: string;
  afmNumber: string;
  doyOffice: string;
  
  // Address Information
  address: string;
  city: string;
  postalCode: string;
  prefecture: string;
  
  // Contact Information
  phone: string;
  email: string;
  website: string;
  
  // Business Information
  industry: string;
  employeeCount: string;
  foundedYear: string;
  
  // ERGANI II Credentials
  erganiUsername: string;
  erganiPassword: string;
  erganiEnvironment: 'production' | 'testing';
}

interface DiscoveredEmployee {
  id: string;
  firstName: string;
  lastName: string;
  afm: string;
  amka: string;
  startDate: string;
  position: string;
  department: string;
  status: 'active' | 'terminated' | 'suspended';
  lastErganiUpdate: string;
}

export default function CompanySetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [discoveredEmployees, setDiscoveredEmployees] = useState<DiscoveredEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    legalName: '',
    taxisCode: '',
    afmNumber: '',
    doyOffice: '',
    address: '',
    city: '',
    postalCode: '',
    prefecture: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    employeeCount: '',
    foundedYear: '',
    erganiUsername: '',
    erganiPassword: '',
    erganiEnvironment: 'production'
  });

  const totalSteps = 4;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const industries = [
    { value: 'hospitality', label: 'Ξενοδοχεία & Τουρισμός' },
    { value: 'retail', label: 'Λιανικό Εμπόριο' },
    { value: 'manufacturing', label: 'Βιομηχανία' },
    { value: 'services', label: 'Υπηρεσίες' },
    { value: 'healthcare', label: 'Υγεία' },
    { value: 'construction', label: 'Κατασκευές' },
    { value: 'transport', label: 'Μεταφορές' },
    { value: 'food', label: 'Εστίαση' },
    { value: 'technology', label: 'Τεχνολογία' },
    { value: 'other', label: 'Άλλο' }
  ];

  const prefectures = [
    'Αττική', 'Θεσσαλονίκη', 'Ηράκλειο', 'Πάτρα', 'Λάρισα', 'Βόλος', 
    'Ιωάννινα', 'Καβάλα', 'Χανιά', 'Ρόδος', 'Σέρρες', 'Κατερίνη', 
    'Τρίκαλα', 'Καλαμάτα', 'Κοζάνη', 'Άλλη'
  ];

  const handleInputChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const testErganiConnection = async () => {
    setIsLoading(true);
    setConnectionStatus('testing');

    try {
      // Simulate ERGANI II API connection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock discovered employees from ERGANI II
      const mockEmployees: DiscoveredEmployee[] = [
        {
          id: '1',
          firstName: 'Μαρία',
          lastName: 'Παπαδοπούλου',
          afm: '123456789',
          amka: '12345678901',
          startDate: '2023-01-15',
          position: 'Υπεύθυνη Λογιστηρίου',
          department: 'Διοίκηση',
          status: 'active',
          lastErganiUpdate: '2024-01-20T10:30:00Z'
        },
        {
          id: '2',
          firstName: 'Νίκος',
          lastName: 'Γιαννόπουλος',
          afm: '987654321',
          amka: '98765432109',
          startDate: '2023-03-01',
          position: 'Τεχνικός Υποστήριξης',
          department: 'IT',
          status: 'active',
          lastErganiUpdate: '2024-01-20T10:30:00Z'
        },
        {
          id: '3',
          firstName: 'Ελένη',
          lastName: 'Κωνσταντινίδου',
          afm: '456789123',
          amka: '45678912345',
          startDate: '2023-06-15',
          position: 'Υπάλληλος Πωλήσεων',
          department: 'Πωλήσεις',
          status: 'active',
          lastErganiUpdate: '2024-01-19T14:15:00Z'
        },
        {
          id: '4',
          firstName: 'Γιάννης',
          lastName: 'Δημητρίου',
          afm: '321654987',
          amka: '32165498765',
          startDate: '2022-11-01',
          position: 'Διευθυντής Πωλήσεων',
          department: 'Πωλήσεις',
          status: 'terminated',
          lastErganiUpdate: '2023-12-31T23:59:00Z'
        }
      ];

      setDiscoveredEmployees(mockEmployees);
      setSelectedEmployees(mockEmployees.filter(emp => emp.status === 'active').map(emp => emp.id));
      setConnectionStatus('success');
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    
    try {
      // Simulate company setup and employee import
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Setup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-lg flex items-center justify-center mr-3">
              <Building2 size={24} />
            </div>
            <h1 className="text-2xl font-bold">Ρύθμιση Εταιρείας</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Ολοκληρώστε τα στοιχεία της εταιρείας σας για σύνδεση με το ΕΡΓΑΝΗ ΙΙ
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Βήμα {currentStep} από {totalSteps}</span>
            <span>{Math.round(progressPercentage)}% ολοκληρωμένο</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h2 className="text-xl font-semibold">Βασικές Πληροφορίες Εταιρείας</h2>
                  <p className="text-gray-600">Συμπληρώστε τα βασικά στοιχεία της εταιρείας σας</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Εμπορική Επωνυμία *</Label>
                    <Input
                      id="name"
                      value={companyInfo.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="π.χ. ACME Α.Ε."
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="legalName">Νομική Επωνυμία *</Label>
                    <Input
                      id="legalName"
                      value={companyInfo.legalName}
                      onChange={(e) => handleInputChange('legalName', e.target.value)}
                      placeholder="π.χ. ACME ΑΝΩΝΥΜΗ ΕΤΑΙΡΕΙΑ"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="afmNumber">Α.Φ.Μ. *</Label>
                    <Input
                      id="afmNumber"
                      value={companyInfo.afmNumber}
                      onChange={(e) => handleInputChange('afmNumber', e.target.value)}
                      placeholder="123456789"
                      maxLength={9}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="doyOffice">Δ.Ο.Υ. *</Label>
                    <Input
                      id="doyOffice"
                      value={companyInfo.doyOffice}
                      onChange={(e) => handleInputChange('doyOffice', e.target.value)}
                      placeholder="π.χ. Α' ΑΘΗΝΩΝ"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Κλάδος Δραστηριότητας *</Label>
                    <Select value={companyInfo.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε κλάδο" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map(industry => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="employeeCount">Αριθμός Εργαζομένων *</Label>
                    <Select value={companyInfo.employeeCount} onValueChange={(value) => handleInputChange('employeeCount', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε εύρος" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 εργαζόμενοι</SelectItem>
                        <SelectItem value="6-20">6-20 εργαζόμενοι</SelectItem>
                        <SelectItem value="21-50">21-50 εργαζόμενοι</SelectItem>
                        <SelectItem value="51-100">51-100 εργαζόμενοι</SelectItem>
                        <SelectItem value="100+">100+ εργαζόμενοι</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address">Διεύθυνση *</Label>
                    <Input
                      id="address"
                      value={companyInfo.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="π.χ. Λεωφ. Συγγρού 123"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Πόλη *</Label>
                    <Input
                      id="city"
                      value={companyInfo.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="π.χ. Αθήνα"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCode">Τ.Κ. *</Label>
                    <Input
                      id="postalCode"
                      value={companyInfo.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      placeholder="π.χ. 11741"
                      maxLength={5}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="prefecture">Νομός *</Label>
                    <Select value={companyInfo.prefecture} onValueChange={(value) => handleInputChange('prefecture', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε νομό" />
                      </SelectTrigger>
                      <SelectContent>
                        {prefectures.map(prefecture => (
                          <SelectItem key={prefecture} value={prefecture}>
                            {prefecture}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="phone">Τηλέφωνο *</Label>
                    <Input
                      id="phone"
                      value={companyInfo.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="210 1234567"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="info@company.gr"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Ιστοσελίδα</Label>
                    <Input
                      id="website"
                      value={companyInfo.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="www.company.gr"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h2 className="text-xl font-semibold">TAXIS Κωδικοί & ΕΡΓΑΝΗ ΙΙ</h2>
                  <p className="text-gray-600">Συνδέστε την εταιρεία σας με το σύστημα ΕΡΓΑΝΗ ΙΙ</p>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Ασφαλής Σύνδεση:</strong> Τα διαπιστευτήριά σας κρυπτογραφούνται και αποθηκεύονται με ασφάλεια. 
                    Χρησιμοποιούνται μόνο για τη σύνδεση με τα επίσημα συστήματα του Υπουργείου Εργασίας.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="taxisCode">TAXIS Κωδικός Εταιρείας *</Label>
                    <Input
                      id="taxisCode"
                      value={companyInfo.taxisCode}
                      onChange={(e) => handleInputChange('taxisCode', e.target.value)}
                      placeholder="π.χ. 1234567890123"
                      maxLength={13}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Ο 13-ψήφιος κωδικός που χρησιμοποιείτε στο TAXIS για τις δηλώσεις ΕΡΓΑΝΗ ΙΙ
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="erganiUsername">ΕΡΓΑΝΗ ΙΙ Username *</Label>
                    <Input
                      id="erganiUsername"
                      value={companyInfo.erganiUsername}
                      onChange={(e) => handleInputChange('erganiUsername', e.target.value)}
                      placeholder="username"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="erganiPassword">ΕΡΓΑΝΗ ΙΙ Password *</Label>
                    <div className="relative">
                      <Input
                        id="erganiPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={companyInfo.erganiPassword}
                        onChange={(e) => handleInputChange('erganiPassword', e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="erganiEnvironment">Περιβάλλον ΕΡΓΑΝΗ ΙΙ</Label>
                    <Select value={companyInfo.erganiEnvironment} onValueChange={(value: 'production' | 'testing') => handleInputChange('erganiEnvironment', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Παραγωγή (Production)</SelectItem>
                        <SelectItem value="testing">Δοκιμαστικό (Testing)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                      Επιλέξτε "Δοκιμαστικό" μόνο αν χρησιμοποιείτε το δοκιμαστικό περιβάλλον του ΕΡΓΑΝΗ ΙΙ
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button
                    onClick={testErganiConnection}
                    disabled={!companyInfo.taxisCode || !companyInfo.erganiUsername || !companyInfo.erganiPassword || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Δοκιμή Σύνδεσης...
                      </>
                    ) : (
                      <>
                        <Link className="mr-2 h-4 w-4" />
                        Δοκιμή Σύνδεσης ΕΡΓΑΝΗ ΙΙ
                      </>
                    )}
                  </Button>

                  {connectionStatus === 'success' && (
                    <Alert className="mt-4 border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Επιτυχής Σύνδεση!</strong> Η σύνδεση με το ΕΡΓΑΝΗ ΙΙ ολοκληρώθηκε με επιτυχία. 
                        Βρέθηκαν {discoveredEmployees.length} εργαζόμενοι.
                      </AlertDescription>
                    </Alert>
                  )}

                  {connectionStatus === 'error' && (
                    <Alert className="mt-4 border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Σφάλμα Σύνδεσης!</strong> Δεν ήταν δυνατή η σύνδεση με το ΕΡΓΑΝΗ ΙΙ. 
                        Ελέγξτε τα διαπιστευτήρια και δοκιμάστε ξανά.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Users className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h2 className="text-xl font-semibold">Εργαζόμενοι από ΕΡΓΑΝΗ ΙΙ</h2>
                  <p className="text-gray-600">
                    Βρέθηκαν {discoveredEmployees.length} εργαζόμενοι στο σύστημα ΕΡΓΑΝΗ ΙΙ
                  </p>
                </div>

                {discoveredEmployees.length > 0 ? (
                  <>
                    <Alert>
                      <Database className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Αυτόματη Ανίχνευση:</strong> Οι παρακάτω εργαζόμενοι βρέθηκαν στο σύστημα ΕΡΓΑΝΗ ΙΙ 
                        και θα εισαχθούν αυτόματα στο PayrollSync. Μπορείτε να επιλέξετε ποιους θέλετε να συμπεριλάβετε.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Επιλογή Εργαζομένων</h3>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedEmployees(discoveredEmployees.map(emp => emp.id))}
                          >
                            Επιλογή Όλων
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedEmployees([])}
                          >
                            Καμία Επιλογή
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {discoveredEmployees.map(employee => (
                          <div
                            key={employee.id}
                            className={`border rounded-lg p-4 transition-colors ${
                              selectedEmployees.includes(employee.id) 
                                ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <Checkbox
                                  checked={selectedEmployees.includes(employee.id)}
                                  onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium">
                                      {employee.firstName} {employee.lastName}
                                    </h4>
                                    <Badge 
                                      variant={employee.status === 'active' ? 'default' : 
                                              employee.status === 'terminated' ? 'destructive' : 'secondary'}
                                    >
                                      {employee.status === 'active' ? 'Ενεργός' :
                                       employee.status === 'terminated' ? 'Απολυμένος' : 'Αναστολή'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                    <div><strong>Θέση:</strong> {employee.position}</div>
                                    <div><strong>Τμήμα:</strong> {employee.department}</div>
                                    <div><strong>Έναρξη:</strong> {new Date(employee.startDate).toLocaleDateString('el-GR')}</div>
                                    <div><strong>A.Φ.Μ.:</strong> {employee.afm}</div>
                                  </div>
                                  
                                  <div className="flex items-center text-xs text-gray-500 mt-2">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Τελευταία ενημέρωση ΕΡΓΑΝΗ ΙΙ: {new Date(employee.lastErganiUpdate).toLocaleString('el-GR')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Περίληψη Εισαγωγής</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Συνολικοί:</span>
                          <span className="ml-2 font-medium">{discoveredEmployees.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Επιλεγμένοι:</span>
                          <span className="ml-2 font-medium text-blue-600">{selectedEmployees.length}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Ενεργοί:</span>
                          <span className="ml-2 font-medium text-green-600">
                            {discoveredEmployees.filter(emp => emp.status === 'active').length}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Απολυμένοι:</span>
                          <span className="ml-2 font-medium text-red-600">
                            {discoveredEmployees.filter(emp => emp.status === 'terminated').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      Δεν βρέθηκαν εργαζόμενοι στο σύστημα ΕΡΓΑΝΗ ΙΙ. Μπορείτε να προσθέσετε εργαζόμενους 
                      μετά την ολοκλήρωση της εγκατάστασης.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h2 className="text-xl font-semibold">Επιβεβαίωση Εγκατάστασης</h2>
                  <p className="text-gray-600">Ελέγξτε τις ρυθμίσεις πριν την ολοκλήρωση</p>
                </div>

                <div className="space-y-6">
                  {/* Company Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Στοιχεία Εταιρείας</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Επωνυμία:</span>
                          <span className="ml-2">{companyInfo.name}</span>
                        </div>
                        <div>
                          <span className="font-medium">Α.Φ.Μ.:</span>
                          <span className="ml-2">{companyInfo.afmNumber}</span>
                        </div>
                        <div>
                          <span className="font-medium">Κλάδος:</span>
                          <span className="ml-2">
                            {industries.find(ind => ind.value === companyInfo.industry)?.label}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Εργαζόμενοι:</span>
                          <span className="ml-2">{companyInfo.employeeCount}</span>
                        </div>
                        <div>
                          <span className="font-medium">Πόλη:</span>
                          <span className="ml-2">{companyInfo.city}</span>
                        </div>
                        <div>
                          <span className="font-medium">Email:</span>
                          <span className="ml-2">{companyInfo.email}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ERGANI Connection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Σύνδεση ΕΡΓΑΝΗ ΙΙ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>Επιτυχής σύνδεση με TAXIS κωδικό: {companyInfo.taxisCode}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>Περιβάλλον: {companyInfo.erganiEnvironment === 'production' ? 'Παραγωγή' : 'Δοκιμαστικό'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Employee Import */}
                  {discoveredEmployees.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Εισαγωγή Εργαζομένων</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <span>
                            Θα εισαχθούν {selectedEmployees.length} από {discoveredEmployees.length} εργαζόμενοι
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Όλα τα στοιχεία θα συγχρονιστούν αυτόματα από το ΕΡΓΑΝΗ ΙΙ
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Αυτόματος Συγχρονισμός:</strong> Το σύστημα θα συγχρονίζεται καθημερινά με το ΕΡΓΑΝΗ ΙΙ 
                      για ενημερώσεις εργαζομένων, νέες προσλήψεις και τερματισμούς συμβολαίων.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Προηγούμενο
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && (!companyInfo.name || !companyInfo.afmNumber || !companyInfo.industry)) ||
                    (currentStep === 2 && connectionStatus !== 'success')
                  }
                >
                  Επόμενο
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ολοκλήρωση...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ολοκλήρωση Εγκατάστασης
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}