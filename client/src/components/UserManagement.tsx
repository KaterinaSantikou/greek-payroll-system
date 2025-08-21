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
import { UserPlus, Settings, Eye, Shield, Users, Mail, Send, CheckCircle, Grid3X3, Lock, Unlock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: UserRole[];
  lastLoginAt?: string;
  isActive: boolean;
}

interface InviteUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  propertyId?: string;
  message?: string;
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
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: true,
  });

  const { data: systemRoles = [], isLoading: rolesLoading } = useQuery<SystemRole[]>({
    queryKey: ['/api/admin/system-roles'],
    enabled: true,
  });

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
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
    onSuccess: (data: any) => {
      const { sessionToken, impersonationData } = data;
      // Store impersonation token and data
      sessionStorage.setItem('impersonation_token', sessionToken);
      sessionStorage.setItem('impersonation_data', JSON.stringify(impersonationData));
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

  const inviteUserMutation = useMutation({
    mutationFn: async (inviteData: InviteUserData) => {
      return apiRequest('POST', '/api/admin/invite-user', inviteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsInviteUserOpen(false);
      toast({
        title: 'Invitation Sent',
        description: 'User invitation has been sent successfully.',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
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
          <Button onClick={() => setIsInviteUserOpen(true)}>
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
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Roles & Policies Matrix
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Invitations
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

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Policies Matrix</CardTitle>
              <CardDescription>
                Visual overview of role permissions and security policies across the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolesPoliciesMatrix 
                systemRoles={systemRoles} 
                isLoading={rolesLoading} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Manage pending user invitations and resend if needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvitations onResendInvite={(email) => {
                // Resend invitation logic
                toast({
                  title: 'Invitation Resent',
                  description: `Invitation has been resent to ${email}`,
                });
              }} />
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

      {/* User Invitation Dialog */}
      <Dialog open={isInviteUserOpen} onOpenChange={setIsInviteUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user with assigned role and permissions
            </DialogDescription>
          </DialogHeader>
          <UserInvitationForm
            systemRoles={systemRoles}
            properties={properties}
            onSubmit={(data) => inviteUserMutation.mutate(data)}
            isLoading={inviteUserMutation.isPending}
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

interface UserInvitationFormProps {
  systemRoles: SystemRole[];
  properties: Property[];
  onSubmit: (data: InviteUserData) => void;
  isLoading: boolean;
}

function UserInvitationForm({ systemRoles, properties, onSubmit, isLoading }: UserInvitationFormProps) {
  const [formData, setFormData] = useState<InviteUserData>({
    email: '',
    firstName: '',
    lastName: '',
    role: '',
    propertyId: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.role) {
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
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
        <Select value={formData.propertyId} onValueChange={(value) => setFormData({ ...formData, propertyId: value })}>
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
        <Label htmlFor="message">Welcome Message (Optional)</Label>
        <Input
          id="message"
          placeholder="Welcome to our payroll system!"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={!formData.email || !formData.role || isLoading}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Invitation
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface PendingInvitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  propertyName?: string;
  sentAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

interface PendingInvitationsProps {
  onResendInvite: (email: string) => void;
}

function PendingInvitations({ onResendInvite }: PendingInvitationsProps) {
  // Mock data - in real implementation, this would come from useQuery
  const pendingInvitations: PendingInvitation[] = [
    {
      id: '1',
      email: 'new.employee@hotel.gr',
      firstName: 'Maria',
      lastName: 'Papadakis',
      role: 'employee',
      sentAt: '2024-01-15T10:00:00Z',
      expiresAt: '2024-01-22T10:00:00Z',
      status: 'pending'
    }
  ];

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusColor = (status: string, expiresAt: string) => {
    if (isExpired(expiresAt)) return 'destructive';
    switch (status) {
      case 'accepted': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {pendingInvitations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pending invitations</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {invitation.firstName} {invitation.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invitation.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {invitation.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(invitation.sentAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(invitation.status, invitation.expiresAt)}>
                    {isExpired(invitation.expiresAt) ? 'Expired' : invitation.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResendInvite(invitation.email)}
                      disabled={invitation.status === 'accepted'}
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

interface RolesPoliciesMatrixProps {
  systemRoles: SystemRole[];
  isLoading: boolean;
}

function RolesPoliciesMatrix({ systemRoles, isLoading }: RolesPoliciesMatrixProps) {
  const permissions = [
    { id: 'view_payslips', name: 'View Payslips', category: 'Payroll' },
    { id: 'manage_payroll', name: 'Manage Payroll', category: 'Payroll' },
    { id: 'view_employees', name: 'View Employees', category: 'HR' },
    { id: 'manage_employees', name: 'Manage Employees', category: 'HR' },
    { id: 'view_timesheets', name: 'View Timesheets', category: 'Time' },
    { id: 'manage_timesheets', name: 'Manage Timesheets', category: 'Time' },
    { id: 'clock_in_out', name: 'Clock In/Out', category: 'Time' },
    { id: 'view_reports', name: 'View Reports', category: 'Reporting' },
    { id: 'export_data', name: 'Export Data', category: 'Data' },
    { id: 'manage_users', name: 'Manage Users', category: 'Admin' },
    { id: 'impersonate_users', name: 'Impersonate Users', category: 'Admin' },
    { id: 'view_audit_logs', name: 'View Audit Logs', category: 'Security' },
    { id: 'manage_security', name: 'Manage Security', category: 'Security' },
  ];

  const getRolePermissions = (roleName: string): string[] => {
    const rolePermissionMap: Record<string, string[]> = {
      'admin': [
        'view_payslips', 'manage_payroll', 'view_employees', 'manage_employees',
        'view_timesheets', 'manage_timesheets', 'view_reports', 'export_data',
        'manage_users', 'impersonate_users', 'view_audit_logs', 'manage_security'
      ],
      'hr_payroll': [
        'view_payslips', 'manage_payroll', 'view_employees', 'manage_employees',
        'view_timesheets', 'manage_timesheets', 'view_reports', 'export_data'
      ],
      'manager': [
        'view_payslips', 'view_employees', 'view_timesheets', 'manage_timesheets',
        'view_reports', 'export_data'
      ],
      'employee': [
        'view_payslips', 'view_timesheets', 'clock_in_out'
      ],
      'readonly': [
        'view_payslips', 'view_employees', 'view_timesheets'
      ]
    };
    return rolePermissionMap[roleName] || [];
  };

  const hasPermission = (roleName: string, permissionId: string): boolean => {
    return getRolePermissions(roleName).includes(permissionId);
  };

  const getPermissionColor = (hasPermission: boolean, isHighRisk: boolean): string => {
    if (!hasPermission) return 'bg-gray-100 text-gray-400';
    if (isHighRisk) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const isHighRiskPermission = (permissionId: string): boolean => {
    return ['manage_payroll', 'manage_employees', 'impersonate_users', 'manage_security'].includes(permissionId);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-2 text-sm text-muted-foreground">Loading roles matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Matrix Legend */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
          <span className="text-sm">Granted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
          <span className="text-sm">High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
          <span className="text-sm">Denied</span>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Permission</TableHead>
              {systemRoles.map((role) => (
                <TableHead key={role.name} className="text-center min-w-24">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">{role.displayName}</span>
                    <Badge className={getRoleLevelColor(role.level)} variant="outline">
                      Level {role.level}
                    </Badge>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <React.Fragment key={category}>
                {/* Category Header */}
                <TableRow className="bg-gray-50/50 dark:bg-gray-900/25">
                  <TableCell colSpan={systemRoles.length + 1} className="font-medium text-sm text-muted-foreground">
                    {category} Permissions
                  </TableCell>
                </TableRow>
                
                {/* Permissions in Category */}
                {perms.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isHighRiskPermission(permission.id) ? (
                          <Lock className="w-4 h-4 text-red-500" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-500" />
                        )}
                        <span>{permission.name}</span>
                      </div>
                    </TableCell>
                    {systemRoles.map((role) => (
                      <TableCell key={`${role.name}-${permission.id}`} className="text-center">
                        <div className="flex justify-center">
                          <div 
                            className={`w-6 h-6 rounded border flex items-center justify-center ${
                              getPermissionColor(
                                hasPermission(role.name, permission.id),
                                isHighRiskPermission(permission.id)
                              )
                            }`}
                          >
                            {hasPermission(role.name, permission.id) && (
                              <CheckCircle className="w-3 h-3" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Security Policy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">ABAC Security</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Row-level access control based on employee_id matching
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">PII Masking</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatic masking of sensitive data based on role
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium">Audit Logging</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tamper-evident logs for all sensitive operations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">GDPR Ready</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Data subject rights and privacy controls
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
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