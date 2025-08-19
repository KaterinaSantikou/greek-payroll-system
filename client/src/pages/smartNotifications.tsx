import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageSquare,
  Users,
  DollarSign,
  TrendingUp,
  Zap
} from "lucide-react";

export default function SmartNotifications() {
  const { toast } = useToast();
  const [lastResponse, setLastResponse] = useState<any>(null);

  const sendFailureAlert = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/demo/send-failure-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to send alert');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Failure Alert Sent",
        description: "ERGANI integration failure alert sent to Slack and Teams",
      });
      setLastResponse(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send failure alert",
        variant: "destructive",
      });
    },
  });

  const sendApprovalRequest = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/demo/send-approval-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to send request');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Approval Request Sent",
        description: `Overtime approval request sent (ID: ${data.approvalId})`,
      });
      setLastResponse(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send approval request",
        variant: "destructive",
      });
    },
  });

  const sendPayrollReady = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/demo/send-payroll-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to send notification');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payroll Ready Notification Sent",
        description: "Weekly payroll readiness notification sent to managers",
      });
      setLastResponse(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send payroll notification",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Bell className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Smart Notifications & Approvals
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Intelligent notification system with Slack/Teams integration for push failure alerts, 
              real-time approval workflows, and automated compliance monitoring.
            </p>
          </div>

          {/* Features Overview */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <CardTitle className="text-lg">Failure Alerts</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Instant push notifications for ERGANI/APD/ΦΜΥ integration failures with 
                  automatic retry logic and escalation paths.
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">Real-time</Badge>
                  <Badge variant="outline" className="text-xs">Auto-retry</Badge>
                  <Badge variant="outline" className="text-xs">Escalation</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-orange-500" />
                  <CardTitle className="text-lg">Approval Workflows</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Context-aware approval requests with approve/reject buttons directly 
                  in Slack/Teams without context switching.
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">One-click</Badge>
                  <Badge variant="outline" className="text-xs">Context-rich</Badge>
                  <Badge variant="outline" className="text-xs">Audit trail</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <CardTitle className="text-lg">Payroll Ready</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Weekly payroll readiness notifications with summary totals, 
                  compliance status, and direct links to processing workflows.
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">Weekly</Badge>
                  <Badge variant="outline" className="text-xs">Summary</Badge>
                  <Badge variant="outline" className="text-xs">Compliance</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demo Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-blue-600" />
                Live Demo - Smart Notification Testing
              </CardTitle>
              <CardDescription>
                Test the smart notification system by sending sample alerts to configured Slack and Teams channels.
                These demonstrations show real notification formats with context-aware content and action buttons.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Failure Alert Demo */}
              <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                      ERGANI Integration Failure Alert
                    </h3>
                    <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                      Sends a critical failure alert for ERGANI timeout with 3 affected employees, 
                      including retry options and direct links to view error details.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="destructive" className="text-xs">High Priority</Badge>
                      <Badge variant="outline" className="text-xs">3 Employees</Badge>
                      <Badge variant="outline" className="text-xs">Retry Available</Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => sendFailureAlert.mutate()} 
                  disabled={sendFailureAlert.isPending}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {sendFailureAlert.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending Alert...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Send Failure Alert
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Approval Request Demo */}
              <div className="p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      Overtime Approval Request
                    </h3>
                    <p className="text-orange-700 dark:text-orange-300 text-sm mb-4">
                      Sends an approval request for Maria's 4.5 hours overtime on Saturday night shift, 
                      including cost breakdown and one-click approve/reject buttons.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">€67.50</Badge>
                      <Badge variant="outline" className="text-xs">Housekeeping</Badge>
                      <Badge variant="outline" className="text-xs">24h Expiry</Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => sendApprovalRequest.mutate()} 
                  disabled={sendApprovalRequest.isPending}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
                >
                  {sendApprovalRequest.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Send Approval Request
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Payroll Ready Demo */}
              <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                      Weekly Payroll Ready Notification
                    </h3>
                    <p className="text-green-700 dark:text-green-300 text-sm mb-4">
                      Sends weekly payroll readiness summary for 47 employees with total costs, 
                      compliance status, and direct processing links.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">47 Employees</Badge>
                      <Badge variant="outline" className="text-xs">€125,840 Gross</Badge>
                      <Badge variant="outline" className="text-xs">2 Issues</Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => sendPayrollReady.mutate()} 
                  disabled={sendPayrollReady.isPending}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                >
                  {sendPayrollReady.isPending ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending Notification...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Send Payroll Ready
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Integration Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
                Integration Status & Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Slack Integration</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mock Implementation
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Adaptive cards with action buttons for immediate approval/rejection without leaving Slack.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200">Teams Integration</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Mock Implementation
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Teams Bot Framework integration with adaptive cards and webhook responses.
                  </p>
                </div>
              </div>

              {lastResponse && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Last Response:</h5>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Details */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-800 dark:text-blue-200 text-sm">
              <Users className="h-4 w-4" />
              Smart Notifications System - Real-time approval workflows with audit trails
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}