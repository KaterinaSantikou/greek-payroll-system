import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  validateAfm, 
  validateAmka, 
  GREEK_TAX_OFFICES,
  EFKA_INSURANCE_CATEGORIES,
  EFKA_INSURANCE_PACKAGES,
  SPECIAL_INSURANCE_CATEGORIES,
  EFKA_FUND_AFFILIATIONS,
  WORKER_CLASSIFICATIONS,
  INDEPENDENT_CONTRACTOR_CLASSES,
  DISABILITY_TYPES,
  validateDisabilityPercentage,
  calculateYoungWorkerStatus
} from "@/lib/greekValidations";
import { insertEmployeeSchema, type Employee, type InsertEmployee } from "@shared/schema";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface EmployeeFormProps {
  employee?: Employee | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const steps = [
  { id: "personal", title: "Προσωπικά Στοιχεία", description: "Βασικές πληροφορίες εργαζομένου" },
  { id: "employment", title: "Στοιχεία Εργασίας", description: "Πληροφορίες απασχόλησης" },
  { id: "contract", title: "Σύμβαση Εργασίας", description: "Λεπτομέρειες σύμβασης" },
  { id: "legal", title: "Νομικά Στοιχεία", description: "Φορολογικά και ασφαλιστικά στοιχεία" },
  { id: "compliance", title: "Εργασιακή Συμμόρφωση", description: "Κατηγοριοποίηση εργαζομένων και αναπηρία" },
  { id: "experience", title: "Εμπειρία & Εκπαίδευση", description: "Προϋπηρεσία και προσόντα" },
  { id: "compensation", title: "Μισθός & Παροχές", description: "Αποδοχές και επιδόματα" },
  { id: "emergency", title: "Έκτακτη Επαφή", description: "Στοιχεία επείγουσας επικοινωνίας" },
];

export default function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    trigger,
  } = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: employee ? {
      firstName: employee.firstName,
      lastName: employee.lastName,
      fatherName: employee.fatherName || "",
      motherName: employee.motherName || "",
      dateOfBirth: employee.dateOfBirth,
      gender: employee.gender,
      birthPlace: employee.birthPlace || "",
      nationality: employee.nationality || "GR",
      maritalStatus: employee.maritalStatus || "",
      afm: employee.afm,
      amka: employee.amka,
      idNumber: employee.idNumber,
      email: employee.email,
      phone: employee.phone || "",
      mobile: employee.mobile || "",
      address: employee.address,
      city: employee.city,
      postalCode: employee.postalCode,
      hireDate: employee.hireDate,
      department: employee.department,
      position: employee.position,
      employmentType: employee.employmentType,
      status: employee.status || "active",
      basicSalary: employee.basicSalary,
      efkaRegistry: employee.efkaRegistry || "",
      taxOffice: employee.taxOffice || "",
      workPermit: employee.workPermit || "",
      disabilityCertificate: employee.disabilityCertificate || false,
      contractType: employee.contractType,
      workingHours: employee.workingHours || 40,
      probationPeriod: employee.probationPeriod || 0,
      previousExperience: employee.previousExperience || "",
      education: employee.education || "",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
      emergencyContactRelation: employee.emergencyContactRelation || "",
    } : {
      nationality: "GR",
      status: "active",
      workingHours: 40,
      probationPeriod: 0,
      disabilityCertificate: false,
      employmentType: "full-time",
      contractType: "indefinite",
    },
  });

  // Watch AFM and AMKA for real-time validation
  const afm = watch("afm");
  const amka = watch("amka");

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      return await apiRequest("POST", "/api/employees", data);
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Ο εργαζόμενος δημιουργήθηκε επιτυχώς",
      });
      onSuccess();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία δημιουργίας εργαζομένου",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      return await apiRequest("PUT", `/api/employees/${employee!.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Ο εργαζόμενος ενημερώθηκε επιτυχώς",
      });
      onSuccess();
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Σφάλμα",
        description: error.message || "Αποτυχία ενημέρωσης εργαζομένου",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertEmployee) => {
    if (employee) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const nextStep = async () => {
    const stepFields = getStepFields(currentStep);
    const isValid = await trigger(stepFields);
    
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStepFields = (step: number): (keyof InsertEmployee)[] => {
    switch (step) {
      case 0: return ["firstName", "lastName", "fatherName", "dateOfBirth", "gender", "afm", "amka", "idNumber", "email", "phone", "address", "city", "postalCode"];
      case 1: return ["hireDate", "department", "position", "employmentType"];
      case 2: return ["contractType", "workingHours"];
      case 3: return ["efkaRegistry", "taxOffice"];
      case 4: return ["previousExperience", "education"];
      case 5: return ["basicSalary"];
      case 6: return ["emergencyContactName", "emergencyContactPhone"];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${index <= currentStep 
                ? "bg-primary text-white" 
                : "bg-neutral-300 text-neutral-600"
              }
            `}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-px mx-4
                ${index < currentStep ? "bg-primary" : "bg-neutral-300"}
              `} />
            )}
          </div>
        ))}
      </div>

      {/* Current step info */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
        <p className="text-neutral-600">{steps[currentStep].description}</p>
      </div>

      {/* Form content */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-6">
            {/* Step 0: Personal Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Όνομα *</Label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      placeholder="Εισάγετε το όνομα"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="lastName">Επώνυμο *</Label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      placeholder="Εισάγετε το επώνυμο"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="fatherName">Όνομα Πατρός</Label>
                    <Input
                      id="fatherName"
                      {...register("fatherName")}
                      placeholder="Εισάγετε το όνομα πατρός"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="motherName">Όνομα Μητρός</Label>
                    <Input
                      id="motherName"
                      {...register("motherName")}
                      placeholder="Εισάγετε το όνομα μητρός"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dateOfBirth">Ημερομηνία Γέννησης *</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="gender">Φύλο *</Label>
                    <Select onValueChange={(value) => setValue("gender", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε φύλο" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Άνδρας</SelectItem>
                        <SelectItem value="female">Γυναίκα</SelectItem>
                        <SelectItem value="other">Άλλο</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="afm">ΑΦΜ *</Label>
                    <Input
                      id="afm"
                      {...register("afm")}
                      placeholder="123456789"
                      maxLength={9}
                      className={
                        afm && afm.length === 9 && validateAfm(afm)
                          ? "border-green-300"
                          : afm && afm.length > 0
                          ? "border-red-300"
                          : ""
                      }
                    />
                    {errors.afm && (
                      <p className="text-red-500 text-sm mt-1">{errors.afm.message}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">9 ψηφία χωρίς κενά</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="amka">ΑΜΚΑ *</Label>
                    <Input
                      id="amka"
                      {...register("amka")}
                      placeholder="12345678901"
                      maxLength={11}
                      className={
                        amka && amka.length === 11 && validateAmka(amka)
                          ? "border-green-300"
                          : amka && amka.length > 0
                          ? "border-red-300"
                          : ""
                      }
                    />
                    {errors.amka && (
                      <p className="text-red-500 text-sm mt-1">{errors.amka.message}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">11 ψηφία χωρίς κενά</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="idNumber">Αριθμός Ταυτότητας *</Label>
                    <Input
                      id="idNumber"
                      {...register("idNumber")}
                      placeholder="ΑΒ123456"
                    />
                    {errors.idNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.idNumber.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="employee@company.gr"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Τηλέφωνο</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="2101234567"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mobile">Κινητό</Label>
                    <Input
                      id="mobile"
                      {...register("mobile")}
                      placeholder="6971234567"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Διεύθυνση *</Label>
                    <Input
                      id="address"
                      {...register("address")}
                      placeholder="Οδός Αριθμός"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="city">Πόλη *</Label>
                    <Input
                      id="city"
                      {...register("city")}
                      placeholder="Αθήνα"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="postalCode">Ταχυδρομικός Κώδικας *</Label>
                    <Input
                      id="postalCode"
                      {...register("postalCode")}
                      placeholder="12345"
                      maxLength={5}
                    />
                    {errors.postalCode && (
                      <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Employment Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hireDate">Ημερομηνία Πρόσληψης *</Label>
                    <Input
                      id="hireDate"
                      type="date"
                      {...register("hireDate")}
                    />
                    {errors.hireDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.hireDate.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="department">Τμήμα *</Label>
                    <Input
                      id="department"
                      {...register("department")}
                      placeholder="π.χ. IT, Πωλήσεις, Μάρκετινγκ"
                    />
                    {errors.department && (
                      <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="position">Θέση *</Label>
                    <Input
                      id="position"
                      {...register("position")}
                      placeholder="π.χ. Developer, Manager, Assistant"
                    />
                    {errors.position && (
                      <p className="text-red-500 text-sm mt-1">{errors.position.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="employmentType">Τύπος Απασχόλησης *</Label>
                    <Select onValueChange={(value) => setValue("employmentType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε τύπο" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Πλήρης Απασχόληση</SelectItem>
                        <SelectItem value="part-time">Μερική Απασχόληση</SelectItem>
                        <SelectItem value="contract">Σύμβαση</SelectItem>
                        <SelectItem value="internship">Πρακτική</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.employmentType && (
                      <p className="text-red-500 text-sm mt-1">{errors.employmentType.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contract Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contractType">Τύπος Σύμβασης *</Label>
                    <Select onValueChange={(value) => setValue("contractType", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλέξτε τύπο" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indefinite">Αορίστου Χρόνου</SelectItem>
                        <SelectItem value="definite">Ορισμένου Χρόνου</SelectItem>
                        <SelectItem value="project">Έργο</SelectItem>
                        <SelectItem value="seasonal">Εποχιακή</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.contractType && (
                      <p className="text-red-500 text-sm mt-1">{errors.contractType.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="workingHours">Ώρες Εργασίας (εβδομαδιαίως)</Label>
                    <Input
                      id="workingHours"
                      type="number"
                      {...register("workingHours", { valueAsNumber: true })}
                      placeholder="40"
                      min="1"
                      max="60"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="probationPeriod">Δοκιμαστική Περίοδος (μήνες)</Label>
                    <Input
                      id="probationPeriod"
                      type="number"
                      {...register("probationPeriod", { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                      max="24"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Legal Documents & EFKA Insurance */}
            {currentStep === 3 && (
              <div className="space-y-8">
                {/* Basic Legal Documents */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Βασικά Νομικά Έγγραφα</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="efkaRegistry">Αρ. Μητρώου ΕΦΚΑ *</Label>
                      <Input
                        id="efkaRegistry"
                        {...register("efkaRegistry")}
                        placeholder="Αριθμός μητρώου ΕΦΚΑ"
                      />
                      {errors.efkaRegistry && (
                        <p className="text-red-500 text-sm mt-1">{errors.efkaRegistry.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="taxOffice">ΔΟΥ *</Label>
                      <Select onValueChange={(value) => setValue("taxOffice", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε ΔΟΥ" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {GREEK_TAX_OFFICES.map((office) => (
                            <SelectItem key={office} value={office}>
                              {office}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.taxOffice && (
                        <p className="text-red-500 text-sm mt-1">{errors.taxOffice.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="workPermit">Άδεια Εργασίας</Label>
                      <Input
                        id="workPermit"
                        {...register("workPermit")}
                        placeholder="Αριθμός άδειας (για αλλοδαπούς)"
                      />
                    </div>
                  </div>
                </div>

                {/* EFKA Insurance System */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Σύστημα Ασφάλισης ΕΦΚΑ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="efkaInsuranceCategory">Κατηγορία Ασφάλισης *</Label>
                      <Select onValueChange={(value) => setValue("efkaInsuranceCategory", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε κατηγορία" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IKA">ΙΚΑ - Ίδρυμα Κοινωνικών Ασφαλίσεων</SelectItem>
                          <SelectItem value="OAEE">ΟΑΕΕ - Οργανισμός Ασφάλισης Ελευθέρων Επαγγελματιών</SelectItem>
                          <SelectItem value="ETAA">ΕΤΑΑ - Ενιαίο Ταμείο Ανεξάρτητα Απασχολουμένων</SelectItem>
                          <SelectItem value="OTHER">Άλλο</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.efkaInsuranceCategory && (
                        <p className="text-red-500 text-sm mt-1">{errors.efkaInsuranceCategory.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="efkaInsurancePackage">Πακέτο Κάλυψης</Label>
                      <Select onValueChange={(value) => setValue("efkaInsurancePackage", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε πακέτο" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_COVERAGE">Πλήρης Κάλυψη</SelectItem>
                          <SelectItem value="BASIC_COVERAGE">Βασική Κάλυψη</SelectItem>
                          <SelectItem value="REDUCED_COVERAGE">Μειωμένη Κάλυψη</SelectItem>
                          <SelectItem value="SPECIAL_COVERAGE">Ειδική Κάλυψη</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="specialInsuranceCategory">Ειδική Κατηγορία Ασφάλισης</Label>
                      <Select onValueChange={(value) => setValue("specialInsuranceCategory", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε ειδική κατηγορία" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Καμία</SelectItem>
                          <SelectItem value="HEAVY_UNHEALTHY">Βαρέα & Ανθυγιεινά</SelectItem>
                          <SelectItem value="HAZARDOUS">Επικίνδυνα</SelectItem>
                          <SelectItem value="MARITIME">Ναυτιλιακά</SelectItem>
                          <SelectItem value="MILITARY">Στρατιωτικά</SelectItem>
                          <SelectItem value="POLICE">Αστυνομικά</SelectItem>
                          <SelectItem value="FIREFIGHTER">Πυροσβεστικά</SelectItem>
                          <SelectItem value="JOURNALIST">Δημοσιογραφικά</SelectItem>
                          <SelectItem value="ARTIST">Καλλιτεχνικά</SelectItem>
                          <SelectItem value="ATHLETE">Αθλητικά</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="efkaFundAffiliation">Ταμειακή Ένταξη ΕΦΚΑ</Label>
                      <Select onValueChange={(value) => setValue("efkaFundAffiliation", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε ταμείο" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAIN_FUND">Κύριο Ταμείο</SelectItem>
                          <SelectItem value="AUXILIARY_FUND">Επικουρικό Ταμείο</SelectItem>
                          <SelectItem value="HEALTH_FUND">Ταμείο Υγείας</SelectItem>
                          <SelectItem value="UNEMPLOYMENT_FUND">Ταμείο Ανεργίας</SelectItem>
                          <SelectItem value="FAMILY_BENEFITS">Οικογενειακές Παροχές</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Registrations */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Επιπλέον Καταχωρήσεις</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="erganiRegistration">Καταχώρηση ΕΡΓΑΝΗ</Label>
                      <Input
                        id="erganiRegistration"
                        {...register("erganiRegistration")}
                        placeholder="Αριθμός καταχώρησης στο σύστημα ΕΡΓΑΝΗ"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Σύστημα επιθεώρησης εργασίας
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="tekaEnrollment">Εγγραφή ΤΕΚΑ</Label>
                      <Input
                        id="tekaEnrollment"
                        {...register("tekaEnrollment")}
                        placeholder="Αριθμός εγγραφής στο ΤΕΚΑ"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Ταμείο Επαγγελματιών Κατασκευαστών Αττικής (Μηχανικοί/Τεχνικοί)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Employment Compliance & Worker Classifications */}
            {currentStep === 4 && (
              <div className="space-y-8">
                {/* Worker Classification Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Κατηγοριοποίηση Εργαζομένου</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="workerClassification">Κατηγορία Εργαζομένου *</Label>
                      <Select onValueChange={(value) => setValue("workerClassification", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε κατηγορία" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Μισθωτός</SelectItem>
                          <SelectItem value="INDEPENDENT_CONTRACTOR">Ανεξάρτητος Συνεργάτης</SelectItem>
                          <SelectItem value="SEASONAL">Εποχιακός Εργαζόμενος</SelectItem>
                          <SelectItem value="APPRENTICE">Μαθητευόμενος</SelectItem>
                          <SelectItem value="INTERN">Ασκούμενος</SelectItem>
                          <SelectItem value="TEMPORARY">Προσωρινός</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.workerClassification && (
                        <p className="text-red-500 text-sm mt-1">{errors.workerClassification.message}</p>
                      )}
                    </div>
                    
                    {watch("workerClassification") === "INDEPENDENT_CONTRACTOR" && (
                      <div>
                        <Label htmlFor="independentContractorClass">Κλάση Ανεξάρτητου Συνεργάτη</Label>
                        <Select onValueChange={(value) => setValue("independentContractorClass", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε κλάση" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PROFESSIONAL">Επαγγελματίας</SelectItem>
                            <SelectItem value="ARTIST">Καλλιτέχνης</SelectItem>
                            <SelectItem value="TECHNICAL">Τεχνικός</SelectItem>
                            <SelectItem value="CONSULTANT">Σύμβουλος</SelectItem>
                            <SelectItem value="SERVICES">Παροχή Υπηρεσιών</SelectItem>
                            <SelectItem value="OTHER">Άλλο</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="youngWorkerStatus"
                        {...register("youngWorkerStatus")}
                        className="rounded border border-gray-300"
                      />
                      <Label htmlFor="youngWorkerStatus" className="text-sm">
                        Νέος Εργαζόμενος (κάτω από 25 ετών)
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="seasonalWorkerDesignation"
                        {...register("seasonalWorkerDesignation")}
                        className="rounded border border-gray-300"
                      />
                      <Label htmlFor="seasonalWorkerDesignation" className="text-sm">
                        Εποχιακή Απασχόληση
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Disability Support Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Υποστήριξη Αναπηρίας</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="disabilityPercentage">Ποσοστό Αναπηρίας (%)</Label>
                      <Input
                        id="disabilityPercentage"
                        type="number"
                        min="0"
                        max="100"
                        {...register("disabilityPercentage", { 
                          valueAsNumber: true,
                          validate: (value) => validateDisabilityPercentage(value) || "Εισάγετε έγκυρο ποσοστό (0-100%)"
                        })}
                        placeholder="0-100"
                      />
                      {errors.disabilityPercentage && (
                        <p className="text-red-500 text-sm mt-1">{errors.disabilityPercentage.message}</p>
                      )}
                    </div>
                    
                    {watch("disabilityPercentage") > 0 && (
                      <div>
                        <Label htmlFor="disabilityType">Τύπος Αναπηρίας</Label>
                        <Select onValueChange={(value) => setValue("disabilityType", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Επιλέξτε τύπο" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PHYSICAL">Σωματική</SelectItem>
                            <SelectItem value="MENTAL">Διανοητική</SelectItem>
                            <SelectItem value="SENSORY">Αισθητηριακή</SelectItem>
                            <SelectItem value="MULTIPLE">Πολλαπλή</SelectItem>
                            <SelectItem value="PSYCHOSOCIAL">Ψυχοκοινωνική</SelectItem>
                            <SelectItem value="CHRONIC">Χρόνια Πάθηση</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {watch("disabilityPercentage") > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <Label htmlFor="disabilityCertificateNumber">Αριθμός Πιστοποιητικού</Label>
                        <Input
                          id="disabilityCertificateNumber"
                          {...register("disabilityCertificateNumber")}
                          placeholder="Αριθμός πιστοποιητικού αναπηρίας"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="disabilityCertificateIssuer">Εκδούσα Αρχή</Label>
                        <Input
                          id="disabilityCertificateIssuer"
                          {...register("disabilityCertificateIssuer")}
                          placeholder="π.χ. ΚΕΠΑ, Νοσοκομείο"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="disabilityCertificateExpiryDate">Ημερομηνία Λήξης</Label>
                        <Input
                          id="disabilityCertificateExpiryDate"
                          type="date"
                          {...register("disabilityCertificateExpiryDate")}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="disabilitySupport">Απαιτούμενες Διευκολύνσεις</Label>
                        <textarea
                          id="disabilitySupport"
                          {...register("disabilitySupport")}
                          className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md"
                          placeholder="Περιγράψτε τις απαιτούμενες διευκολύνσεις..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Compliance Information */}
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Πληροφορίες Συμμόρφωσης
                  </h4>
                  <div className="text-sm space-y-2">
                    <p>• Νέοι εργαζόμενοι (κάτω από 25) έχουν ειδικές προστασίες και επιδοτήσεις</p>
                    <p>• Εποχιακοί εργαζόμενοι έχουν ειδικούς όρους απασχόλησης</p>
                    <p>• Άτομα με αναπηρία δικαιούνται ειδικών διευκολύνσεων και φοροαπαλλαγών</p>
                    <p>• Ανεξάρτητοι συνεργάτες έχουν διαφορετικό φορολογικό καθεστώς</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Experience & Education */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="previousExperience">Προϋπηρεσία</Label>
                  <textarea
                    id="previousExperience"
                    {...register("previousExperience")}
                    className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={4}
                    placeholder="Περιγράψτε την προηγούμενη εμπειρία"
                  />
                </div>
                
                <div>
                  <Label htmlFor="education">Εκπαίδευση</Label>
                  <textarea
                    id="education"
                    {...register("education")}
                    className="w-full p-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={4}
                    placeholder="Περιγράψτε το εκπαιδευτικό υπόβαθρο"
                  />
                </div>
              </div>
            )}

            {/* Step 5: Compensation */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basicSalary">Βασικός Μισθός (€) *</Label>
                    <Input
                      id="basicSalary"
                      {...register("basicSalary")}
                      placeholder="2500.00"
                      step="0.01"
                    />
                    {errors.basicSalary && (
                      <p className="text-red-500 text-sm mt-1">{errors.basicSalary.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Salary & Benefits */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="basicSalary">Βασικός Μισθός (€) *</Label>
                    <Input
                      id="basicSalary"
                      {...register("basicSalary")}
                      placeholder="2500.00"
                      step="0.01"
                    />
                    {errors.basicSalary && (
                      <p className="text-red-500 text-sm mt-1">{errors.basicSalary.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Emergency Contact */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContactName">Όνομα Επαφής</Label>
                    <Input
                      id="emergencyContactName"
                      {...register("emergencyContactName")}
                      placeholder="Όνομα ατόμου επείγουσας επικοινωνίας"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emergencyContactPhone">Τηλέφωνο Επαφής</Label>
                    <Input
                      id="emergencyContactPhone"
                      {...register("emergencyContactPhone")}
                      placeholder="Τηλέφωνο επείγουσας επικοινωνίας"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="emergencyContactRelation">Σχέση</Label>
                    <Input
                      id="emergencyContactRelation"
                      {...register("emergencyContactRelation")}
                      placeholder="π.χ. Σύζυγος, Γονέας, Αδερφός"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Προηγούμενο
          </Button>

          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Ακύρωση
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {employee ? "Ενημέρωση" : "Δημιουργία"}
              </Button>
            ) : (
              <Button type="button" onClick={nextStep}>
                Επόμενο
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
