import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserPlus, Settings, Eye, Shield, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  lastLoginAt?: string;
  isActive: boolean;
}

interface UserRole {
  id: string;
  role: string;
  displayName: string;
  description?: string;
  propertyId?: string;
  propertyName?: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

interface SystemRole {
  name: string;
  displayName: string;
  description: string;
  level: number;
  isActive: boolean;
}

interface Property {
  propertyId: string;
  propertyName: string;
}

export function UserManagement() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false);
  const [isImpersonationOpen, setIsImpersonationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: true,
  });

  const { data: systemRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/admin/system-roles'],
    enabled: true,
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['/api/properties'],
    enabled: true,
  });

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role, propertyId, expiresAt }: {
      userId: string;
      role: string;
      propertyId?: string;
      expiresAt?: string;
    }) => {
      return apiRequest('POST', '/api/admin/assign-role', {
        userId,
        role,
        propertyId,
        expiresAt
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsAssignRoleOpen(false);
      toast({
        title: 'Role Assigned',
        description: 'User role has been successfully assigned.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign role',
        variant: 'destructive',
      });
    },
  });

  const revokeRoleMutation = useMutation({
    mutationFn: async (roleAssignmentId: string) => {
      return apiRequest('DELETE', `/api/admin/revoke-role/${roleAssignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Role Revoked',
        description: 'User role has been successfully revoked.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke role',
        variant: 'destructive',
      });
    },
  });

  const startImpersonationMutation = useMutation({
    mutationFn: async ({ targetUserId, reason }: {
      targetUserId: string;
      reason: string;
    }) => {
      return apiRequest('POST', '/api/admin/impersonate', {
        targetUserId,
        reason,
        durationMinutes: 60
      });
    },
    onSuccess: (data) => {
      const { sessionToken } = data;
      // Store impersonation token and redirect to employee portal
      sessionStorage.setItem('impersonation_token', sessionToken);
      window.location.href = '/employee-portal';
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start impersonation',
        variant: 'destructive',
      });
    },
  });

  // Filter users based on search term
  const filteredUsers = users.filter((user: User) => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLevelColor = (level: number) => {
    switch (level) {
      case 5: return 'bg-red-100 text-red-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 1: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (usersLoading || rolesLoading || propertiesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user roles, permissions, and access control
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>System Users</CardTitle>
                  <CardDescription>
                    Manage user accounts and role assignments
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant="secondary"
                              className={getRoleLevelColor(5)} // Would use actual role level
                            >
                              {role.displayName}
                              {role.propertyName && (
                                <span className="ml-1 text-xs">
                                  @ {role.propertyName}
                                </span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt 
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsAssignRoleOpen(true);
                            }}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsImpersonationOpen(true);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                Available roles in the system with their permission levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systemRoles.map((role: SystemRole) => (
                  <Card key={role.name}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {role.displayName}
                        </CardTitle>
                        <Badge className={getRoleLevelColor(role.level)}>
                          Level {role.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Assignment Dialog */}
      <Dialog open={isAssignRoleOpen} onOpenChange={setIsAssignRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <RoleAssignmentForm
            user={selectedUser}
            systemRoles={systemRoles}
            properties={properties}
            onSubmit={(data) => assignRoleMutation.mutate(data)}
            isLoading={assignRoleMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Impersonation Dialog */}
      <Dialog open={isImpersonationOpen} onOpenChange={setIsImpersonationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View as Employee</DialogTitle>
            <DialogDescription>
              Start an impersonation session to troubleshoot user issues
            </DialogDescription>
          </DialogHeader>
          <ImpersonationForm
            user={selectedUser}
            onSubmit={(data) => startImpersonationMutation.mutate(data)}
            isLoading={startImpersonationMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RoleAssignmentFormProps {
  user: User | null;
  systemRoles: SystemRole[];
  properties: Property[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function RoleAssignmentForm({ user, systemRoles, properties, onSubmit, isLoading }: RoleAssignmentFormProps) {
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRole) return;

    onSubmit({
      userId: user.id,
      role: selectedRole,
      propertyId: selectedProperty || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {systemRoles.map((role) => (
              <SelectItem key={role.name} value={role.name}>
                <div className="flex items-center justify-between w-full">
                  <span>{role.displayName}</span>
                  <Badge className={`ml-2 ${getRoleLevelColor(role.level)}`}>
                    Level {role.level}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="property">Property (Optional)</Label>
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger>
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.propertyId} value={property.propertyId}>
                {property.propertyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="expiresAt">Expires At (Optional)</Label>
        <Input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={!selectedRole || isLoading}>
          {isLoading ? 'Assigning...' : 'Assign Role'}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface ImpersonationFormProps {
  user: User | null;
  onSubmit: (data: { targetUserId: string; reason: string }) => void;
  isLoading: boolean;
}

function ImpersonationForm({ user, onSubmit, isLoading }: ImpersonationFormProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason.trim()) return;

    onSubmit({
      targetUserId: user.id,
      reason: reason.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="reason">Reason for Impersonation</Label>
        <Input
          id="reason"
          placeholder="e.g., Troubleshooting payslip access issue"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          Please provide a clear reason for audit purposes
        </p>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={!reason.trim() || isLoading}>
          {isLoading ? 'Starting...' : 'Start Impersonation'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Utility function for role level colors
function getRoleLevelColor(level: number) {
  switch (level) {
    case 5: return 'bg-red-100 text-red-800';
    case 4: return 'bg-orange-100 text-orange-800';
    case 3: return 'bg-yellow-100 text-yellow-800';
    case 2: return 'bg-blue-100 text-blue-800';
    case 1: return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}