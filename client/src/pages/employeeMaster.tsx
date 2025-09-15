import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  Search,
  Building2,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react';
import type {
  Employee,
  InsertEmployee,
  WageComponent,
  InsertWageComponent,
  Property,
} from '@shared/schema';

// Comprehensive employee form schema with Greek-specific validations
const employeeFormSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  afm: z
    .string()
    .length(9, 'AFM must be exactly 9 digits')
    .regex(/^\d{9}$/, 'AFM must contain only numbers')
    .optional()
    .or(z.literal('')),
  amka: z
    .string()
    .length(11, 'AMKA must be exactly 11 digits')
    .regex(/^\d{11}$/, 'AMKA must contain only numbers')
    .optional()
    .or(z.literal('')),
  paaypa: z.string().optional(),
  bankIban: z.string().min(15).max(34).optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  nationalityCode: z.string().default('GRC'),
  employmentType: z.enum(['indefinite', 'fixed-term', 'seasonal']),
  grade: z.string().optional(),
  unionCbaRef: z.string().optional(),
  hireDate: z.string().min(1, 'Hire date required'),
  termDate: z.string().optional().or(z.literal('')),
  probationEndDate: z.string().optional().or(z.literal('')),
  defaultPropertyId: z.string().optional(),
  maritalStatus: z
    .enum(['single', 'married', 'divorced', 'widowed'])
    .optional(),
  dependents: z.coerce.number().min(0).default(0),
  disabilityPercentage: z.coerce.number().min(0).max(100).default(0),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

// Wage components form schema
const wageFormSchema = z.object({
  baseSalary: z.coerce.number().min(0, 'Base salary must be positive'),
  hourlyRate: z.coerce.number().min(0).optional(),
  foodAllowance: z.coerce.number().min(0).default(0),
  housingAllowance: z.coerce.number().min(0).default(0),
  transportAllowance: z.coerce.number().min(0).default(0),
  marriageAllowance: z.coerce.number().min(0).default(0),
  familyAllowance: z.coerce.number().min(0).default(0),
  educationAllowance: z.coerce.number().min(0).default(0),
  experienceAllowance: z.coerce.number().min(0).default(0),
  positionAllowance: z.coerce.number().min(0).default(0),
  uniformAllowance: z.coerce.number().min(0).default(0),
  tipsEligible: z.boolean().default(false),
  tipsPoolPercentage: z.coerce.number().min(0).max(100).default(0),
  perDiemRate: z.coerce.number().min(0).default(0),
  overtimeEligible: z.boolean().default(true),
  effectiveFrom: z.string().min(1, 'Effective date required'),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;
type WageFormData = z.infer<typeof wageFormSchema>;

export default function EmployeeMaster() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showWageDialog, setShowWageDialog] = useState(false);

  // Fetch employees with search
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees', { search: searchTerm }],
  });

  // Fetch properties for dropdown
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Fetch wage components for selected employee
  const { data: wageComponents = [] } = useQuery<WageComponent[]>({
    queryKey: ['/api/wage-components', selectedEmployee?.employeeId],
    enabled: !!selectedEmployee?.employeeId,
  });

  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employmentType: 'indefinite',
      nationalityCode: 'GRC',
      dependents: 0,
      disabilityPercentage: 0,
    },
  });

  const wageForm = useForm<WageFormData>({
    resolver: zodResolver(wageFormSchema),
    defaultValues: {
      baseSalary: 0,
      foodAllowance: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      marriageAllowance: 0,
      familyAllowance: 0,
      educationAllowance: 0,
      experienceAllowance: 0,
      positionAllowance: 0,
      uniformAllowance: 0,
      tipsEligible: false,
      tipsPoolPercentage: 0,
      perDiemRate: 0,
      overtimeEligible: true,
    },
  });

  // Employee mutations
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setShowEmployeeDialog(false);
      employeeForm.reset();
      toast({ title: 'Employee created successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating employee',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InsertEmployee>;
    }) => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setShowEmployeeDialog(false);
      employeeForm.reset();
      toast({ title: 'Employee updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating employee',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Wage component mutations
  const createWageComponentMutation = useMutation({
    mutationFn: async (data: InsertWageComponent) => {
      const response = await fetch('/api/wage-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wage-components'] });
      setShowWageDialog(false);
      wageForm.reset();
      toast({ title: 'Wage components updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating wage components',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmitEmployee = (data: EmployeeFormData) => {
    const employeeData: InsertEmployee = {
      ...data,
      afm: data.afm || null,
      amka: data.amka || null,
      bankIban: data.bankIban || null,
      dateOfBirth: data.dateOfBirth || null,
      termDate: data.termDate || null,
      probationEndDate: data.probationEndDate || null,
    };

    if (selectedEmployee) {
      updateEmployeeMutation.mutate({
        id: selectedEmployee.employeeId,
        data: employeeData,
      });
    } else {
      createEmployeeMutation.mutate(employeeData);
    }
  };

  const onSubmitWage = (data: WageFormData) => {
    if (!selectedEmployee) return;

    const wageData: InsertWageComponent = {
      employeeId: selectedEmployee.employeeId,
      baseSalary: data.baseSalary.toString(),
      hourlyRate: data.hourlyRate?.toString() || null,
      foodAllowance: data.foodAllowance.toString(),
      housingAllowance: data.housingAllowance.toString(),
      transportAllowance: data.transportAllowance.toString(),
      marriageAllowance: data.marriageAllowance.toString(),
      familyAllowance: data.familyAllowance.toString(),
      educationAllowance: data.educationAllowance.toString(),
      experienceAllowance: data.experienceAllowance.toString(),
      positionAllowance: data.positionAllowance.toString(),
      uniformAllowance: data.uniformAllowance.toString(),
      tipsEligible: data.tipsEligible,
      tipsPoolPercentage: data.tipsPoolPercentage.toString(),
      perDiemRate: data.perDiemRate.toString(),
      overtimeEligible: data.overtimeEligible,
      overtimeTier1Rate: '1.25',
      overtimeTier2Rate: '1.50',
      overtimeTier3Rate: '1.75',
      nightPremiumRate: '0.25',
      sundayPremiumRate: '0.75',
      holidayPremiumRate: '1.00',
      effectiveFrom: data.effectiveFrom,
      effectiveTo: null,
    };

    createWageComponentMutation.mutate(wageData);
  };

  const openEmployeeDialog = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee);
      employeeForm.reset({
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        afm: employee.afm || '',
        amka: employee.amka || '',
        paaypa: employee.paaypa || '',
        bankIban: employee.bankIban || '',
        dateOfBirth: employee.dateOfBirth || '',
        nationalityCode: employee.nationalityCode || 'GRC',
        employmentType: employee.employmentType,
        grade: employee.grade || '',
        unionCbaRef: employee.unionCbaRef || '',
        hireDate: employee.hireDate,
        termDate: employee.termDate || '',
        probationEndDate: employee.probationEndDate || '',
        defaultPropertyId: employee.defaultPropertyId || '',
        maritalStatus: employee.maritalStatus || undefined,
        dependents: employee.dependents || 0,
        disabilityPercentage: employee.disabilityPercentage || 0,
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
      });
    } else {
      setSelectedEmployee(null);
      employeeForm.reset({
        employmentType: 'indefinite',
        nationalityCode: 'GRC',
        dependents: 0,
        disabilityPercentage: 0,
      });
    }
    setShowEmployeeDialog(true);
  };

  const openWageDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    const currentWage = wageComponents.find(w => w.effectiveTo === null);
    if (currentWage) {
      wageForm.reset({
        baseSalary: parseFloat(currentWage.baseSalary),
        hourlyRate: currentWage.hourlyRate
          ? parseFloat(currentWage.hourlyRate)
          : undefined,
        foodAllowance: parseFloat(currentWage.foodAllowance || '0'),
        housingAllowance: parseFloat(currentWage.housingAllowance || '0'),
        transportAllowance: parseFloat(currentWage.transportAllowance || '0'),
        marriageAllowance: parseFloat(currentWage.marriageAllowance || '0'),
        familyAllowance: parseFloat(currentWage.familyAllowance || '0'),
        educationAllowance: parseFloat(currentWage.educationAllowance || '0'),
        experienceAllowance: parseFloat(currentWage.experienceAllowance || '0'),
        positionAllowance: parseFloat(currentWage.positionAllowance || '0'),
        uniformAllowance: parseFloat(currentWage.uniformAllowance || '0'),
        tipsEligible: currentWage.tipsEligible || false,
        tipsPoolPercentage: parseFloat(currentWage.tipsPoolPercentage || '0'),
        perDiemRate: parseFloat(currentWage.perDiemRate || '0'),
        overtimeEligible: currentWage.overtimeEligible || true,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
    } else {
      wageForm.reset({
        baseSalary: 0,
        foodAllowance: 0,
        housingAllowance: 0,
        transportAllowance: 0,
        marriageAllowance: 0,
        familyAllowance: 0,
        educationAllowance: 0,
        experienceAllowance: 0,
        positionAllowance: 0,
        uniformAllowance: 0,
        tipsEligible: false,
        tipsPoolPercentage: 0,
        perDiemRate: 0,
        overtimeEligible: true,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
    }
    setShowWageDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Employee Master</h1>
            <p className="text-gray-600">
              Complete employee and contract management
            </p>
          </div>
        </div>
        <Button
          onClick={() => openEmployeeDialog()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees by name, AFM, or employee number..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <div className="grid gap-4">
        {employees.map(employee => {
          const currentWage = wageComponents.find(
            w => w.employeeId === employee.employeeId && w.effectiveTo === null
          );

          return (
            <Card
              key={employee.employeeId}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {employee.firstName} {employee.lastName}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>#{employee.employeeNumber}</span>
                      {employee.afm && <span>AFM: {employee.afm}</span>}
                      {employee.amka && <span>AMKA: {employee.amka}</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge
                      variant={employee.isActive ? 'default' : 'secondary'}
                    >
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{employee.employmentType}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      Hired: {new Date(employee.hireDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{employee.grade || 'No grade'}</span>
                  </div>
                  {currentWage && (
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>
                        €{parseFloat(currentWage.baseSalary).toLocaleString()}
                        /mo
                      </span>
                    </div>
                  )}
                  {employee.emergencyContactName && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{employee.emergencyContactName}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEmployeeDialog(employee)}
                  >
                    Edit Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWageDialog(employee)}
                  >
                    Wage Components
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {employees.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No employees found</p>
            <Button
              onClick={() => openEmployeeDialog()}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              Add First Employee
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
          </DialogHeader>

          <Form {...employeeForm}>
            <form
              onSubmit={employeeForm.handleSubmit(onSubmitEmployee)}
              className="space-y-6"
            >
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">
                    Personal Information
                  </TabsTrigger>
                  <TabsTrigger value="employment">
                    Employment Details
                  </TabsTrigger>
                  <TabsTrigger value="contact">Contact & Emergency</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="employeeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee Number*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="nationalityCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="GRC">Greek</SelectItem>
                              <SelectItem value="EU">EU Citizen</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name*</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="afm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AFM (Tax ID)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="9 digits"
                              maxLength={9}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="amka"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AMKA (Social Security)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="11 digits"
                              maxLength={11}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="paaypa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAAYPA</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="bankIban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank IBAN</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="GR16..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="indefinite">
                                Indefinite Term
                              </SelectItem>
                              <SelectItem value="fixed-term">
                                Fixed Term
                              </SelectItem>
                              <SelectItem value="seasonal">Seasonal</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Grade</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date*</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="termDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Termination Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="probationEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probation End Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="defaultPropertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Property</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {properties.map(property => (
                                <SelectItem
                                  key={property.propertyId}
                                  value={property.propertyId}
                                >
                                  {property.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="unionCbaRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Union/CBA Reference</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="contact" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="dependents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Dependents</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={employeeForm.control}
                    name="disabilityPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disability Percentage (%)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" max="100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmployeeDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createEmployeeMutation.isPending ||
                    updateEmployeeMutation.isPending
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createEmployeeMutation.isPending ||
                  updateEmployeeMutation.isPending
                    ? 'Saving...'
                    : selectedEmployee
                      ? 'Update Employee'
                      : 'Create Employee'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Wage Components Dialog */}
      <Dialog open={showWageDialog} onOpenChange={setShowWageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Wage Components - {selectedEmployee?.firstName}{' '}
              {selectedEmployee?.lastName}
            </DialogTitle>
          </DialogHeader>

          <Form {...wageForm}>
            <form
              onSubmit={wageForm.handleSubmit(onSubmitWage)}
              className="space-y-6"
            >
              <Tabs defaultValue="base" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="base">Base Salary</TabsTrigger>
                  <TabsTrigger value="allowances">Allowances</TabsTrigger>
                  <TabsTrigger value="variable">Variable Pay</TabsTrigger>
                  <TabsTrigger value="premiums">Premiums</TabsTrigger>
                </TabsList>

                <TabsContent value="base" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={wageForm.control}
                      name="baseSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Base Salary (€)*</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="hourlyRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hourly Rate (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={wageForm.control}
                    name="effectiveFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective From*</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="allowances" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={wageForm.control}
                      name="foodAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Food Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="housingAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Housing Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="transportAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={wageForm.control}
                      name="marriageAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marriage Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="familyAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Family Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="educationAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={wageForm.control}
                      name="experienceAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="positionAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={wageForm.control}
                      name="uniformAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Uniform Allowance (€)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="variable" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={wageForm.control}
                        name="tipsEligible"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                              />
                            </FormControl>
                            <FormLabel>Tips Eligible</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={wageForm.control}
                        name="tipsPoolPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tips Pool Percentage (%)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={wageForm.control}
                        name="perDiemRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Per Diem Rate (€)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="premiums" className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <FormField
                      control={wageForm.control}
                      name="overtimeEligible"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <FormLabel>Overtime Eligible</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      Premium rates are configured automatically based on Greek
                      labor law:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Overtime Tier 1: +25% (first 2 hours)</li>
                      <li>Overtime Tier 2: +50% (next 2 hours)</li>
                      <li>Overtime Tier 3: +75% (beyond 4 hours)</li>
                      <li>Night Shift Premium: +25%</li>
                      <li>Sunday Premium: +75%</li>
                      <li>Holiday Premium: +100%</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWageDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWageComponentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createWageComponentMutation.isPending
                    ? 'Saving...'
                    : 'Update Wage Components'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
