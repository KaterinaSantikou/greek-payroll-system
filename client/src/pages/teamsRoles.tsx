import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Shield, 
  Plus,
  Settings,
  Crown,
  UserCheck,
  Target,
  BarChart3
} from "lucide-react";

export default function TeamsRoles() {
  const departments = [
    {
      id: 1,
      name: "Front Office",
      manager: "Maria Kostas",
      employees: 24,
      roles: ["Front Desk Agent", "Concierge", "Guest Relations", "Night Auditor"],
      approvers: ["Maria Kostas", "Deputy Manager"],
      avgUtilization: 87
    },
    {
      id: 2,
      name: "Housekeeping",
      manager: "Dimitris Panos", 
      employees: 31,
      roles: ["Room Attendant", "Housekeeping Supervisor", "Laundry Attendant", "Public Area Cleaner"],
      approvers: ["Dimitris Panos"],
      avgUtilization: 92
    },
    {
      id: 3,
      name: "Food & Beverage",
      manager: "Sofia Nikolaou",
      employees: 45,
      roles: ["Server", "Bartender", "Kitchen Assistant", "Sommelier", "Head Chef"],
      approvers: ["Sofia Nikolaou", "Head Chef", "Bar Manager"],
      avgUtilization: 78
    },
    {
      id: 4,
      name: "Maintenance",
      manager: "Kostas Dimitriou",
      employees: 8,
      roles: ["Maintenance Technician", "Electrician", "Plumber", "Groundskeeper"],
      approvers: ["Kostas Dimitriou"],
      avgUtilization: 85
    }
  ];

  const roleHierarchy = [
    {
      level: "Executive",
      roles: [
        { name: "General Manager", count: 1, permissions: ["all_access", "final_approvals"] },
        { name: "Assistant Manager", count: 2, permissions: ["department_oversight", "staff_scheduling"] }
      ]
    },
    {
      level: "Department Heads",
      roles: [
        { name: "Front Office Manager", count: 1, permissions: ["department_management", "staff_approvals"] },
        { name: "Housekeeping Manager", count: 1, permissions: ["department_management", "quality_control"] },
        { name: "F&B Manager", count: 1, permissions: ["department_management", "inventory_control"] }
      ]
    },
    {
      level: "Supervisors",
      roles: [
        { name: "Shift Supervisor", count: 6, permissions: ["shift_management", "basic_approvals"] },
        { name: "Team Leader", count: 4, permissions: ["team_coordination", "time_tracking"] }
      ]
    },
    {
      level: "Associates", 
      roles: [
        { name: "Senior Associate", count: 28, permissions: ["advanced_operations", "training_others"] },
        { name: "Associate", count: 89, permissions: ["basic_operations", "self_service"] }
      ]
    }
  ];

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return "text-red-600 dark:text-red-400";
    if (utilization >= 80) return "text-orange-600 dark:text-orange-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teams & Roles</h1>
          <p className="text-gray-600 dark:text-gray-400">Organization, departments, approvers</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Role Settings
          </Button>
        </div>
      </div>

      {/* Departments Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {dept.name}
                </div>
                <Badge variant="outline">{dept.employees} employees</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Manager</span>
                <div className="flex items-center gap-1">
                  <Crown className="h-3 w-3 text-yellow-500" />
                  <span className="text-sm">{dept.manager}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Roles</span>
                <div className="flex flex-wrap gap-1">
                  {dept.roles.map((role, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">Approvers</span>
                <div className="flex flex-wrap gap-1">
                  {dept.approvers.map((approver, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <UserCheck className="h-3 w-3 mr-1" />
                      {approver}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Utilization</span>
                <span className={`text-sm font-bold ${getUtilizationColor(dept.avgUtilization)}`}>
                  {dept.avgUtilization}%
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1">
                  <Target className="h-3 w-3 mr-1" />
                  Manage
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Hierarchy & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {roleHierarchy.map((level, levelIndex) => (
              <div key={levelIndex} className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">
                  {level.level}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {level.roles.map((role, roleIndex) => (
                    <div key={roleIndex} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{role.name}</span>
                        <Badge>{role.count} people</Badge>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">PERMISSIONS</span>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.map((permission, permIndex) => (
                            <Badge key={permIndex} variant="outline" className="text-xs">
                              {permission.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Departments</p>
                <p className="text-2xl font-bold">4</p>
                <p className="text-xs text-gray-500">Active units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total Staff</p>
                <p className="text-2xl font-bold">108</p>
                <p className="text-xs text-gray-500">Across all departments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Managers</p>
                <p className="text-2xl font-bold">11</p>
                <p className="text-xs text-gray-500">Leadership roles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Target className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Avg. Utilization</p>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-xs text-gray-500">Cross-department</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}