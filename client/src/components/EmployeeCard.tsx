import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, CreditCard, Calendar, Euro, Edit, Trash2 } from "lucide-react";
import type { Employee } from "@shared/schema";

interface EmployeeCardProps {
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
}

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  terminated: "bg-red-100 text-red-800",
  probation: "bg-amber-100 text-amber-800",
};

const statusLabels = {
  active: "Ενεργός",
  inactive: "Ανενεργός",
  terminated: "Απολυμένος",
  probation: "Δοκιμαστική",
};

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-primary",
    "bg-pink-500",
    "bg-purple-500",
    "bg-indigo-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
  ];
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
  const initials = getInitials(employee.firstName, employee.lastName);
  const avatarColor = getAvatarColor(employee.firstName + employee.lastName);
  const status = (employee.status as keyof typeof statusColors) || 'active';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`${avatarColor} text-white w-12 h-12 rounded-full flex items-center justify-center mr-4`}>
              <span className="font-semibold">{initials}</span>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">
                {employee.firstName} {employee.lastName}
              </h3>
              <p className="text-sm text-neutral-600">{employee.position}</p>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <Building className="w-5 text-neutral-400 mr-3" />
            <span className="text-neutral-600">Τμήμα: </span>
            <span className="font-medium text-neutral-900 ml-1">{employee.department}</span>
          </div>
          <div className="flex items-center text-sm">
            <CreditCard className="w-5 text-neutral-400 mr-3" />
            <span className="text-neutral-600">ΑΦΜ: </span>
            <span className="font-medium text-neutral-900 ml-1">{employee.afm}</span>
          </div>
          <div className="flex items-center text-sm">
            <Calendar className="w-5 text-neutral-400 mr-3" />
            <span className="text-neutral-600">Πρόσληψη: </span>
            <span className="font-medium text-neutral-900 ml-1">
              {new Date(employee.hireDate).toLocaleDateString('el-GR')}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <Euro className="w-5 text-neutral-400 mr-3" />
            <span className="text-neutral-600">Μισθός: </span>
            <span className="font-medium text-neutral-900 ml-1">
              €{parseFloat(employee.basicSalary).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-neutral-200">
          <Badge className={`${statusColors[status]}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current mr-1"></div>
            {statusLabels[status]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
