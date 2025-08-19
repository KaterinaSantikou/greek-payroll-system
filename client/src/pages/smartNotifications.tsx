import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle, Clock, AlertTriangle, Mail, MessageSquare, Users, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  notificationId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  status: string;
  createdAt: string;
  actionRequired: boolean;
  actionType?: string;
  relatedEntityId?: string;
}

interface NotificationPreferences {
  slackEnabled: boolean;
  slackChannelId?: string;
  teamsEnabled: boolean;
  teamsWebhookUrl?: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string;
  overtimeApprovals: any;
  erganiAlerts: any;
  complianceAlerts: any;
  payrollDigests: any;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export default function SmartNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  // Fetch preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/notifications/preferences"],
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest(`/api/notifications/${notificationId}/read`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Process approval action
  const processActionMutation = useMutation({
    mutationFn: ({ notificationId, action, comments }: { 
      notificationId: string; 
      action: string; 
      comments?: string; 
    }) => 
      apiRequest(`/api/notifications/${notificationId}/action`, { 
        method: "POST",
        body: JSON.stringify({ action, comments })
      }),
    onSuccess: (_, variables) => {
      toast({
        title: "Action Processed",
        description: `${variables.action} action completed successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process action",
        variant: "destructive",
      });
    },
  });

  // Update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (newPreferences: Partial<NotificationPreferences>) => 
      apiRequest("/api/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(newPreferences)
      }),
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] });
    },
  });

  // Create test notification
  const createTestMutation = useMutation({
    mutationFn: (data: { type: string; title: string; message: string }) => 
      apiRequest("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Test Notification Created",
        description: "Check your notification list for the test message",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read': 
      case 'acted_upon': 
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': 
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default: 
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  if (notificationsLoading || preferencesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage alerts, approvals, and integration settings
          </p>
        </div>
        <Button 
          onClick={() => createTestMutation.mutate({
            type: 'test',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working'
          })}
          disabled={createTestMutation.isPending}
        >
          <Bell className="h-4 w-4 mr-2" />
          Create Test
        </Button>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                All notifications and alerts from the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification: Notification) => (
                    <div
                      key={notification.notificationId}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(notification.status)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <Badge className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                            <Badge variant="outline">{notification.category}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {notification.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(notification.notificationId)}
                            disabled={markAsReadMutation.isPending}
                          >
                            Mark Read
                          </Button>
                        )}
                        {notification.actionRequired && notification.status === 'pending' && (
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              onClick={() => processActionMutation.mutate({
                                notificationId: notification.notificationId,
                                action: 'approve'
                              })}
                              disabled={processActionMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => processActionMutation.mutate({
                                notificationId: notification.notificationId,
                                action: 'reject'
                              })}
                              disabled={processActionMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Overtime requests, exceptions, and other items requiring approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications
                  .filter((n: Notification) => n.actionRequired && n.status === 'pending')
                  .map((notification: Notification) => (
                    <div
                      key={notification.notificationId}
                      className="flex items-start justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20"
                    >
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => processActionMutation.mutate({
                            notificationId: notification.notificationId,
                            action: 'approve'
                          })}
                          disabled={processActionMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => processActionMutation.mutate({
                            notificationId: notification.notificationId,
                            action: 'reject'
                          })}
                          disabled={processActionMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                {notifications.filter((n: Notification) => n.actionRequired && n.status === 'pending').length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No pending approvals
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Slack Integration
                </CardTitle>
                <CardDescription>
                  Get overtime approvals and alerts directly in Slack
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.slackEnabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ slackEnabled: checked })
                    }
                  />
                  <Label>Enable Slack notifications</Label>
                </div>
                <div>
                  <Label htmlFor="slack-channel">Slack Channel ID</Label>
                  <Input
                    id="slack-channel"
                    placeholder="C1234567890"
                    value={preferences?.slackChannelId || ''}
                    onChange={(e) => 
                      updatePreferencesMutation.mutate({ slackChannelId: e.target.value })
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Find your channel ID in Slack settings
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Teams Integration
                </CardTitle>
                <CardDescription>
                  Receive notifications in Microsoft Teams
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.teamsEnabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ teamsEnabled: checked })
                    }
                  />
                  <Label>Enable Teams notifications</Label>
                </div>
                <div>
                  <Label htmlFor="teams-webhook">Teams Webhook URL</Label>
                  <Input
                    id="teams-webhook"
                    placeholder="https://outlook.office.com/webhook/..."
                    value={preferences?.teamsWebhookUrl || ''}
                    onChange={(e) => 
                      updatePreferencesMutation.mutate({ teamsWebhookUrl: e.target.value })
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Create an incoming webhook connector in your Teams channel
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Configure email notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.emailEnabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ emailEnabled: checked })
                    }
                  />
                  <Label>Enable email notifications</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quiet-start">Quiet hours start</Label>
                    <Input
                      id="quiet-start"
                      type="time"
                      value={preferences?.quietHoursStart || '22:00'}
                      onChange={(e) => 
                        updatePreferencesMutation.mutate({ quietHoursStart: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="quiet-end">Quiet hours end</Label>
                    <Input
                      id="quiet-end"
                      type="time"
                      value={preferences?.quietHoursEnd || '08:00'}
                      onChange={(e) => 
                        updatePreferencesMutation.mutate({ quietHoursEnd: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure which notifications you receive and how
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Overtime Approvals</h4>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.overtimeApprovals?.enabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ 
                        overtimeApprovals: { 
                          ...preferences?.overtimeApprovals, 
                          enabled: checked 
                        }
                      })
                    }
                  />
                  <Label>Receive overtime approval notifications</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">ERGANI Alerts</h4>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.erganiAlerts?.enabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ 
                        erganiAlerts: { 
                          ...preferences?.erganiAlerts, 
                          enabled: checked 
                        }
                      })
                    }
                  />
                  <Label>Receive ERGANI failure alerts</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Compliance Alerts</h4>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.complianceAlerts?.enabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ 
                        complianceAlerts: { 
                          ...preferences?.complianceAlerts, 
                          enabled: checked 
                        }
                      })
                    }
                  />
                  <Label>Receive compliance alerts</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Payroll Digests</h4>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={preferences?.payrollDigests?.enabled || false}
                    onCheckedChange={(checked) => 
                      updatePreferencesMutation.mutate({ 
                        payrollDigests: { 
                          ...preferences?.payrollDigests, 
                          enabled: checked 
                        }
                      })
                    }
                  />
                  <Label>Receive weekly payroll readiness summaries</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}