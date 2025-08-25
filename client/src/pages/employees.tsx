import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import EmployeeCard from "@/components/EmployeeCard";
import SimpleEmployeeForm from "@/components/SimpleEmployeeForm";
import { Plus, Download, Search } from "lucide-react";
import type { Employee } from "@shared/schema";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees with proper typing
  const { data: employees = [], isLoading, error } = useQuery<Employee[]>({
    queryKey: ["/api/employees", searchTerm, selectedDepartment, selectedPosition],
    queryFn: async ({ queryKey }) => {
      const [url, search, department, position] = queryKey;
      const params = new URLSearchParams();
      if (search) params.append("search", search as string);
      if (department && department !== "all") params.append("department", department as string);
      if (position && position !== "all") params.append("position", position as string);
      
      const response = await fetch(`${url}?${params.toString()}`, {
        credentials: "include",
      });

      // if (response.status === 401) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return [];
      // }

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return await response.json() as Employee[];
    },
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      // if (isUnauthorizedError(error as Error)) {
      //   toast({
      //     title: "Unauthorized", 
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία φόρτωσης εργαζομένων",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Επιτυχία",
        description: "Ο εργαζόμενος διαγράφηκε επιτυχώς",
      });
    },
    onError: (error: any) => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία διαγραφής εργαζομένου",
        variant: "destructive",
      });
    },
  });

  // Export employees mutation
  const exportEmployeesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/employees/export/excel");
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Επιτυχία",
        description: "Η εξαγωγή ξεκίνησε",
      });
    },
    onError: (error: any) => {
      // if (isUnauthorizedError(error)) {
      //   toast({
      //     title: "Unauthorized",
      //     description: "You are logged out. Logging in again...",
      //     variant: "destructive",
      //   });
      //   setTimeout(() => {
      //     window.location.href = "/api/login";
      //   }, 500);
      //   return;
      // }
      toast({
        title: "Σφάλμα",
        description: "Αποτυχία εξαγωγής",
        variant: "destructive",
      });
    },
  });

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm("Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτόν τον εργαζόμενο;")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
  };

  const handleExport = () => {
    exportEmployeesMutation.mutate();
  };

  // Get unique departments and positions for filters - using available fields
  const departments = ['Front Office', 'Housekeeping', 'Food & Beverage', 'Maintenance']; // Static for now
  const positions = ['Manager', 'Supervisor', 'Staff', 'Intern']; // Static for now

  // useEffect(() => {
  //   const userId = null; // This would be checked by the auth system
  //   if (!userId) {
  //     toast({
  //       title: "Unauthorized",
  //       description: "You are logged out. Logging in again...",
  //       variant: "destructive",
  //     });
  //     setTimeout(() => {
  //       window.location.href = "/api/login";
  //     }, 500);
  //     return;
  //   }
  // }, [toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Διαχείριση Εργαζομένων</h2>
          <p className="text-neutral-600 mt-1">
            Προσθήκη, επεξεργασία και διαχείριση στοιχείων εργαζομένων
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={handleAddEmployee}>
            <Plus className="mr-2 h-4 w-4" />
            Νέος Εργαζόμενος
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exportEmployeesMutation.isPending}>
            <Download className="mr-2 h-4 w-4" />
            Εξαγωγή
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Αναζήτηση εργαζομένων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Όλα τα Τμήματα" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλα τα Τμήματα</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Όλες οι Θέσεις" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλες οι Θέσεις</SelectItem>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-neutral-200 rounded-full mr-4"></div>
                <div>
                  <div className="h-4 bg-neutral-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-neutral-200 rounded w-full"></div>
                <div className="h-3 bg-neutral-200 rounded w-3/4"></div>
                <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-neutral-500 mb-4">
            Δεν βρέθηκαν εργαζόμενοι
          </div>
          <Button onClick={handleAddEmployee}>
            <Plus className="mr-2 h-4 w-4" />
            Προσθέστε τον πρώτο εργαζόμενο
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee: Employee) => (
            <EmployeeCard
              key={employee.employeeId}
              employee={employee}
              onEdit={() => handleEditEmployee(employee)}
              onDelete={() => handleDeleteEmployee(employee.employeeId)}
            />
          ))}
        </div>
      )}

      {/* Employee Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Επεξεργασία Εργαζομένου" : "Προσθήκη Νέου Εργαζομένου"}
            </DialogTitle>
          </DialogHeader>
          <SimpleEmployeeForm
            employee={editingEmployee ? {
              employeeId: editingEmployee.employeeId,
              name: editingEmployee.name,
              employeeNumber: editingEmployee.employeeNumber,
              role: editingEmployee.role || "",
              employmentType: editingEmployee.employmentType,
              hireDate: editingEmployee.hireDate,
              afm: editingEmployee.afm || "",
              defaultPropertyId: editingEmployee.defaultPropertyId || "prop-princess"
            } : null}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
