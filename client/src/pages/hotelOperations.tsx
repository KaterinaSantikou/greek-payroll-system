import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  Users, 
  Smartphone, 
  Globe, 
  Calendar, 
  Clock, 
  MapPin, 
  Settings, 
  Upload, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Split,
  RotateCcw,
  Languages,
  Tablet
} from "lucide-react";

interface Property {
  propertyId: string;
  name: string;
  nameGr: string;
  location: string;
  timezone: string;
  departments: Department[];
  seasonalPeriods: SeasonalPeriod[];
  isActive: boolean;
}

interface Department {
  departmentId: string;
  name: string;
  nameGr: string;
  code: string;
  propertyId: string;
  kioskConfig: KioskConfig;
  costCenterId: string;
}

interface KioskConfig {
  departmentId: string;
  language: 'GR' | 'EN' | 'BOTH';
  quickActions: QuickAction[];
  allowedRoles: string[];
  deviceBinding: boolean;
  biometricRequired: boolean;
  theme: {
    primaryColor: string;
    logoUrl?: string;
  };
}

interface QuickAction {
  actionId: string;
  icon: string;
  labelEn: string;
  labelGr: string;
  type: string;
  autoSubmitErgani: boolean;
}

interface SeasonalPeriod {
  periodId: string;
  propertyId: string;
  name: string;
  nameGr: string;
  startDate: string;
  endDate: string;
  type: string;
  expectedStaffCount: number;
}

export default function HotelOperations() {
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<'GR' | 'EN'>('EN');
  const [batchEmployeeData, setBatchEmployeeData] = useState('');

  // Properties query
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/hotel/properties"],
  });

  // Departments query
  const { data: departments } = useQuery({
    queryKey: ["/api/hotel/properties", selectedProperty, "departments"],
    enabled: !!selectedProperty,
  });

  // Kiosk config query
  const { data: kioskConfig } = useQuery<KioskConfig>({
    queryKey: ["/api/hotel/kiosk", selectedDepartment, "config"],
    enabled: !!selectedDepartment,
  });

  // Multi-property assignments query
  const { data: multiPropertyAssignments } = useQuery({
    queryKey: ["/api/hotel/multi-property-assignments"],
  });

  // Split shifts query
  const { data: splitShifts } = useQuery({
    queryKey: ["/api/hotel/split-shifts"],
  });

  // Kiosk action mutation
  const kioskActionMutation = useMutation({
    mutationFn: async (data: { departmentId: string; actionId: string; employeeId: string; metadata?: any }) => {
      const response = await fetch(`/api/hotel/kiosk/${data.departmentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotel"] });
    },
  });

  // Seasonal onboarding mutation
  const seasonalOnboardingMutation = useMutation({
    mutationFn: async (data: { seasonalPeriodId: string; batchEmployees: any[] }) => {
      const response = await fetch("/api/hotel/seasonal-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotel"] });
    },
  });

  // Split shift mutation
  const splitShiftMutation = useMutation({
    mutationFn: async (data: { employeeId: string; date: string; segments: any[] }) => {
      const response = await fetch("/api/hotel/split-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotel/split-shifts"] });
    },
  });

  const handleKioskAction = (actionId: string) => {
    if (!selectedDepartment) return;

    kioskActionMutation.mutate({
      departmentId: selectedDepartment,
      actionId,
      employeeId: 'A12345', // Demo employee
      metadata: { timestamp: new Date().toISOString() }
    });
  };

  const handleSeasonalOnboarding = () => {
    if (!selectedProperty || !batchEmployeeData) return;

    try {
      const employees = JSON.parse(batchEmployeeData);
      const property = properties?.find(p => p.propertyId === selectedProperty);
      const seasonalPeriod = property?.seasonalPeriods[0];

      if (seasonalPeriod) {
        seasonalOnboardingMutation.mutate({
          seasonalPeriodId: seasonalPeriod.periodId,
          batchEmployees: employees
        });
      }
    } catch (error) {
      console.error('Invalid JSON data:', error);
    }
  };

  const handleCreateSplitShift = () => {
    const sampleSegments = [
      {
        propertyId: 'PRINCESS',
        departmentId: 'PRINCESS-FO',
        costCenterId: 'PRINCESS-FO',
        startTime: '09:00',
        endTime: '13:00',
        hours: 4,
        breakMinutes: 15,
        earningsCode: 'REG'
      },
      {
        propertyId: 'PRINCESS',
        departmentId: 'PRINCESS-FB',
        costCenterId: 'PRINCESS-FB',
        startTime: '18:00',
        endTime: '22:00',
        hours: 4,
        breakMinutes: 15,
        earningsCode: 'REG'
      }
    ];

    splitShiftMutation.mutate({
      employeeId: 'A12345',
      date: new Date().toISOString().split('T')[0],
      segments: sampleSegments
    });
  };

  const getLanguageDisplay = (config: KioskConfig) => {
    switch (config.language) {
      case 'GR': return '🇬🇷 Ελληνικά';
      case 'EN': return '🇺🇸 English';
      case 'BOTH': return '🌐 GR/EN';
      default: return config.language;
    }
  };

  const getDepartmentTypeColor = (code: string) => {
    switch (code) {
      case 'FO': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HK': return 'bg-green-50 text-green-700 border-green-200';
      case 'FB': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (propertiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Hotel Operations</h1>
        <p className="text-lg text-gray-600 mt-2">
          Multi-property management, department kiosks, and seasonal operations
        </p>
      </div>

      {/* Property Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Property & Department Selection</CardTitle>
          <CardDescription>
            Select a property and department to manage operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map((property) => (
                    <SelectItem key={property.propertyId} value={property.propertyId}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {selectedLanguage === 'GR' ? property.nameGr : property.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept: Department) => (
                    <SelectItem key={dept.departmentId} value={dept.departmentId}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getDepartmentTypeColor(dept.code)}`}>
                          {dept.code}
                        </span>
                        {selectedLanguage === 'GR' ? dept.nameGr : dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Interface Language</Label>
              <Select value={selectedLanguage} onValueChange={(value: 'GR' | 'EN') => setSelectedLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">🇺🇸 English</SelectItem>
                  <SelectItem value="GR">🇬🇷 Ελληνικά</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="multi-property" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="multi-property">Multi-Property</TabsTrigger>
          <TabsTrigger value="department-kiosks">Department Kiosks</TabsTrigger>
          <TabsTrigger value="seasonal-onboarding">Seasonal Onboarding</TabsTrigger>
          <TabsTrigger value="split-shifts">Split Shifts</TabsTrigger>
        </TabsList>

        {/* Multi-Property Tab */}
        <TabsContent value="multi-property" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Property Employee Management</CardTitle>
              <CardDescription>
                Manage employees across multiple hotel properties with rotation schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {properties?.map((property) => (
                  <div key={property.propertyId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <span className="font-medium">
                          {selectedLanguage === 'GR' ? property.nameGr : property.name}
                        </span>
                      </div>
                      <Badge variant={property.isActive ? "default" : "secondary"}>
                        {property.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {property.timezone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {property.departments.length} departments
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {property.departments.map((dept) => (
                        <span 
                          key={dept.departmentId} 
                          className={`px-2 py-1 rounded text-xs font-medium ${getDepartmentTypeColor(dept.code)}`}
                        >
                          {dept.code}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-Property Assignments</CardTitle>
              <CardDescription>
                Current cross-property employee assignments and rotations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {multiPropertyAssignments && multiPropertyAssignments.length > 0 ? (
                <div className="space-y-3">
                  {multiPropertyAssignments.map((assignment: any) => (
                    <div key={assignment.assignmentId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium">Employee {assignment.employeeId.slice(-6)}</span>
                          <Badge variant="outline">Primary: {assignment.primaryPropertyId}</Badge>
                        </div>
                        {assignment.rotationSchedule && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {assignment.rotationSchedule.pattern}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        Secondary properties: {assignment.secondaryProperties.map((sp: any) => sp.propertyId).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No multi-property assignments found. Create assignments for employees working across multiple hotels.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Kiosks Tab */}
        <TabsContent value="department-kiosks" className="space-y-6">
          {kioskConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Kiosk Configuration</CardTitle>
                <CardDescription>
                  {selectedLanguage === 'GR' ? 'Ρύθμιση Kiosk Τμήματος' : 'Department Kiosk Setup'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Language Support</Label>
                    <Badge variant="outline" className="flex items-center gap-2 w-fit">
                      <Languages className="h-3 w-3" />
                      {getLanguageDisplay(kioskConfig)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Security Features</Label>
                    <div className="flex gap-2">
                      <Badge variant={kioskConfig.deviceBinding ? "default" : "secondary"}>
                        Device Binding: {kioskConfig.deviceBinding ? 'ON' : 'OFF'}
                      </Badge>
                      <Badge variant={kioskConfig.biometricRequired ? "default" : "secondary"}>
                        Biometric: {kioskConfig.biometricRequired ? 'ON' : 'OFF'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: kioskConfig.theme.primaryColor }}
                      />
                      <span className="text-sm">{kioskConfig.theme.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {kioskConfig && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  {selectedLanguage === 'GR' ? 'Γρήγορες Ενέργειες Kiosk' : 'Icon-first kiosk interface actions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {kioskConfig.quickActions.map((action) => (
                    <Button
                      key={action.actionId}
                      variant="outline"
                      size="lg"
                      className="h-20 flex flex-col gap-2 p-4"
                      onClick={() => handleKioskAction(action.actionId)}
                      disabled={kioskActionMutation.isPending}
                    >
                      <span className="text-2xl">{action.icon}</span>
                      <span className="text-xs text-center">
                        {selectedLanguage === 'GR' ? action.labelGr : action.labelEn}
                      </span>
                      {action.autoSubmitErgani && (
                        <Badge variant="secondary" className="text-xs">
                          ERGANI
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                {kioskActionMutation.data && (
                  <Alert className="mt-4 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {selectedLanguage === 'GR' 
                        ? kioskActionMutation.data.messageGr 
                        : kioskActionMutation.data.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Seasonal Onboarding Tab */}
        <TabsContent value="seasonal-onboarding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Onboarding Wizard</CardTitle>
              <CardDescription>
                Batch import employees, device provisioning, and geofence setup for seasonal periods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="batch-data">Batch Employee Data (JSON)</Label>
                    <Textarea
                      id="batch-data"
                      placeholder={`[
  {
    "AFM": "123456789",
    "AMKA": "12345678901",
    "Name": "Γιάννης",
    "Surname": "Παπαδόπουλος",
    "Department": "PRINCESS-HK",
    "Position": "Room Attendant",
    "Phone": "6912345678",
    "Email": "john@example.com"
  }
]`}
                      value={batchEmployeeData}
                      onChange={(e) => setBatchEmployeeData(e.target.value)}
                      rows={10}
                      className="font-mono text-xs"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleSeasonalOnboarding}
                    disabled={seasonalOnboardingMutation.isPending || !selectedProperty || !batchEmployeeData}
                    className="w-full"
                  >
                    {seasonalOnboardingMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    {selectedLanguage === 'GR' ? 'Έναρξη Εισαγωγής' : 'Start Onboarding'}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Seasonal Periods</Label>
                    {properties?.find(p => p.propertyId === selectedProperty)?.seasonalPeriods.map((period) => (
                      <div key={period.periodId} className="border rounded-lg p-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {selectedLanguage === 'GR' ? period.nameGr : period.name}
                          </span>
                          <Badge variant={period.type === 'HIGH' ? "default" : "secondary"}>
                            {period.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {period.startDate} - {period.endDate}
                        </div>
                        <div className="text-sm text-gray-600">
                          Expected staff: {period.expectedStaffCount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {seasonalOnboardingMutation.data && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Seasonal onboarding started! Session ID: {seasonalOnboardingMutation.data.onboardingSessionId?.slice(-8)}
                    <br />
                    Employees: {seasonalOnboardingMutation.data.totalEmployees}
                    <br />
                    Estimated completion: {seasonalOnboardingMutation.data.estimatedCompletionMinutes} minutes
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Split Shifts Tab */}
        <TabsContent value="split-shifts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Split Shifts & Cross-Department Coverage</CardTitle>
              <CardDescription>
                Manage employees working across multiple departments and cost centers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleCreateSplitShift}
                disabled={splitShiftMutation.isPending}
                className="w-full md:w-auto"
              >
                {splitShiftMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Split className="mr-2 h-4 w-4" />
                )}
                Create Sample Split Shift
              </Button>

              {splitShifts && splitShifts.length > 0 && (
                <div className="space-y-3">
                  <Label>Current Split Shifts</Label>
                  {splitShifts.map((shift: any) => (
                    <div key={shift.shiftId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Split className="h-4 w-4 text-primary" />
                          <span className="font-medium">Employee {shift.employeeId.slice(-6)}</span>
                          <Badge variant="outline">{shift.date}</Badge>
                        </div>
                        <Badge variant={shift.status === 'COMPLETED' ? "default" : "secondary"}>
                          {shift.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shift.segments.map((segment: any, index: number) => (
                          <div key={segment.segmentId} className="bg-gray-50 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Segment {index + 1}</span>
                              <span className="text-sm text-gray-600">{segment.hours}h</span>
                            </div>
                            <div className="text-sm space-y-1">
                              <div>Department: {segment.departmentId}</div>
                              <div>Time: {segment.startTime} - {segment.endTime}</div>
                              <div>Cost Center: {segment.costCenterId}</div>
                              <div>Earnings: {segment.earningsCode}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        Total hours: {shift.totalHours}h
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}