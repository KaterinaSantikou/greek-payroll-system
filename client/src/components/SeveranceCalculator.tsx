import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Euro, FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Severance calculation form schema
const severanceCalculationSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  contractId: z.string().min(1, "Contract ID is required"),
  terminationType: z.enum(['dismissal', 'resignation', 'expiry', 'mutual_agreement'], {
    required_error: "Please select a termination type"
  }),
  terminationCause: z.string().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  noticeDate: z.string().optional(),
  yearsOfService: z.number().min(0, "Years of service must be positive").max(50, "Years of service seems too high"),
  lastMonthlyWage: z.number().min(0, "Monthly wage must be positive"),
  unusedLeaveDays: z.number().min(0, "Unused leave days must be positive").max(365, "Unused leave days seems too high"),
  pendingAllowances: z.record(z.number()).default({}),
  pendingTips: z.number().min(0, "Tips must be positive").default(0),
  requireApproval: z.boolean().default(true)
});

type SeveranceFormData = z.infer<typeof severanceCalculationSchema>;

interface SeveranceCalculationResult {
  severanceAmount: number;
  unpaidWages: number;
  unusedLeaveAmount: number;
  holidayAllowanceAmount: number;
  proRataEasterBonus: number;
  proRataChristmasBonus: number;
  otherBalances: number;
  grossTotal: number;
  taxAmount: number;
  socialSecurityAmount: number;
  netTotal: number;
  explanationGr: string;
  explanationEn: string;
  finalPayLines: Array<{
    lineType: string;
    code: string;
    description: string;
    descriptionGr: string;
    calculatedAmount: number;
    legalReference?: string;
    calculationFormula?: string;
  }>;
}

interface ProcessTerminationResult {
  success: boolean;
  status: 'pending_approval' | 'completed';
  approvalId?: string;
  message?: string;
  previewCalculation?: SeveranceCalculationResult;
  terminationRecord?: any;
  severanceCalculation?: any;
  calculationOutputs?: SeveranceCalculationResult;
}

export function SeveranceCalculator() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [calculation, setCalculation] = useState<SeveranceCalculationResult | null>(null);
  const [language, setLanguage] = useState<'en' | 'gr'>('en');

  const form = useForm<SeveranceFormData>({
    resolver: zodResolver(severanceCalculationSchema),
    defaultValues: {
      terminationType: 'dismissal',
      yearsOfService: 0,
      lastMonthlyWage: 0,
      unusedLeaveDays: 0,
      pendingTips: 0,
      pendingAllowances: {},
      requireApproval: true
    }
  });

  // Get validation rules
  const { data: validationRules } = useQuery({
    queryKey: ['/api/severance/validation/termination-rules']
  });

  // Calculate severance (preview)
  const calculateMutation = useMutation({
    mutationFn: async (data: SeveranceFormData) => {
      const response = await fetch('/api/severance/calculate-severance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to calculate');
      return await response.json();
    },
    onSuccess: (result) => {
      setCalculation(result.calculation);
      setCurrentStep(2);
      toast({
        title: "Calculation Complete",
        description: "Severance calculation has been generated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate severance. Please check your inputs.",
        variant: "destructive"
      });
    }
  });

  // Process termination (execute)
  const processMutation = useMutation({
    mutationFn: async (data: SeveranceFormData) => {
      const response = await fetch('/api/severance/process-termination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to process');
      return await response.json() as ProcessTerminationResult;
    },
    onSuccess: (result) => {
      if (result.status === 'pending_approval') {
        toast({
          title: "Approval Required",
          description: result.message || "High-value severance requires approval.",
          variant: "default"
        });
        setCurrentStep(4); // Approval pending step
      } else {
        toast({
          title: "Termination Processed",
          description: "Employee termination has been processed successfully.",
        });
        setCurrentStep(3); // Success step
      }
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: "Failed to process termination. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onCalculate = (data: SeveranceFormData) => {
    calculateMutation.mutate(data);
  };

  const onProcess = () => {
    const formData = form.getValues();
    processMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getTerminationTypeLabel = (type: string) => {
    const labels = {
      'dismissal': language === 'gr' ? 'Απόλυση' : 'Dismissal',
      'resignation': language === 'gr' ? 'Παραίτηση' : 'Resignation',
      'expiry': language === 'gr' ? 'Λήξη Σύμβασης' : 'Contract Expiry',
      'mutual_agreement': language === 'gr' ? 'Κοινή Συμφωνία' : 'Mutual Agreement'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {language === 'gr' ? 'Υπολογιστής Αποζημίωσης & Τελικής Αμοιβής' : 'Severance & Final Pay Calculator'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'gr' 
              ? 'Υπολογισμός αποζημίωσης σύμφωνα με το Ν. 4093/2012 και ισχύουσα νομοθεσία'
              : 'Calculate severance according to Greek Labor Law 4093/2012 and current legislation'
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={language === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en')}
          >
            EN
          </Button>
          <Button
            variant={language === 'gr' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('gr')}
          >
            ΕΛ
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 py-6">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-0.5 mx-2 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <Tabs value={currentStep.toString()} className="w-full">
        {/* Step 1: Input Form */}
        <TabsContent value="1" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>
                  {language === 'gr' ? 'Στοιχεία Καταγγελίας' : 'Termination Details'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Employee ID */}
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Κωδικός Εργαζομένου' : 'Employee ID'}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="EMP001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contract ID */}
                    <FormField
                      control={form.control}
                      name="contractId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Κωδικός Σύμβασης' : 'Contract ID'}
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="CON001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Termination Type */}
                    <FormField
                      control={form.control}
                      name="terminationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Τύπος Καταγγελίας' : 'Termination Type'}
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={language === 'gr' ? 'Επιλέξτε τύπο' : 'Select type'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="dismissal">
                                {language === 'gr' ? 'Απόλυση' : 'Dismissal'}
                              </SelectItem>
                              <SelectItem value="resignation">
                                {language === 'gr' ? 'Παραίτηση' : 'Resignation'}
                              </SelectItem>
                              <SelectItem value="expiry">
                                {language === 'gr' ? 'Λήξη Σύμβασης' : 'Contract Expiry'}
                              </SelectItem>
                              <SelectItem value="mutual_agreement">
                                {language === 'gr' ? 'Κοινή Συμφωνία' : 'Mutual Agreement'}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Effective Date */}
                    <FormField
                      control={form.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Ημερομηνία Λήξης' : 'Effective Date'}
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Years of Service */}
                    <FormField
                      control={form.control}
                      name="yearsOfService"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Έτη Υπηρεσίας' : 'Years of Service'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="5.5"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Last Monthly Wage */}
                    <FormField
                      control={form.control}
                      name="lastMonthlyWage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Τελευταίος Μηνιαίος Μισθός (€)' : 'Last Monthly Wage (€)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1500"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unused Leave Days */}
                    <FormField
                      control={form.control}
                      name="unusedLeaveDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Αχρησιμοποίητες Ημέρες Άδειας' : 'Unused Leave Days'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="15"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Pending Tips */}
                    <FormField
                      control={form.control}
                      name="pendingTips"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {language === 'gr' ? 'Εκκρεμή Φιλοδωρήματα (€)' : 'Pending Tips (€)'}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="200"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-end space-x-3">
                    <Button 
                      type="submit" 
                      disabled={calculateMutation.isPending}
                      className="flex items-center space-x-2"
                    >
                      {calculateMutation.isPending ? (
                        <Clock className="h-4 w-4 animate-spin" />
                      ) : (
                        <Euro className="h-4 w-4" />
                      )}
                      <span>
                        {language === 'gr' ? 'Υπολογισμός Αποζημίωσης' : 'Calculate Severance'}
                      </span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 2: Calculation Results */}
        <TabsContent value="2" className="space-y-6">
          {calculation && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Euro className="h-5 w-5" />
                    <span>
                      {language === 'gr' ? 'Αποτελέσματα Υπολογισμού' : 'Calculation Results'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(calculation.grossTotal)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'gr' ? 'Συνολικό Μικτό' : 'Gross Total'}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-destructive">
                        -{formatCurrency(calculation.taxAmount + calculation.socialSecurityAmount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'gr' ? 'Κρατήσεις' : 'Deductions'}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-primary/5">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(calculation.netTotal)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'gr' ? 'Καθαρό Σύνολο' : 'Net Total'}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      {language === 'gr' ? 'Αναλυτική Κατανομή' : 'Detailed Breakdown'}
                    </h3>
                    <div className="space-y-2">
                      {calculation.finalPayLines.map((line, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <div>
                            <div className="font-medium">
                              {language === 'gr' ? line.descriptionGr : line.description}
                            </div>
                            {line.legalReference && (
                              <div className="text-xs text-muted-foreground">
                                {line.legalReference}
                              </div>
                            )}
                          </div>
                          <div className={`font-medium ${
                            line.calculatedAmount < 0 ? 'text-destructive' : 'text-primary'
                          }`}>
                            {formatCurrency(Math.abs(line.calculatedAmount))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legal Explanation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      {language === 'gr' ? 'Νομική Ανάλυση' : 'Legal Analysis'}
                    </h3>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {language === 'gr' ? calculation.explanationGr : calculation.explanationEn}
                      </pre>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                    >
                      {language === 'gr' ? 'Επιστροφή' : 'Back'}
                    </Button>
                    <Button 
                      onClick={onProcess}
                      disabled={processMutation.isPending}
                      className="flex items-center space-x-2"
                    >
                      {processMutation.isPending ? (
                        <Clock className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      <span>
                        {language === 'gr' ? 'Επεξεργασία Καταγγελίας' : 'Process Termination'}
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Step 3: Success */}
        <TabsContent value="3" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-green-600">
                  {language === 'gr' ? 'Καταγγελία Ολοκληρώθηκε' : 'Termination Completed'}
                </h2>
                <p className="text-muted-foreground">
                  {language === 'gr' 
                    ? 'Η καταγγελία και ο υπολογισμός αποζημίωσης έχουν ολοκληρωθεί επιτυχώς.'
                    : 'The termination and severance calculation have been completed successfully.'
                  }
                </p>
                <Button onClick={() => {
                  setCurrentStep(1);
                  setCalculation(null);
                  form.reset();
                }}>
                  {language === 'gr' ? 'Νέος Υπολογισμός' : 'New Calculation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step 4: Pending Approval */}
        <TabsContent value="4" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <h2 className="text-2xl font-bold text-yellow-600">
                  {language === 'gr' ? 'Εκκρεμεί Έγκριση' : 'Approval Pending'}
                </h2>
                <p className="text-muted-foreground">
                  {language === 'gr' 
                    ? 'Η αποζημίωση απαιτεί έγκριση από νομικό και μισθοδοσία λόγω υψηλού ποσού.'
                    : 'The severance requires approval from legal and payroll due to high amount.'
                  }
                </p>
                <Alert>
                  <AlertDescription>
                    {language === 'gr' 
                      ? 'Θα ειδοποιηθείτε όταν η έγκριση ολοκληρωθεί.'
                      : 'You will be notified when the approval is completed.'
                    }
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}