/**
 * Advanced Time Capture & Core Features Demonstration
 * Comprehensive implementation of all clock methods, scheduling, alerts, and security
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Smartphone, 
  Wifi, 
  TabletSmartphone, 
  Monitor, 
  MapPin, 
  Shield, 
  Clock, 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Bell, 
  Lock,
  Camera,
  Fingerprint,
  QrCode,
  Nfc,
  Settings,
  Activity,
  BarChart3,
  Eye
} from "lucide-react";

// Import the core systems
import { CLOCK_METHODS } from "@/lib/timeCaptureCore";
import { SYSTEM_ROLES } from "@/lib/securityPrivacySystem";

export default function AdvancedTimeCapture() {
  const [selectedClockMethod, setSelectedClockMethod] = useState('mobile_qr');
  const [userRole, setUserRole] = useState('employee');
  const [currentProperty, setCurrentProperty] = useState('hotel_001');
  const [isOnline, setIsOnline] = useState(true);
  const [deviceAttested, setDeviceAttested] = useState(true);
  const [currentShift, setCurrentShift] = useState(null);
  const [pendingAlerts, setPendingAlerts] = useState(3);

  // Core Features Demo Data
  const [clockingData, setClockingData] = useState({
    totalOnSite: 47,
    scheduledToday: 52,
    overtimeActive: 8,
    alertsActive: 3,
    erganiSyncRate: 98.7
  });

  const [whosOnNow, setWhosOnNow] = useState([
    {
      department: 'Ρεσεψιόν',
      current: 8,
      scheduled: 10,
      overtime: 2,
      alerts: 1
    },
    {
      department: 'Καθαριότητα',
      current: 15,
      scheduled: 15,
      overtime: 3,
      alerts: 0
    },
    {
      department: 'Εστιατόριο',
      current: 12,
      scheduled: 14,
      overtime: 2,
      alerts: 1
    },
    {
      department: 'Συντήρηση',
      current: 6,
      scheduled: 8,
      overtime: 1,
      alerts: 1
    },
    {
      department: 'Εξωτερικό',
      current: 6,
      scheduled: 5,
      overtime: 0,
      alerts: 0
    }
  ]);

  const [activeAlerts, setActiveAlerts] = useState([
    {
      id: 'alert_001',
      type: 'approaching_max_hours',
      employee: 'Μαρία Παπαδάκη',
      message: 'Προσέγγιση μέγιστων ωρών (7.2/8.0)',
      severity: 'warning',
      department: 'Ρεσεψιόν',
      timestamp: '2025-01-19T09:15:00Z'
    },
    {
      id: 'alert_002',
      type: 'unapproved_overtime',
      employee: 'Γιάννης Κωστόπουλος',
      message: 'Μη εγκεκριμένες υπερωρίες (2.5 ώρες)',
      severity: 'high',
      department: 'Συντήρηση',
      timestamp: '2025-01-19T08:45:00Z'
    },
    {
      id: 'alert_003',
      type: 'missed_break',
      employee: 'Αννα Γεωργίου',
      message: 'Παράλειψη υποχρεωτικού διαλείμματος',
      severity: 'medium',
      department: 'Εστιατόριο',
      timestamp: '2025-01-19T09:30:00Z'
    }
  ]);

  const [recentPunches, setRecentPunches] = useState([
    {
      id: 'punch_001',
      employee: 'Κώστας Αντωνίου',
      type: 'check_in',
      method: 'mobile_qr',
      location: 'Ρεσεψιόν',
      timestamp: '2025-01-19T09:00:00Z',
      validated: true,
      erganiSynced: true
    },
    {
      id: 'punch_002',
      employee: 'Ελένη Μιχαήλ',
      type: 'break_start',
      method: 'kiosk_tablet',
      location: 'Καθαριότητα',
      timestamp: '2025-01-19T08:45:00Z',
      validated: true,
      erganiSynced: true
    },
    {
      id: 'punch_003',
      employee: 'Πέτρος Δημητρίου',
      type: 'check_out',
      method: 'mobile_nfc',
      location: 'Εστιατόριο',
      timestamp: '2025-01-19T08:30:00Z',
      validated: true,
      erganiSynced: false
    }
  ]);

  const handleClockAction = (action: string) => {
    console.log(`Clock action: ${action} using ${selectedClockMethod}`);
    
    // Simulate real-time validation
    const newPunch = {
      id: `punch_${Date.now()}`,
      employee: 'Τρέχων Χρήστης',
      type: action,
      method: selectedClockMethod,
      location: currentProperty,
      timestamp: new Date().toISOString(),
      validated: true,
      erganiSynced: isOnline
    };

    setRecentPunches(prev => [newPunch, ...prev.slice(0, 9)]);
    
    // Update counts
    if (action === 'check_in') {
      setClockingData(prev => ({
        ...prev,
        totalOnSite: prev.totalOnSite + 1
      }));
    } else if (action === 'check_out') {
      setClockingData(prev => ({
        ...prev,
        totalOnSite: prev.totalOnSite - 1
      }));
    }
  };

  const getClockMethodIcon = (method: string) => {
    switch (method) {
      case 'mobile_qr': return <QrCode className="h-4 w-4" />;
      case 'mobile_nfc': return <Nfc className="h-4 w-4" />;
      case 'kiosk_tablet': return <TabletSmartphone className="h-4 w-4" />;
      case 'web_controlled': return <Monitor className="h-4 w-4" />;
      case 'ble_geofenced': return <MapPin className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Προηγμένο Σύστημα Καταγραφής Χρόνου</h1>
          <p className="text-gray-600 mt-2">
            Ολοκληρωμένες δυνατότητες: Μέθοδοι καταγραφής, Προγραμματισμός, Ειδοποιήσεις & Ασφάλεια
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Badge className={deviceAttested ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
            {deviceAttested ? 'Device Attested' : 'Attestation Required'}
          </Badge>
          {pendingAlerts > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {pendingAlerts} Alerts
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="time-capture" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="time-capture">Καταγραφή Χρόνου</TabsTrigger>
          <TabsTrigger value="visibility">Παρακολούθηση</TabsTrigger>
          <TabsTrigger value="scheduling">Προγραμματισμός</TabsTrigger>
          <TabsTrigger value="alerts">Ειδοποιήσεις</TabsTrigger>
          <TabsTrigger value="security">Ασφάλεια</TabsTrigger>
        </TabsList>

        {/* A. Time Capture & Compliance */}
        <TabsContent value="time-capture">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Clock Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Μέθοδοι Καταγραφής Χρόνου
                </CardTitle>
                <CardDescription>
                  Επιλέξτε μέθοδο για check-in/out
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(CLOCK_METHODS).map(([key, method]) => (
                    <div 
                      key={key}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedClockMethod === key 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedClockMethod(key)}
                    >
                      <div className="flex items-center gap-3">
                        {getClockMethodIcon(key)}
                        <div className="flex-1">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-gray-600">{method.description}</div>
                        </div>
                        {method.tamperResistant && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            Tamper-Resistant
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => handleClockAction('check_in')}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                  <Button 
                    onClick={() => handleClockAction('check_out')}
                    variant="outline"
                    className="flex-1"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Check Out
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleClockAction('break_start')}
                    variant="outline"
                    size="sm"
                  >
                    Break Start
                  </Button>
                  <Button 
                    onClick={() => handleClockAction('break_end')}
                    variant="outline"
                    size="sm"
                  >
                    Break End
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Real-time Validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Real-time Validation
                </CardTitle>
                <CardDescription>
                  Ελέγχους συμμόρφωσης & ERGANI II
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Schedule Match</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Double-punch Prevention</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Break Rules</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Max Hours (Daily)</span>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Geofence Validation</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">ERGANI II Sync</span>
                    <span className="text-sm text-green-600">{clockingData.erganiSyncRate}%</span>
                  </div>
                  <Progress value={clockingData.erganiSyncRate} className="h-2" />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Πρόσφατα Events</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {recentPunches.slice(0, 3).map((punch) => (
                      <div key={punch.id} className="text-xs flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{punch.employee}</span>
                        <div className="flex items-center gap-1">
                          {punch.erganiSynced ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exception Workflows */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Exception Workflows
                </CardTitle>
                <CardDescription>
                  Διαχείριση παραβάσεων και εγκρίσεων
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Missed Punch */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Missed Punch</h4>
                    <div className="space-y-2">
                      <Input placeholder="Employee ID" />
                      <Input type="datetime-local" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Punch Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="check_in">Check In</SelectItem>
                          <SelectItem value="check_out">Check Out</SelectItem>
                          <SelectItem value="break_start">Break Start</SelectItem>
                          <SelectItem value="break_end">Break End</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea placeholder="Reason..." className="text-sm" rows={2} />
                      <Button size="sm" className="w-full">Submit for Approval</Button>
                    </div>
                  </div>

                  {/* Wrong Site */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Wrong Site Correction</h4>
                    <div className="space-y-2">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Correct Location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hotel_lobby">Hotel Lobby</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="housekeeping">Housekeeping</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input type="datetime-local" />
                      <Textarea placeholder="Justification..." className="text-sm" rows={2} />
                      <Button size="sm" variant="outline" className="w-full">Request Correction</Button>
                    </div>
                  </div>

                  {/* Retro Corrections */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Retro Corrections</h4>
                    <div className="space-y-2">
                      <Input type="date" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Correction Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time_adjustment">Time Adjustment</SelectItem>
                          <SelectItem value="location_change">Location Change</SelectItem>
                          <SelectItem value="break_correction">Break Correction</SelectItem>
                          <SelectItem value="overtime_add">Add Overtime</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager_001">Μάνος Σωτηρίου</SelectItem>
                          <SelectItem value="manager_002">Ελένη Κοστάκη</SelectItem>
                          <SelectItem value="manager_003">Γιάννης Πέτρου</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="w-full">Route for Approval</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* C. Visibility & Monitoring */}
        <TabsContent value="visibility">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Summary Cards */}
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">{clockingData.totalOnSite}</div>
                      <div className="text-xs text-gray-600">Παρόντες</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{clockingData.scheduledToday}</div>
                      <div className="text-xs text-gray-600">Προγραμματισμένοι</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{clockingData.overtimeActive}</div>
                      <div className="text-xs text-gray-600">Υπερωρίες</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">{clockingData.alertsActive}</div>
                      <div className="text-xs text-gray-600">Ενεργές Ειδοποιήσεις</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{clockingData.erganiSyncRate}%</div>
                      <div className="text-xs text-gray-600">ERGANI Sync</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Who's On Now Board */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Who's On Now - Ανά Τμήμα
                </CardTitle>
                <CardDescription>
                  Πραγματικός χρόνος παρουσίας προσωπικού
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {whosOnNow.map((dept, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{dept.department}</h4>
                        <div className="flex items-center gap-2">
                          {dept.alerts > 0 && (
                            <Badge className="bg-red-100 text-red-800 text-xs">
                              {dept.alerts} alerts
                            </Badge>
                          )}
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {Math.round((dept.current / dept.scheduled) * 100)}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Παρόντες</div>
                          <div className="font-bold text-lg">{dept.current}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Προγραμματισμένοι</div>
                          <div className="font-bold text-lg">{dept.scheduled}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Υπερωρίες</div>
                          <div className="font-bold text-lg text-orange-600">{dept.overtime}</div>
                        </div>
                      </div>
                      
                      <Progress 
                        value={(dept.current / dept.scheduled) * 100} 
                        className="mt-2 h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Πρόσφατη Δραστηριότητα
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPunches.map((punch) => (
                    <div key={punch.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getClockMethodIcon(punch.method)}
                        <div>
                          <div className="font-medium text-sm">{punch.employee}</div>
                          <div className="text-xs text-gray-600">
                            {punch.type} • {punch.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">
                          {new Date(punch.timestamp).toLocaleTimeString('el-GR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          {punch.validated && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                          {punch.erganiSynced ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">ERGANI</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Additional tabs would continue with Scheduling, Alerts, and Security content... */}
        
        <TabsContent value="scheduling">
          <Card>
            <CardHeader>
              <CardTitle>Scheduling & Overtime Management</CardTitle>
              <CardDescription>
                Import/create rotas, overtime workflows, multiple jobs per employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Scheduling features implemented in core system</p>
                <p className="text-sm text-gray-500 mt-2">
                  Includes rota import, overtime approval workflows, and multi-property job assignments
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className={`p-3 border rounded-lg ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{alert.employee}</div>
                          <div className="text-sm">{alert.message}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {alert.department} • {new Date(alert.timestamp).toLocaleTimeString('el-GR')}
                          </div>
                        </div>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Max Daily Hours Alert</Label>
                    <Input type="number" defaultValue="7.5" />
                  </div>
                  <div>
                    <Label>Late Threshold (minutes)</Label>
                    <Input type="number" defaultValue="15" />
                  </div>
                  <div>
                    <Label>Notification Channels</Label>
                    <div className="space-y-2 mt-2">
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">Push Notifications</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked />
                        <span className="text-sm">SMS</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" />
                        <span className="text-sm">Email</span>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Role-Based Access Control
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Current Role</Label>
                    <Select value={userRole} onValueChange={setUserRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SYSTEM_ROLES).map(([key, role]) => (
                          <SelectItem key={key} value={key.toLowerCase()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Current Permissions</h4>
                    <div className="space-y-1">
                      {SYSTEM_ROLES[userRole.toUpperCase() as keyof typeof SYSTEM_ROLES]?.permissions.slice(0, 4).map((perm, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{perm.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                      {SYSTEM_ROLES[userRole.toUpperCase() as keyof typeof SYSTEM_ROLES]?.permissions.length > 4 && (
                        <div className="text-xs text-gray-500">
                          +{SYSTEM_ROLES[userRole.toUpperCase() as keyof typeof SYSTEM_ROLES].permissions.length - 4} more permissions
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Device & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Device Attestation</span>
                  <Badge className={deviceAttested ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {deviceAttested ? 'Verified' : 'Failed'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">GPS Tracking (Outside Geofence)</span>
                  <Badge className="bg-red-100 text-red-800">Disabled</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Retention Compliance</span>
                  <Badge className="bg-green-100 text-green-800">Greek Law</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Audit Log Integrity</span>
                  <Badge className="bg-green-100 text-green-800">Tamper-Evident</Badge>
                </div>

                <div className="border rounded-lg p-3 mt-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Fingerprint className="h-4 w-4" />
                    Biometric Verification
                  </h4>
                  <div className="space-y-2">
                    <Button size="sm" variant="outline" className="w-full">
                      <Camera className="mr-2 h-4 w-4" />
                      Verify Face ID
                    </Button>
                    <Button size="sm" variant="outline" className="w-full">
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Verify Fingerprint
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}