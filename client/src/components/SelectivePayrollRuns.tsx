import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Users,
  CheckSquare,
  Square,
  Filter,
  AlertCircle,
  Clock,
  CreditCard,
  FileText,
  Play,
  Pause,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Employee {
  employeeId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  propertyId: string;
  propertyName: string;
  teamName?: string;
  contractType: string;
  basePay: number;
  payCalendar: string;
  hasApprovedTimesheet: boolean;
  missingIban: boolean;
  missingAfm: boolean;
  capsWarning?: string;
}

interface PayrollScope {
  scopeId: string;
  period: string;
  type: string;
  status: string;
  selectedEmployees: string[];
  totalEmployees: number;
  totalGrossPay: number;
  description?: string;
  createdAt: string;
}

interface FilterState {
  search: string;
  property: string;
  team: string;
  status: string;
  contractType: string;
  payCalendar: string;
  showOnlyApproved: boolean;
}

export function SelectivePayrollRuns() {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    property: 'all',
    team: 'all',
    status: 'active',
    contractType: 'all',
    payCalendar: 'all',
    showOnlyApproved: true,
  });
  const [currentPeriod, setCurrentPeriod] = useState('2025-01');
  const [showScopeDrawer, setShowScopeDrawer] = useState(false);
  const [scopeType, setScopeType] = useState('regular');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees with filters
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/payroll/employees', filters, currentPeriod],
    queryFn: () =>
      apiRequest(
        'GET',
        `/api/payroll/employees?period=${currentPeriod}&${new URLSearchParams(filters as any).toString()}`
      ),
  });

  // Fetch existing scopes for the period
  const { data: existingScopes = [], isLoading: scopesLoading } = useQuery({
    queryKey: ['/api/payroll/scopes', currentPeriod],
    queryFn: () =>
      apiRequest('GET', `/api/payroll/scopes?period=${currentPeriod}`),
  });

  // Fetch filter options
  const { data: filterOptions = {} } = useQuery({
    queryKey: ['/api/payroll/filter-options'],
    queryFn: () => apiRequest('GET', '/api/payroll/filter-options'),
  });

  // Create payroll scope mutation
  const createScopeMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/payroll/scopes', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payroll/scopes'] });
      setSelectedEmployees([]);
      setShowScopeDrawer(false);
      toast({
        title: 'Payroll Scope Created',
        description: `Created scope with ${selectedEmployees.length} employees`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error Creating Scope',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligibleEmployees = employees
        .filter(emp => emp.hasApprovedTimesheet || !filters.showOnlyApproved)
        .map(emp => emp.employeeId);
      setSelectedEmployees(eligibleEmployees);
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleEmployeeSelect = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const getIncompatibleEmployees = () => {
    const selected = employees.filter(emp =>
      selectedEmployees.includes(emp.employeeId)
    );
    const payCalendars = new Set(selected.map(emp => emp.payCalendar));
    const properties = new Set(selected.map(emp => emp.propertyId));

    return {
      multipleCalendars: payCalendars.size > 1,
      multipleProperties: properties.size > 1,
      calendars: Array.from(payCalendars),
      properties: Array.from(properties).map(
        propId =>
          selected.find(emp => emp.propertyId === propId)?.propertyName ||
          propId
      ),
    };
  };

  const getEmployeeWarnings = () => {
    const selected = employees.filter(emp =>
      selectedEmployees.includes(emp.employeeId)
    );
    const warnings = [];

    const missingIban = selected.filter(emp => emp.missingIban).length;
    const missingAfm = selected.filter(emp => emp.missingAfm).length;
    const pendingApprovals = selected.filter(
      emp => !emp.hasApprovedTimesheet
    ).length;
    const capsWarnings = selected.filter(emp => emp.capsWarning).length;

    if (missingIban > 0) warnings.push(`${missingIban} employees missing IBAN`);
    if (missingAfm > 0) warnings.push(`${missingAfm} employees missing AFM`);
    if (pendingApprovals > 0)
      warnings.push(
        `${pendingApprovals} employees with pending timesheet approvals`
      );
    if (capsWarnings > 0)
      warnings.push(`${capsWarnings} employees with cap consumption warnings`);

    return warnings;
  };

  const canCreateScope = () => {
    const incompatible = getIncompatibleEmployees();
    return (
      selectedEmployees.length > 0 &&
      !incompatible.multipleCalendars &&
      !incompatible.multipleProperties
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            Selective Payroll Runs
          </h2>
          <p className="text-sm text-muted-foreground">
            Run payroll for specific employees or groups while maintaining
            compliance
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">January 2025</SelectItem>
              <SelectItem value="2024-12">December 2024</SelectItem>
              <SelectItem value="2024-11">November 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Existing Scopes */}
      {existingScopes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Existing Scopes - {currentPeriod}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {existingScopes.map((scope: PayrollScope) => (
                <div
                  key={scope.scopeId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        scope.status === 'finalized' ? 'default' : 'secondary'
                      }
                    >
                      {scope.status}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {scope.type.replace('_', ' ')} - {scope.totalEmployees}{' '}
                        employees
                      </p>
                      <p className="text-sm text-muted-foreground">
                        €{scope.totalGrossPay.toFixed(2)} gross •{' '}
                        {scope.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {scope.status === 'finalized' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Input
              placeholder="Search employees..."
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({ ...prev, search: e.target.value }))
              }
            />

            <Select
              value={filters.property}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, property: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {(filterOptions.properties || []).map(prop => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.team}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, team: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {(filterOptions.teams || []).map(team => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.contractType}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, contractType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Contract" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contracts</SelectItem>
                <SelectItem value="indefinite">Indefinite</SelectItem>
                <SelectItem value="fixed_term">Fixed Term</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.payCalendar}
              onValueChange={value =>
                setFilters(prev => ({ ...prev, payCalendar: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pay Calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calendars</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="semi_monthly">Semi-Monthly</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="approved-only"
                checked={filters.showOnlyApproved}
                onCheckedChange={checked =>
                  setFilters(prev => ({
                    ...prev,
                    showOnlyApproved: checked as boolean,
                  }))
                }
              />
              <label htmlFor="approved-only" className="text-sm">
                Approved Only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Employees ({employees.length} found)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedEmployees.length === employees.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm">Select All</span>
          </div>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="text-center py-8">Loading employees...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {employees.map((employee: Employee) => {
                const isSelected = selectedEmployees.includes(
                  employee.employeeId
                );
                const isEligible =
                  employee.hasApprovedTimesheet || !filters.showOnlyApproved;

                return (
                  <div
                    key={employee.employeeId}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      !isEligible ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={checked =>
                          handleEmployeeSelect(
                            employee.employeeId,
                            checked as boolean
                          )
                        }
                        disabled={!isEligible}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {employee.employeeNumber}
                          </Badge>
                          {employee.capsWarning && (
                            <Badge variant="destructive" className="text-xs">
                              Cap Warning
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {employee.propertyName} • {employee.teamName} • €
                          {employee.basePay}/month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!employee.hasApprovedTimesheet && (
                        <AlertCircle
                          className="h-4 w-4 text-amber-500"
                          title="Pending timesheet approval"
                        />
                      )}
                      {employee.missingIban && (
                        <CreditCard
                          className="h-4 w-4 text-red-500"
                          title="Missing IBAN"
                        />
                      )}
                      <Badge
                        variant={
                          employee.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {employee.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selection Summary */}
      {selectedEmployees.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">
                  {selectedEmployees.length} employees selected
                </p>
                <div className="mt-2 space-y-1">
                  {(() => {
                    const incompatible = getIncompatibleEmployees();
                    const warnings = getEmployeeWarnings();

                    return (
                      <div className="space-y-1">
                        {incompatible.multipleCalendars && (
                          <p className="text-sm text-red-600">
                            ⚠️ Multiple pay calendars:{' '}
                            {incompatible.calendars.join(', ')}
                          </p>
                        )}
                        {incompatible.multipleProperties && (
                          <p className="text-sm text-red-600">
                            ⚠️ Multiple properties:{' '}
                            {incompatible.properties.join(', ')}
                          </p>
                        )}
                        {warnings.map((warning, idx) => (
                          <p key={idx} className="text-sm text-amber-600">
                            ⚠️ {warning}
                          </p>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <Button
                onClick={() => setShowScopeDrawer(true)}
                disabled={!canCreateScope()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Create Payroll Scope
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scope Review Drawer */}
      <ScopeReviewDrawer
        open={showScopeDrawer}
        onOpenChange={setShowScopeDrawer}
        selectedEmployees={selectedEmployees}
        employees={employees}
        period={currentPeriod}
        scopeType={scopeType}
        setScopeType={setScopeType}
        onCreateScope={data => createScopeMutation.mutate(data)}
        isCreating={createScopeMutation.isPending}
      />
    </div>
  );
}

interface ScopeReviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployees: string[];
  employees: Employee[];
  period: string;
  scopeType: string;
  setScopeType: (type: string) => void;
  onCreateScope: (data: any) => void;
  isCreating: boolean;
}

function ScopeReviewDrawer({
  open,
  onOpenChange,
  selectedEmployees,
  employees,
  period,
  scopeType,
  setScopeType,
  onCreateScope,
  isCreating,
}: ScopeReviewDrawerProps) {
  const [description, setDescription] = useState('');
  const [includeApprovedOnly, setIncludeApprovedOnly] = useState(true);

  const selectedEmployeeData = employees.filter(emp =>
    selectedEmployees.includes(emp.employeeId)
  );
  const totalGrossPay = selectedEmployeeData.reduce(
    (sum, emp) => sum + emp.basePay,
    0
  );

  const handleCreate = () => {
    onCreateScope({
      period,
      type: scopeType,
      selectorType: 'static_list',
      selectorConfig: { employeeIds: selectedEmployees },
      selectedEmployees,
      includeApprovedOnly,
      description,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Review Payroll Scope</DrawerTitle>
        </DrawerHeader>
        <div className="p-6 space-y-6">
          {/* Scope Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Period</label>
              <Input value={period} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Scope Type
              </label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="off_cycle">Off Cycle</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description (Optional)
            </label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Terminations for December 2024"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="approved-only-drawer"
              checked={includeApprovedOnly}
              onCheckedChange={setIncludeApprovedOnly}
            />
            <label htmlFor="approved-only-drawer" className="text-sm">
              Include only approved timesheets
            </label>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {selectedEmployeeData.length}
              </p>
              <p className="text-sm text-muted-foreground">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">€{totalGrossPay.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">Est. Gross Pay</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {new Set(selectedEmployeeData.map(emp => emp.payCalendar)).size}
              </p>
              <p className="text-sm text-muted-foreground">Pay Calendar(s)</p>
            </div>
          </div>

          {/* Employee List */}
          <div>
            <h4 className="font-medium mb-3">Selected Employees</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedEmployeeData.map(employee => (
                <div
                  key={employee.employeeId}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <p className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {employee.propertyName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      €{employee.basePay.toFixed(2)}
                    </p>
                    {employee.capsWarning && (
                      <Badge variant="destructive" className="text-xs">
                        Warning
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Scope'}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
