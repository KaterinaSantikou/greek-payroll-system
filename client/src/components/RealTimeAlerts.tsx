/**
 * Real-Time Alerts System
 * Provides automated alerts for critical events, deadlines, and system issues
 */
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Bell,
  X,
  ExternalLink,
  Zap,
  FileText,
  DollarSign,
  Users,
  Calendar,
  Timer,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Mute,
  Volume2
} from "lucide-react";

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertCategory = 'payroll' | 'compliance' | 'payment' | 'deadline' | 'system' | 'performance';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'snoozed';

export interface RealTimeAlert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  timestamp: string;
  deadline?: string;
  affectedCount?: number;
  actionUrl?: string;
  actionLabel?: string;
  estimatedResolutionTime?: string;
  metadata: {
    source: string;
    relatedId?: string;
    autoResolve: boolean;
    persistent: boolean;
  };
}

interface AlertsProps {
  userId: string;
  userRole: string;
  enableDesktopNotifications?: boolean;
  enableSound?: boolean;
  showOnlyUnacknowledged?: boolean;
  maxAlertsToShow?: number;
}

export default function RealTimeAlerts({
  userId,
  userRole,
  enableDesktopNotifications = true,
  enableSound = false,
  showOnlyUnacknowledged = true,
  maxAlertsToShow = 5
}: AlertsProps) {
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [lastAlertId, setLastAlertId] = useState<string>('');

  // Fetch alerts with real-time updates
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['/api/alerts/real-time', userId, userRole],
    refetchInterval: 5000, // Check every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Alert actions
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/real-time'] });
    }
  });

  const snoozeAlert = useMutation({
    mutationFn: async ({ alertId, duration }: { alertId: string; duration: number }) => {
      const response = await fetch(`/api/alerts/${alertId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, durationMinutes: duration })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/real-time'] });
    }
  });

  // Mock alerts for demo
  const mockAlerts: RealTimeAlert[] = [
    {
      id: 'alert-fmy-overdue',
      title: 'ΦΜΥ Submission Overdue',
      message: 'Quarterly ΦΜΥ submission is 3 days past due. Immediate action required to avoid penalties.',
      severity: 'critical',
      category: 'compliance',
      status: 'active',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      deadline: '2025-01-15',
      actionUrl: '/compliance/fmy-filing',
      actionLabel: 'Submit Now',
      estimatedResolutionTime: '30 min',
      metadata: {
        source: 'compliance_monitor',
        relatedId: 'fmy-q1-2025',
        autoResolve: false,
        persistent: true
      }
    },
    {
      id: 'alert-payment-failures',
      title: 'Payment Batch Failures',
      message: '5 employee payments failed due to invalid bank details. Employees need immediate resolution.',
      severity: 'critical',
      category: 'payment',
      status: 'active',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      affectedCount: 5,
      actionUrl: '/payments/failed-payments',
      actionLabel: 'Resolve Failures',
      estimatedResolutionTime: '45 min',
      metadata: {
        source: 'payment_processor',
        relatedId: 'batch-20250128-001',
        autoResolve: false,
        persistent: true
      }
    },
    {
      id: 'alert-apd-deadline',
      title: 'APD Filing Deadline Approaching',
      message: 'Monthly APD filing due in 2 days. Review overtime approvals before submission.',
      severity: 'high',
      category: 'deadline',
      status: 'active',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      deadline: '2025-01-31',
      actionUrl: '/compliance/apd-filing',
      actionLabel: 'Review & Submit',
      estimatedResolutionTime: '15 min',
      metadata: {
        source: 'deadline_monitor',
        relatedId: 'apd-jan-2025',
        autoResolve: true,
        persistent: false
      }
    },
    {
      id: 'alert-overtime-variance',
      title: 'High Overtime Variance Detected',
      message: 'Overtime hours are 18% above target this week. Consider staffing adjustments.',
      severity: 'medium',
      category: 'performance',
      status: 'active',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      actionUrl: '/analytics/overtime-analysis',
      actionLabel: 'View Analysis',
      estimatedResolutionTime: '20 min',
      metadata: {
        source: 'analytics_engine',
        relatedId: 'overtime-week-4',
        autoResolve: true,
        persistent: false
      }
    },
    {
      id: 'alert-ergani-sync',
      title: 'ERGANI Sync Issues',
      message: '3 employees have data inconsistencies preventing ERGANI submission.',
      severity: 'high',
      category: 'compliance',
      status: 'active',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      affectedCount: 3,
      actionUrl: '/compliance/ergani-dashboard',
      actionLabel: 'Fix Issues',
      estimatedResolutionTime: '30 min',
      metadata: {
        source: 'ergani_sync',
        relatedId: 'sync-errors-batch-3',
        autoResolve: false,
        persistent: true
      }
    }
  ];

  // Filter alerts based on preferences
  const filteredAlerts = mockAlerts
    .filter(alert => showOnlyUnacknowledged ? alert.status === 'active' : true)
    .sort((a, b) => {
      // Sort by severity first, then by timestamp
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      const aSeverity = severityOrder[a.severity];
      const bSeverity = severityOrder[b.severity];
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity;
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })
    .slice(0, maxAlertsToShow);

  // Desktop notification handler
  const showDesktopNotification = useCallback((alert: RealTimeAlert) => {
    if (!enableDesktopNotifications || typeof Notification === 'undefined') return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === 'critical',
        timestamp: Date.now()
      });

      notification.onclick = () => {
        window.focus();
        if (alert.actionUrl) {
          // In real app: navigate to alert.actionUrl
          console.log(`Navigate to: ${alert.actionUrl}`);
        }
        notification.close();
      };

      // Auto-close non-critical notifications
      if (alert.severity !== 'critical') {
        setTimeout(() => notification.close(), 8000);
      }
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [enableDesktopNotifications]);

  // Sound notification
  const playAlertSound = useCallback((severity: AlertSeverity) => {
    if (!soundEnabled) return;
    
    // Create different sounds for different severities
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different severities
    const frequencies = {
      critical: [800, 600, 800],
      high: [400, 600],
      medium: [300],
      low: [200],
      info: [150]
    };
    
    const freqs = frequencies[severity] || [300];
    freqs.forEach((freq, index) => {
      setTimeout(() => {
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        if (index === 0) {
          oscillator.start(audioContext.currentTime);
        }
        if (index === freqs.length - 1) {
          oscillator.stop(audioContext.currentTime + 0.2);
        }
      }, index * 250);
    });
  }, [soundEnabled]);

  // Handle new alerts
  useEffect(() => {
    const newAlerts = filteredAlerts.filter(alert => 
      alert.status === 'active' && alert.id !== lastAlertId
    );

    if (newAlerts.length > 0) {
      const latestAlert = newAlerts[0];
      setLastAlertId(latestAlert.id);
      
      // Show desktop notification for new critical/high alerts
      if (['critical', 'high'].includes(latestAlert.severity)) {
        showDesktopNotification(latestAlert);
        playAlertSound(latestAlert.severity);
      }
    }
  }, [filteredAlerts, lastAlertId, showDesktopNotification, playAlertSound]);

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'payroll': return <Users className="w-4 h-4" />;
      case 'compliance': return <FileText className="w-4 h-4" />;
      case 'payment': return <DollarSign className="w-4 h-4" />;
      case 'deadline': return <Calendar className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const handleAlertAction = (alert: RealTimeAlert) => {
    if (alert.actionUrl) {
      console.log(`Navigate to: ${alert.actionUrl}`);
      // In real app: navigate(alert.actionUrl);
    }
  };

  if (filteredAlerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            All Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No active alerts. Your systems are running smoothly.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Real-Time Alerts
          {filteredAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {filteredAlerts.length}
            </Badge>
          )}
        </h3>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-muted-foreground"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <Mute className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            variant="ghost" 
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/alerts/real-time'] })}
            className="text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <Alert key={alert.id} className={`${getSeverityColor(alert.severity)} shadow-sm`}>
            <div className="flex items-start gap-3">
              {getSeverityIcon(alert.severity)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {alert.category}
                      </Badge>
                      {alert.severity === 'critical' && (
                        <Badge variant="destructive" className="text-xs animate-pulse">
                          URGENT
                        </Badge>
                      )}
                    </div>
                    
                    <AlertDescription className="text-sm mb-2">
                      {alert.message}
                    </AlertDescription>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatTimeAgo(alert.timestamp)}</span>
                      
                      {alert.affectedCount && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {alert.affectedCount} affected
                        </span>
                      )}
                      
                      {alert.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(alert.deadline).toLocaleDateString()}
                        </span>
                      )}
                      
                      {alert.estimatedResolutionTime && (
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          Est. {alert.estimatedResolutionTime}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {alert.actionUrl && (
                      <Button
                        size="sm"
                        variant={alert.severity === 'critical' ? 'default' : 'outline'}
                        onClick={() => handleAlertAction(alert)}
                        className="text-xs"
                      >
                        {alert.actionLabel || 'Take Action'}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acknowledgeAlert.mutate(alert.id)}
                      disabled={acknowledgeAlert.isPending}
                      className="text-xs"
                    >
                      Acknowledge
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => snoozeAlert.mutate({ alertId: alert.id, duration: 60 })}
                      disabled={snoozeAlert.isPending}
                      className="text-xs"
                    >
                      <Clock className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </div>

      {/* Alert Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>
          Showing {filteredAlerts.length} of {mockAlerts.length} alerts
        </span>
        <span>
          Last check: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}