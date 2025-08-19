import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  Activity,
  Zap,
  Database,
  AlertCircle
} from "lucide-react";

interface ErganiSubmissionResult {
  eventId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'QUARANTINED';
  erganiId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  submittedAt: string;
  lastAttemptAt: string;
}

interface ErganiHealthMetrics {
  totalEvents: number;
  successfulEvents: number;
  pendingEvents: number;
  quarantinedEvents: number;
  failedEvents: number;
  successRate: number;
  queueBacklog: number;
  isProcessing: boolean;
  lastActivity: string | null;
}

interface ErganiMirrorLog {
  logId: string;
  eventId: string;
  requestPayload: any;
  responsePayload?: any;
  httpStatus?: number;
  timestamp: string;
  duration: number;
  retryAttempt: number;
}

export default function ErganiCompliance() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const queryClient = useQueryClient();

  // Health metrics query
  const { data: healthMetrics, isLoading: healthLoading } = useQuery<ErganiHealthMetrics>({
    queryKey: ["/api/ergani/health"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Mirror logs query
  const { data: mirrorLogs, isLoading: logsLoading } = useQuery<ErganiMirrorLog[]>({
    queryKey: ["/api/ergani/logs"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Quarantined events query
  const { data: quarantinedEvents, isLoading: quarantineLoading } = useQuery<any[]>({
    queryKey: ["/api/ergani/quarantine"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Export logs mutation
  const exportLogsMutation = useMutation({
    mutationFn: async (format: 'json' | 'csv') => {
      const response = await fetch(`/api/ergani/logs?format=export&exportFormat=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ergani_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  // Retry quarantined event mutation
  const retryEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/ergani/quarantine/${eventId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ergani/quarantine"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ergani/health"] });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'QUARANTINED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      SUCCESS: "default",
      PENDING: "secondary",
      FAILED: "destructive",
      QUARANTINED: "outline"
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ERGANI II Compliance</h1>
          <p className="text-muted-foreground">
            Real-time submission monitoring and compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportLogsMutation.mutate('json')}
            disabled={exportLogsMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            onClick={() => exportLogsMutation.mutate('csv')}
            disabled={exportLogsMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Health Metrics Dashboard */}
      {healthMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {healthMetrics.successRate.toFixed(1)}%
              </div>
              <Progress value={healthMetrics.successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthMetrics.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {healthMetrics.successfulEvents} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{healthMetrics.queueBacklog}</div>
              <p className="text-xs text-muted-foreground">
                {healthMetrics.isProcessing ? "Processing..." : "Idle"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quarantined</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {healthMetrics.quarantinedEvents}
              </div>
              <p className="text-xs text-muted-foreground">Need review</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Mirror Logs</TabsTrigger>
          <TabsTrigger value="quarantine">Quarantine Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission Logs</CardTitle>
              <CardDescription>
                Real-time mirror of all ERGANI II API requests and responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Retry</TableHead>
                      <TableHead>Response</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mirrorLogs?.map((log) => (
                      <TableRow key={log.logId}>
                        <TableCell className="font-mono text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.eventId.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {log.httpStatus === 200 ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Error {log.httpStatus}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{log.duration}ms</TableCell>
                        <TableCell>{log.retryAttempt}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.responsePayload?.erganiId || log.responsePayload?.error || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarantine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quarantined Events</CardTitle>
              <CardDescription>
                Events that failed multiple submission attempts and require manual review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!quarantinedEvents || quarantinedEvents.length === 0 ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    No events in quarantine. All submissions are processing normally.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {quarantinedEvents?.map((event: any) => (
                      <Card key={event.eventId}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <p className="font-mono text-sm">{event.eventId}</p>
                              <p className="text-sm text-muted-foreground">
                                Employee: {event.employeeAfm} | Property: {event.propertyCode}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Event: {event.eventType} at {new Date(event.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => retryEventMutation.mutate(event.eventId)}
                              disabled={retryEventMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Submission Timeline</CardTitle>
                <CardDescription>
                  Event submission patterns over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Timeline chart would be rendered here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
                <CardDescription>
                  Breakdown of submission errors by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Error analysis chart would be rendered here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}