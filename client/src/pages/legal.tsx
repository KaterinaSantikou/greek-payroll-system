import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Shield, 
  Users, 
  Clock,
  Scale,
  AlertCircle,
  FileCheck,
  UserX,
  Briefcase
} from "lucide-react";
import { 
  calculateLayoffNotice,
  checkDocumentCompliance,
  generateTerminationChecklist,
  getLegalDocumentationRequirements,
  REQUIRED_LEGAL_DOCUMENTS,
  LEGAL_RESTRICTIONS,
  LAYOFF_NOTICE_PERIODS,
  TERMINATION_PROCEDURES
} from "@/lib/legalDocumentation";

export default function LegalPage() {
  const [employeeData, setEmployeeData] = useState({
    nationality: "greek",
    age: 30,
    position: "developer",
    workType: "standard",
    hasDisability: false,
    gender: "male",
    startDate: "2020-03-15",
    hasAssets: true,
    hasPendingProjects: true
  });

  const [documents, setDocuments] = useState([
    { type: "identity-card", expiryDate: "2025-12-31", status: "valid" as const },
    { type: "afm-certificate", expiryDate: "", status: "valid" as const },
    { type: "amka-certificate", expiryDate: "", status: "valid" as const },
    { type: "medical-certificate", expiryDate: "2024-12-01", status: "valid" as const },
    { type: "work-permit", expiryDate: "", status: "missing" as const }
  ]);

  const [terminationData, setTerminationData] = useState({
    type: "resignation" as const,
    terminationDate: new Date().toISOString().split('T')[0],
    reason: ""
  });

  const [complianceResults, setComplianceResults] = useState<any>(null);
  const [layoffResults, setLayoffResults] = useState<any>(null);
  const [terminationChecklist, setTerminationChecklist] = useState<any>(null);

  const legalRequirements = getLegalDocumentationRequirements();

  const handleCheckCompliance = () => {
    const results = checkDocumentCompliance(employeeData, documents);
    setComplianceResults(results);
  };

  const handleCalculateLayoff = () => {
    const results = calculateLayoffNotice(
      employeeData.startDate,
      terminationData.terminationDate,
      'individual'
    );
    setLayoffResults(results);
  };

  const handleGenerateChecklist = () => {
    const checklist = generateTerminationChecklist(
      terminationData.type,
      employeeData
    );
    setTerminationChecklist(checklist);
  };

  const updateDocumentStatus = (type: string, field: string, value: any) => {
    setDocuments(docs => 
      docs.map(doc => 
        doc.type === type ? { ...doc, [field]: value } : doc
      )
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Scale className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">Νομική Τεκμηρίωση</h1>
          <p className="text-gray-600">Διαχείριση νομικών εγγράφων και συμμόρφωση με το εργατικό δίκαιο</p>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Έγγραφα</TabsTrigger>
          <TabsTrigger value="restrictions">Περιορισμοί</TabsTrigger>
          <TabsTrigger value="layoffs">Απολύσεις</TabsTrigger>
          <TabsTrigger value="termination">Λύση Σύμβασης</TabsTrigger>
        </TabsList>

        {/* Document Compliance */}
        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Στοιχεία Εργαζομένου
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nationality">Εθνικότητα</Label>
                      <Select 
                        value={employeeData.nationality} 
                        onValueChange={(value) => setEmployeeData({...employeeData, nationality: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="greek">Ελληνική</SelectItem>
                          <SelectItem value="eu_member">Μέλος ΕΕ</SelectItem>
                          <SelectItem value="non_eu">Εκτός ΕΕ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="age">Ηλικία</Label>
                      <Input
                        id="age"
                        type="number"
                        value={employeeData.age}
                        onChange={(e) => setEmployeeData({...employeeData, age: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="position">Θέση Εργασίας</Label>
                    <Select 
                      value={employeeData.position} 
                      onValueChange={(value) => setEmployeeData({...employeeData, position: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="developer">Προγραμματιστής</SelectItem>
                        <SelectItem value="manager">Διευθυντής</SelectItem>
                        <SelectItem value="accountant">Λογιστής</SelectItem>
                        <SelectItem value="sales">Πωλήσεις</SelectItem>
                        <SelectItem value="support">Υποστήριξη</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="workType">Τύπος Εργασίας</Label>
                    <Select 
                      value={employeeData.workType} 
                      onValueChange={(value) => setEmployeeData({...employeeData, workType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Κανονικό Ωράριο</SelectItem>
                        <SelectItem value="night_shift">Νυχτερινές Βάρδιες</SelectItem>
                        <SelectItem value="hazardous">Επικίνδυνη Εργασία</SelectItem>
                        <SelectItem value="food_handling">Χειρισμός Τροφίμων</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="startDate">Ημερομηνία Έναρξης</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={employeeData.startDate}
                      onChange={(e) => setEmployeeData({...employeeData, startDate: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasDisability"
                      checked={employeeData.hasDisability}
                      onCheckedChange={(checked) => setEmployeeData({...employeeData, hasDisability: checked})}
                    />
                    <Label htmlFor="hasDisability">Άτομο με Αναπηρία</Label>
                  </div>

                  <Button 
                    onClick={handleCheckCompliance} 
                    className="w-full" 
                    size="lg"
                  >
                    <FileCheck className="mr-2 h-4 w-4" />
                    Έλεγχος Συμμόρφωσης
                  </Button>
                </CardContent>
              </Card>

              {/* Document Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Κατάσταση Εγγράφων
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="font-medium">{doc.type}</div>
                        {doc.expiryDate && (
                          <div className="text-sm text-gray-600">
                            Λήγει: {new Date(doc.expiryDate).toLocaleDateString('el-GR')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={doc.status} 
                          onValueChange={(value) => updateDocumentStatus(doc.type, 'status', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valid">Έγκυρο</SelectItem>
                            <SelectItem value="expired">Ληγμένο</SelectItem>
                            <SelectItem value="missing">Απουσιάζει</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge 
                          variant={
                            doc.status === 'valid' ? 'default' :
                            doc.status === 'expired' ? 'destructive' : 'secondary'
                          }
                        >
                          {doc.status === 'valid' ? 'Έγκυρο' :
                           doc.status === 'expired' ? 'Ληγμένο' : 'Απουσιάζει'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Compliance Results */}
            {complianceResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Αποτελέσματα Συμμόρφωσης
                  </CardTitle>
                  <CardDescription>
                    Έλεγχος συμμόρφωσης με το ελληνικό εργατικό δίκαιο
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Summary */}
                  <div className="text-center p-4 rounded-lg" style={{
                    backgroundColor: complianceResults.compliance === 'compliant' ? '#f0f9ff' :
                                    complianceResults.compliance === 'warnings' ? '#fffbeb' : '#fef2f2'
                  }}>
                    <div className={`text-2xl font-bold ${
                      complianceResults.compliance === 'compliant' ? 'text-blue-600' :
                      complianceResults.compliance === 'warnings' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {complianceResults.compliance === 'compliant' ? 'Συμμορφούμενος' :
                       complianceResults.compliance === 'warnings' ? 'Προειδοποιήσεις' : 'Μη Συμμορφούμενος'}
                    </div>
                    <div className="text-sm text-gray-600">Κατάσταση Συμμόρφωσης</div>
                  </div>

                  {/* Missing Documents */}
                  {complianceResults.missingDocuments.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Απουσιάζουν Έγγραφα</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {complianceResults.missingDocuments.map((doc: string, index: number) => (
                          <li key={index}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Expiring Documents */}
                  {complianceResults.expiringDocuments.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Έγγραφα που Λήγουν</span>
                      </div>
                      {complianceResults.expiringDocuments.map((doc: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm text-yellow-700">
                          <span>{doc.type}</span>
                          <span>
                            {doc.daysUntilExpiry > 0 ? 
                              `Λήγει σε ${doc.daysUntilExpiry} ημέρες` : 
                              `Έχει λήξει`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Violations */}
                  {complianceResults.violations.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-800">Παραβάσεις Νομοθεσίας</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {complianceResults.violations.map((violation: string, index: number) => (
                          <li key={index}>{violation}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {complianceResults.compliance === 'compliant' && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">
                          Πλήρης Συμμόρφωση με το Εργατικό Δίκαιο
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Legal Restrictions */}
        <TabsContent value="restrictions">
          <div className="space-y-6">
            {/* Age Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ηλικιακοί Περιορισμοί
                </CardTitle>
                <CardDescription>
                  Νομικοί περιορισμοί βάσει ηλικίας εργαζομένου
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LEGAL_RESTRICTIONS.AGE_RESTRICTIONS.restrictions.map((restriction, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{restriction.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{restriction.description}</p>
                      <div className="mt-3 space-y-2">
                        {restriction.minimumAge && (
                          <div className="flex justify-between">
                            <span>Ελάχιστη ηλικία:</span>
                            <Badge variant="outline">{restriction.minimumAge} έτη</Badge>
                          </div>
                        )}
                        {restriction.ageLimit && (
                          <div className="flex justify-between">
                            <span>Όριο ηλικίας:</span>
                            <Badge variant="outline">{restriction.ageLimit} έτη</Badge>
                          </div>
                        )}
                        {(restriction as any).maxDailyHours && (
                          <div className="flex justify-between">
                            <span>Μέγ. ημερήσιες ώρες:</span>
                            <Badge variant="default">{(restriction as any).maxDailyHours}h</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Working Time Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Περιορισμοί Ωραρίου
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LEGAL_RESTRICTIONS.WORKING_TIME_RESTRICTIONS.restrictions.map((restriction, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{restriction.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{restriction.description}</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between">
                          <span>Κανονικές ώρες:</span>
                          <Badge variant="outline">{restriction.standardHours}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Μέγιστες ώρες:</span>
                          <Badge variant="destructive">{restriction.maximumHours}h</Badge>
                        </div>
                        {(restriction as any).emergencyHours && (
                          <div className="flex justify-between">
                            <span>Επείγουσες ώρες:</span>
                            <Badge variant="secondary">{(restriction as any).emergencyHours}h</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Health & Safety Restrictions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Περιορισμοί Υγείας & Ασφάλειας
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LEGAL_RESTRICTIONS.HEALTH_SAFETY_RESTRICTIONS.restrictions.map((restriction, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{restriction.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{restriction.description}</p>
                      <div className="mt-3">
                        {(restriction as any).prohibitedActivities && (
                          <div>
                            <span className="text-sm font-medium">Απαγορευμένες δραστηριότητες:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(restriction as any).prohibitedActivities.map((activity: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {activity.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(restriction as any).minimumAge && (
                          <div className="flex justify-between mt-2">
                            <span>Ελάχιστη ηλικία:</span>
                            <Badge variant="outline">{(restriction as any).minimumAge} έτη</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Layoff Notice Periods */}
        <TabsContent value="layoffs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Υπολογισμός Προειδοποίησης
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="terminationDate">Ημερομηνία Λύσης</Label>
                    <Input
                      id="terminationDate"
                      type="date"
                      value={terminationData.terminationDate}
                      onChange={(e) => setTerminationData({...terminationData, terminationDate: e.target.value})}
                    />
                  </div>

                  <Button 
                    onClick={handleCalculateLayoff} 
                    className="w-full" 
                    size="lg"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Υπολογισμός Περιόδου Προειδοποίησης
                  </Button>
                </CardContent>
              </Card>

              {layoffResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>Αποτελέσματα Υπολογισμού</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {Math.floor(layoffResults.tenureMonths / 12)} έτη
                        </div>
                        <div className="text-sm text-gray-600">Προϋπηρεσία</div>
                      </div>

                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {layoffResults.noticeDays} ημέρες
                        </div>
                        <div className="text-sm text-gray-600">Προειδοποίηση</div>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{layoffResults.description}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Βάσει {layoffResults.tenureMonths} μηνών προϋπηρεσίας
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-4 w-4 ${layoffResults.paymentInLieuAllowed ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">Δυνατότητα καταβολής αντί προειδοποίησης</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <CheckCircle className={`h-4 w-4 ${layoffResults.severanceRequired ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-sm">Απαιτείται αποζημίωση απόλυσης</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Notice Period Reference */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Περίοδοι Προειδοποίησης
                </CardTitle>
                <CardDescription>
                  Νόμιμες περίοδοι προειδοποίησης βάσει προϋπηρεσίας
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.noticePeriods.map((period, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{period.description}</div>
                        <div className="text-sm text-gray-600">
                          {period.tenureMonths} - {period.tenureLimit || '∞'} μήνες
                        </div>
                      </div>
                      <Badge variant="outline">
                        {period.noticeDays} ημέρες
                      </Badge>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <h4 className="font-medium">Ειδικές Προστασίες</h4>
                  {LAYOFF_NOTICE_PERIODS.SPECIAL_CATEGORIES.protectedCategories.map((category, index) => (
                    <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <span className="font-medium">{category.name}:</span> {category.protection}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contract Termination */}
        <TabsContent value="termination">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5" />
                    Διαδικασία Λύσης Σύμβασης
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="terminationType">Τύπος Λύσης</Label>
                    <Select 
                      value={terminationData.type} 
                      onValueChange={(value) => setTerminationData({...terminationData, type: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resignation">Οικειοθελής Παραίτηση</SelectItem>
                        <SelectItem value="dismissal-cause">Απόλυση με Αιτία</SelectItem>
                        <SelectItem value="dismissal-no-cause">Απόλυση χωρίς Αιτία</SelectItem>
                        <SelectItem value="retirement">Συνταξιοδότηση</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reason">Αιτιολογία</Label>
                    <Input
                      id="reason"
                      placeholder="Προαιρετική αιτιολογία..."
                      value={terminationData.reason}
                      onChange={(e) => setTerminationData({...terminationData, reason: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasAssets"
                        checked={employeeData.hasAssets}
                        onCheckedChange={(checked) => setEmployeeData({...employeeData, hasAssets: checked})}
                      />
                      <Label htmlFor="hasAssets">Έχει Εταιρικό Εξοπλισμό</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasPendingProjects"
                        checked={employeeData.hasPendingProjects}
                        onCheckedChange={(checked) => setEmployeeData({...employeeData, hasPendingProjects: checked})}
                      />
                      <Label htmlFor="hasPendingProjects">Έχει Εκκρεμή Έργα</Label>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerateChecklist} 
                    className="w-full" 
                    size="lg"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Δημιουργία Checklist
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Termination Checklist */}
            {terminationChecklist && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Checklist Λύσης Σύμβασης
                  </CardTitle>
                  <CardDescription>
                    Εκτιμώμενη διάρκεια: {terminationChecklist.estimatedDays} ημέρες
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {terminationChecklist.checklist.map((item: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded">
                        <Checkbox 
                          checked={item.completed}
                          onCheckedChange={(checked) => {
                            const updatedChecklist = { ...terminationChecklist };
                            updatedChecklist.checklist[index].completed = checked;
                            setTerminationChecklist(updatedChecklist);
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{item.task}</div>
                          <div className="text-sm text-gray-600">
                            Υπεύθυνος: {item.responsible} | Προθεσμία: {item.deadline}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            item.priority === 'high' ? 'destructive' :
                            item.priority === 'medium' ? 'default' : 'secondary'
                          }
                        >
                          {item.priority === 'high' ? 'Υψηλή' :
                           item.priority === 'medium' ? 'Μεσαία' : 'Χαμηλή'}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-800">
                      Πρόοδος: {terminationChecklist.checklist.filter((item: any) => item.completed).length} / {terminationChecklist.checklist.length} ολοκληρωμένα
                    </div>
                    <Progress 
                      value={(terminationChecklist.checklist.filter((item: any) => item.completed).length / terminationChecklist.checklist.length) * 100}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}