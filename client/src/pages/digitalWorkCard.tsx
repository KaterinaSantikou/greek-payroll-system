import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { 
  Smartphone, 
  Monitor, 
  Clock, 
  MapPin, 
  Shield, 
  Zap,
  PlayCircle,
  StopCircle,
  Coffee,
  Navigation,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  Wifi,
  WifiOff,
  FileCheck
} from "lucide-react";
import { 
  WORK_CARD_EVENT_TYPES,
  HOTEL_WORK_PATTERNS,
  calculateWorkSession,
  syncToERGANI,
  generateDigitalWorkCardComplianceReport,
  type DigitalWorkCardEvent,
  type WorkSession
} from "@/lib/digitalWorkCard";

export default function DigitalWorkCardPage() {
  const [currentEmployee, setCurrentEmployee] = useState({
    id: "emp_001",
    afm: "123456789",
    name: "Μαρία Παπαδοπούλου",
    department: "front_desk",
    hourlyRate: 12.50,
    shiftPattern: "morning",
    contractType: "permanent"
  });

  const [currentLocation, setCurrentLocation] = useState({
    workplaceId: "hotel_main_lobby",
    coordinates: { lat: 37.9838, lng: 23.7275 },
    address: "Πλατεία Συντάγματος 1, Αθήνα",
    propertyName: "Grand Hotel Athens"
  });

  const [deviceInfo, setDeviceInfo] = useState({
    id: "kiosk_001",
    type: "kiosk" as const,
    ip: "192.168.1.100",
    userAgent: "DigitalWorkCard/1.0"
  });

  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [recentEvents, setRecentEvents] = useState<DigitalWorkCardEvent[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingEvents, setPendingEvents] = useState<DigitalWorkCardEvent[]>([]);

  // Event creation state
  const [eventData, setEventData] = useState({
    eventType: 'check_in' as keyof typeof WORK_CARD_EVENT_TYPES,
    notes: '',
    biometricVerified: false,
    photoVerified: false
  });

  // User role state
  const [userRole, setUserRole] = useState<'employee' | 'supervisor' | 'hr' | 'compliance'>('employee');
  
  // Supervisor dashboard state
  const [currentlyWorking, setCurrentlyWorking] = useState([
    { id: 'emp_001', name: 'Μαρία Παπαδοπούλου', department: 'Ρεσεψιόν', checkedInAt: '08:00', status: 'working' },
    { id: 'emp_002', name: 'Νίκος Γεωργίου', department: 'Καθαριότητα', checkedInAt: '09:15', status: 'on_break' },
    { id: 'emp_003', name: 'Ελένη Κώστα', department: 'Εστιατόριο', checkedInAt: '07:30', status: 'working' },
  ]);

  // Exception requests
  const [pendingExceptions, setPendingExceptions] = useState([
    { id: 'exc_001', employeeId: 'emp_002', type: 'overtime_approval', description: 'Αίτημα για 2 ώρες υπερωρίες', requestedAt: '2025-01-19T16:00:00' },
    { id: 'exc_002', employeeId: 'emp_003', type: 'manual_entry', description: 'Ξέχασα να κάνω check-out χθες', requestedAt: '2025-01-19T08:30:00' },
  ]);

  // Forgotten clock reminders
  const [forgottenClockAlerts, setForgottenClockAlerts] = useState([
    { employeeId: 'emp_001', lastSeen: '2025-01-19T12:00:00', alert: 'Δεν έχετε κάνει check-out για διάλειμμα εδώ και 4 ώρες' }
  ]);

  // HR Export data
  const [exportData, setExportData] = useState({
    period: { start: '2025-01-13', end: '2025-01-19' },
    properties: ['main_hotel', 'spa_center', 'conference_center'],
    format: 'excel' as 'excel' | 'csv' | 'pdf',
    includeBreaks: true,
    includeViolations: true
  });

  // Time tracking simulation
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const createWorkCardEvent = async () => {
    const event: DigitalWorkCardEvent = {
      id: `event_${Date.now()}`,
      employeeId: currentEmployee.id,
      employeeAFM: currentEmployee.afm,
      eventType: eventData.eventType,
      timestamp: new Date().toISOString(),
      location: currentLocation,
      device: deviceInfo,
      metadata: {
        shiftId: `shift_${currentEmployee.id}_${new Date().toISOString().split('T')[0]}`,
        departmentCode: currentEmployee.department,
        notes: eventData.notes || undefined,
        biometricVerified: eventData.biometricVerified,
        photoVerified: eventData.photoVerified
      },
      erganiStatus: {
        synced: false,
        retryCount: 0
      },
      payrollImpact: {}
    };

    // Add to recent events
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]);

    // Try to sync with ERGANI
    if (isOnline) {
      const syncResult = await syncToERGANI(event);
      event.erganiStatus = {
        synced: syncResult.success,
        syncedAt: syncResult.success ? new Date().toISOString() : undefined,
        erganiId: syncResult.erganiId,
        errorMessage: syncResult.errorMessage,
        retryCount: syncResult.success ? 0 : 1
      };
    } else {
      // Add to pending queue for offline sync
      setPendingEvents(prev => [...prev, event]);
    }

    // Update active session if applicable
    if (eventData.eventType === 'check_in') {
      // Start new session
      const newSession = calculateWorkSession([event], currentEmployee);
      setActiveSession(newSession);
    } else if (eventData.eventType === 'check_out' && activeSession) {
      // Complete session
      const allEvents = [...recentEvents.filter(e => e.employeeId === currentEmployee.id), event];
      const completedSession = calculateWorkSession(allEvents, currentEmployee);
      setActiveSession(completedSession);
    }

    // Reset form
    setEventData({
      eventType: 'check_in',
      notes: '',
      biometricVerified: false,
      photoVerified: false
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'check_in': return 'bg-green-100 text-green-800 border-green-200';
      case 'check_out': return 'bg-red-100 text-red-800 border-red-200';
      case 'break_start': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'break_end': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'location_change': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}ω ${mins}λ`;
  };

  // Simulate offline/online status
  const toggleConnection = () => {
    setIsOnline(!isOnline);
    if (!isOnline && pendingEvents.length > 0) {
      // Sync pending events when coming back online
      pendingEvents.forEach(event => syncToERGANI(event));
      setPendingEvents([]);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Smartphone className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Ψηφιακή Κάρτα Εργασίας</h1>
            <p className="text-gray-600">Καταγραφή χρόνου εργασίας και συγχρονισμός ERGANI II</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant={isOnline ? "outline" : "destructive"}
            size="sm"
            onClick={toggleConnection}
            className="flex items-center gap-2"
          >
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </Button>
          
          <div className="text-right">
            <div className="text-2xl font-mono">{currentTime.toLocaleTimeString('el-GR')}</div>
            <div className="text-sm text-gray-600">{currentTime.toLocaleDateString('el-GR')}</div>
          </div>
        </div>
      </div>

      {/* Role Selector */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant={userRole === 'employee' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUserRole('employee')}
        >
          Εργαζόμενος
        </Button>
        <Button 
          variant={userRole === 'supervisor' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUserRole('supervisor')}
        >
          Επόπτης
        </Button>
        <Button 
          variant={userRole === 'hr' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUserRole('hr')}
        >
          HR/Μισθοδοσία
        </Button>
        <Button 
          variant={userRole === 'compliance' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUserRole('compliance')}
        >
          Συμμόρφωση
        </Button>
      </div>

      <Tabs defaultValue={userRole === 'employee' ? 'quick-clock' : userRole === 'supervisor' ? 'supervisor-dashboard' : userRole === 'hr' ? 'hr-export' : 'audit-trail'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="quick-clock">Γρήγορο Clock</TabsTrigger>
          <TabsTrigger value="supervisor-dashboard">Επόπτης</TabsTrigger>
          <TabsTrigger value="hr-export">HR Export</TabsTrigger>
          <TabsTrigger value="audit-trail">Audit Trail</TabsTrigger>
          <TabsTrigger value="active-session">Ενεργή Βάρδια</TabsTrigger>
          <TabsTrigger value="settings">Ρυθμίσεις</TabsTrigger>
        </TabsList>

        {/* Quick Clock Interface - Employee Story */}
        <TabsContent value="quick-clock">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* One-Tap Clock Interface */}
            <div className="lg:col-span-2 space-y-6">
              {/* Forgotten Clock Alert */}
              {forgottenClockAlerts.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-5 w-5" />
                      Υπενθύμιση Clock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {forgottenClockAlerts.map((alert, index) => (
                      <div key={index} className="p-3 bg-yellow-100 border border-yellow-200 rounded">
                        <div className="text-yellow-800">{alert.alert}</div>
                        <div className="text-sm text-yellow-600 mt-1">
                          Τελευταία φορά: {formatTime(alert.lastSeen)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Γρήγορη Καταγραφή - Ένα Tap
                  </CardTitle>
                  <CardDescription>
                    QR/NFC scan ή κουμπί για άμεση καταγραφή
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* QR/NFC Simulation */}
                  <div className="text-center p-6 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                    <div className="text-6xl mb-4">📱</div>
                    <div className="text-lg font-medium text-blue-800 mb-2">Σκάντε QR/NFC</div>
                    <div className="text-sm text-blue-600">Φέρτε κοντά το τηλέφωνο ή την κάρτα σας</div>
                  </div>

                  {/* One-Tap Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      className="h-16 text-lg bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setEventData({...eventData, eventType: 'check_in'});
                        createWorkCardEvent();
                      }}
                    >
                      <PlayCircle className="mr-2 h-6 w-6" />
                      ΕΙΣΟΔΟΣ
                    </Button>
                    <Button 
                      className="h-16 text-lg bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        setEventData({...eventData, eventType: 'check_out'});
                        createWorkCardEvent();
                      }}
                    >
                      <StopCircle className="mr-2 h-6 w-6" />
                      ΕΞΟΔΟΣ
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline"
                      className="h-12"
                      onClick={() => {
                        setEventData({...eventData, eventType: 'break_start'});
                        createWorkCardEvent();
                      }}
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Διάλειμμα
                    </Button>
                    <Button 
                      variant="outline"
                      className="h-12"
                      onClick={() => {
                        setEventData({...eventData, eventType: 'location_change'});
                        createWorkCardEvent();
                      }}
                    >
                      <Navigation className="mr-2 h-4 w-4" />
                      Αλλαγή Τοποθεσίας
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="notes">Σημειώσεις (Προαιρετικό)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Προσθέστε σημειώσεις για το γεγονός..."
                      value={eventData.notes}
                      onChange={(e) => setEventData({...eventData, notes: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="biometricVerified"
                        checked={eventData.biometricVerified}
                        onCheckedChange={(checked) => setEventData({...eventData, biometricVerified: checked})}
                      />
                      <Label htmlFor="biometricVerified">Βιομετρική Επαλήθευση</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="photoVerified"
                        checked={eventData.photoVerified}
                        onCheckedChange={(checked) => setEventData({...eventData, photoVerified: checked})}
                      />
                      <Label htmlFor="photoVerified">Φωτογραφική Επαλήθευση</Label>
                    </div>
                  </div>

                  <Button 
                    onClick={createWorkCardEvent} 
                    className="w-full" 
                    size="lg"
                    disabled={!isOnline && pendingEvents.length > 10}
                  >
                    {eventData.eventType === 'check_in' && <PlayCircle className="mr-2 h-5 w-5" />}
                    {eventData.eventType === 'check_out' && <StopCircle className="mr-2 h-5 w-5" />}
                    {eventData.eventType === 'break_start' && <Coffee className="mr-2 h-5 w-5" />}
                    {eventData.eventType === 'location_change' && <Navigation className="mr-2 h-5 w-5" />}
                    Καταγραφή {WORK_CARD_EVENT_TYPES[eventData.eventType].name}
                  </Button>

                  {!isOnline && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <WifiOff className="h-4 w-4" />
                        <span className="text-sm">
                          Λειτουργία Offline - {pendingEvents.length} γεγονότα σε αναμονή συγχρονισμού
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Employee & Location Info */}
            <div className="space-y-6">
              {/* Employee Hours Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Οι Ώρες Μου Σήμερα
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-blue-600">7ω 30λ</div>
                      <div className="text-xs text-gray-600">Σύνολο Ωρών</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-green-600">30λ</div>
                      <div className="text-xs text-gray-600">Διαλείμματα</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-orange-600">0ω</div>
                      <div className="text-xs text-gray-600">Υπερωρίες</div>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <div className="text-2xl font-bold text-purple-600">2ω</div>
                      <div className="text-xs text-gray-600">Νυχτερινές</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Είσοδος:</span>
                      <span className="font-mono">08:00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Προβλεπόμενη Έξοδος:</span>
                      <span className="font-mono">16:00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Υπολειπόμενο Διάλειμμα:</span>
                      <span className="text-green-600">15 λεπτά</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Προφίλ Εργαζομένου
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Όνομα</Label>
                    <div className="font-medium">{currentEmployee.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Τμήμα</Label>
                    <div>{HOTEL_WORK_PATTERNS[currentEmployee.department as keyof typeof HOTEL_WORK_PATTERNS]?.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Σημερινή Βάρδια</Label>
                    <div>08:00 - 16:00 (Πρωινή)</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Τοποθεσία Εργασίας
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Ξενοδοχείο</Label>
                    <div className="font-medium">{currentLocation.propertyName}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Διεύθυνση</Label>
                    <div className="text-sm">{currentLocation.address}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Workplace ID</Label>
                    <div className="font-mono text-sm">{currentLocation.workplaceId}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Συντεταγμένες</Label>
                    <div className="font-mono text-sm">
                      {currentLocation.coordinates.lat.toFixed(4)}, {currentLocation.coordinates.lng.toFixed(4)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Active Session */}
        <TabsContent value="active-session">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeSession ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Ενεργή Βάρδια
                    </CardTitle>
                    <CardDescription>
                      Βάρδια {activeSession.date} - {currentEmployee.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatDuration(activeSession.totalWorkedMinutes)}
                        </div>
                        <div className="text-sm text-gray-600">Σύνολο Ωρών</div>
                      </div>
                      <div className="text-center p-3 border rounded">
                        <div className="text-2xl font-bold text-green-600">
                          {formatDuration(activeSession.regularMinutes)}
                        </div>
                        <div className="text-sm text-gray-600">Κανονικές Ώρες</div>
                      </div>
                    </div>

                    {activeSession.overtimeMinutes > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 border rounded">
                          <div className="text-2xl font-bold text-orange-600">
                            {formatDuration(activeSession.overtimeMinutes)}
                          </div>
                          <div className="text-sm text-gray-600">Υπερωρίες</div>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <div className="text-2xl font-bold text-purple-600">
                            {formatDuration(activeSession.nightShiftMinutes)}
                          </div>
                          <div className="text-sm text-gray-600">Νυχτερινές</div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Είσοδος:</span>
                        <span className="font-mono">{formatTime(activeSession.checkIn.timestamp)}</span>
                      </div>
                      {activeSession.checkOut && (
                        <div className="flex justify-between text-sm">
                          <span>Έξοδος:</span>
                          <span className="font-mono">{formatTime(activeSession.checkOut.timestamp)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Διαλείμματα:</span>
                        <span>{activeSession.breaks.length} ({formatDuration(activeSession.breakMinutes)})</span>
                      </div>
                    </div>

                    {activeSession.violations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-red-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Παραβάσεις
                        </h4>
                        {activeSession.violations.map((violation, index) => (
                          <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                            <Badge variant="destructive" className="mb-1">
                              {violation.severity === 'high' ? 'Υψηλή' :
                               violation.severity === 'medium' ? 'Μεσαία' : 'Χαμηλή'}
                            </Badge>
                            <div>{violation.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Αμοιβή Βάρδιας
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Βασικές Ώρες:</span>
                        <span>€{activeSession.payrollCalculations.regularPay.toFixed(2)}</span>
                      </div>
                      {activeSession.payrollCalculations.overtimePay > 0 && (
                        <div className="flex justify-between">
                          <span>Υπερωρίες (+25%):</span>
                          <span>€{activeSession.payrollCalculations.overtimePay.toFixed(2)}</span>
                        </div>
                      )}
                      {activeSession.payrollCalculations.nightShiftPremium > 0 && (
                        <div className="flex justify-between">
                          <span>Νυχτερινό Επίδομα (+25%):</span>
                          <span>€{activeSession.payrollCalculations.nightShiftPremium.toFixed(2)}</span>
                        </div>
                      )}
                      {activeSession.payrollCalculations.breakPay > 0 && (
                        <div className="flex justify-between">
                          <span>Αμειβόμενα Διαλείμματα:</span>
                          <span>€{activeSession.payrollCalculations.breakPay.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Σύνολο:</span>
                        <span>€{activeSession.payrollCalculations.totalPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Καμία Ενεργή Βάρδια
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Δεν υπάρχει ενεργή βάρδια. Καταγράψτε είσοδο για έναρξη.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Supervisor Dashboard */}
        <TabsContent value="supervisor-dashboard">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Who's Working Now */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Ποιος Εργάζεται Τώρα
                  </CardTitle>
                  <CardDescription>
                    Πραγματικού χρόνου κατάσταση προσωπικού
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {currentlyWorking.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            employee.status === 'working' ? 'bg-green-500' : 
                            employee.status === 'on_break' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-gray-600">{employee.department}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">{employee.checkedInAt}</div>
                          <Badge variant={
                            employee.status === 'working' ? 'default' : 
                            employee.status === 'on_break' ? 'secondary' : 'destructive'
                          }>
                            {employee.status === 'working' ? 'Εργάζεται' : 
                             employee.status === 'on_break' ? 'Διάλειμμα' : 'Εκτός'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Exception Approvals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Εγκρίσεις Εξαιρέσεων
                  </CardTitle>
                  <CardDescription>
                    Αιτήματα που χρειάζονται έγκριση
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingExceptions.map((exception) => (
                      <div key={exception.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">
                              {currentlyWorking.find(e => e.id === exception.employeeId)?.name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {exception.description}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Αίτημα: {formatTime(exception.requestedAt)}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Έγκριση
                            </Button>
                            <Button size="sm" variant="outline">
                              Απόρριψη
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Supervisor Quick Stats */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Σημερινά Στατιστικά
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-blue-600">3/5</div>
                    <div className="text-sm text-gray-600">Ενεργοί Εργαζόμενοι</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-orange-600">2</div>
                    <div className="text-sm text-gray-600">Εκκρεμή Αιτήματα</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-green-600">15ω</div>
                    <div className="text-sm text-gray-600">Σύνολο Υπερωριών</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Γρήγορες Ενέργειες</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    Προγραμματισμός Βάρδιας
                  </Button>
                  <Button className="w-full" variant="outline">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Αναφορά Συμβάντος
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Κλήση Αντικαταστάτη
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* HR Export Dashboard */}
        <TabsContent value="hr-export">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Export Χρονοκαταγραφής για Μισθοδοσία
                </CardTitle>
                <CardDescription>
                  Καθαρά, επαληθευμένα δεδομένα που ρέουν απευθείας στη μισθοδοσία
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Από</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={exportData.period.start}
                      onChange={(e) => setExportData({
                        ...exportData, 
                        period: {...exportData.period, start: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Έως</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={exportData.period.end}
                      onChange={(e) => setExportData({
                        ...exportData, 
                        period: {...exportData.period, end: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="properties">Ιδιοκτησίες</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε ιδιοκτησίες" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλες οι Ιδιοκτησίες</SelectItem>
                      <SelectItem value="main_hotel">Κυρίως Ξενοδοχείο</SelectItem>
                      <SelectItem value="spa_center">Κέντρο SPA</SelectItem>
                      <SelectItem value="conference_center">Κέντρο Συνεδρίων</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="format">Μορφή Export</Label>
                  <Select 
                    value={exportData.format} 
                    onValueChange={(value) => setExportData({...exportData, format: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeBreaks"
                      checked={exportData.includeBreaks}
                      onCheckedChange={(checked) => setExportData({...exportData, includeBreaks: checked})}
                    />
                    <Label htmlFor="includeBreaks">Συμπερίληψη Διαλειμμάτων</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeViolations"
                      checked={exportData.includeViolations}
                      onCheckedChange={(checked) => setExportData({...exportData, includeViolations: checked})}
                    />
                    <Label htmlFor="includeViolations">Συμπερίληψη Παραβάσεων</Label>
                  </div>
                </div>

                <Button className="w-full" size="lg">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Δημιουργία & Export Χρονοκαταγραφής
                </Button>
              </CardContent>
            </Card>

            {/* Export Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Προεπισκόπηση Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <h4 className="font-medium text-green-800">Επαληθευμένα Δεδομένα</h4>
                    <div className="text-sm text-green-700 mt-1">
                      ✓ 24 εργαζόμενοι, 168 συνολικές ώρες<br/>
                      ✓ Όλα τα γεγονότα συγχρονισμένα με ERGANI II<br/>
                      ✓ Υπολογισμοί μισθοδοσίας επαληθευμένοι
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Περιεχόμενο Export:</h4>
                    <div className="text-sm space-y-1">
                      <div>• Κανονικές ώρες: 156ω</div>
                      <div>• Υπερωρίες: 12ω</div>
                      <div>• Νυχτερινές ώρες: 8ω</div>
                      <div>• Διαλείμματα: 24 σύνολο</div>
                      <div>• Παραβάσεις: 2 (μικρής σημασίας)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="text-sm text-blue-700">
                      <strong>Συνολικό Κόστος Μισθοδοσίας:</strong> €2,847.50<br/>
                      <span className="text-xs">Βασικές ώρες + Υπερωρίες + Επιδόματα</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Audit Trail */}
        <TabsContent value="audit-trail">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  ERGANI II Audit Trail
                </CardTitle>
                <CardDescription>
                  Πλήρη ιχνηλάτηση για αποδείξεις πραγματικού χρόνου
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Κατάσταση Συγχρονισμού</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-2xl font-bold text-green-600">99.2%</div>
                      <div className="text-green-700">Επιτυχής Συγχρονισμός</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">2,847</div>
                      <div className="text-blue-700">Συνολικά Γεγονότα</div>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Τελευταίος Συγχρονισμός:</span>
                      <span className="font-mono">2025-01-19 16:24:15</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ERGANI II API Status:</span>
                      <Badge className="bg-green-100 text-green-800">Operational</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Αποτυχημένα Γεγονότα:</span>
                      <span className="text-red-600">3 (0.8%)</span>
                    </div>
                  </div>
                </div>

                {/* Recent Audit Events */}
                <div className="space-y-3">
                  <h4 className="font-medium">Πρόσφατα Audit Events</h4>
                  {[
                    { time: '16:24:15', event: 'ERGANI Sync', employee: 'Μαρία Π.', status: 'success', erganiId: 'ERG_2847' },
                    { time: '16:20:08', event: 'Check Out', employee: 'Νίκος Γ.', status: 'success', erganiId: 'ERG_2846' },
                    { time: '16:15:33', event: 'Break End', employee: 'Ελένη Κ.', status: 'success', erganiId: 'ERG_2845' },
                    { time: '16:10:12', event: 'Location Change', employee: 'Μαρία Π.', status: 'retry', erganiId: 'ERG_2844' },
                    { time: '16:05:47', event: 'Break Start', employee: 'Γιάννης Δ.', status: 'failed', erganiId: null },
                  ].map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' : 
                          log.status === 'retry' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-sm">{log.event} - {log.employee}</div>
                          <div className="text-xs text-gray-600">
                            {log.erganiId ? `ERGANI ID: ${log.erganiId}` : 'Εκκρεμής συγχρονισμός'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{log.time}</div>
                        <Badge variant={
                          log.status === 'success' ? 'default' : 
                          log.status === 'retry' ? 'secondary' : 'destructive'
                        }>
                          {log.status === 'success' ? 'Επιτυχία' : 
                           log.status === 'retry' ? 'Επανάληψη' : 'Αποτυχία'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Αναφορά Συμμόρφωσης
                </CardTitle>
                <CardDescription>
                  Πλήρης αναφορά audit για ελεγκτές
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-blue-600">100%</div>
                    <div className="text-sm text-gray-600">Εγγραφές Διατηρημένες</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-green-600">24ω</div>
                    <div className="text-sm text-gray-600">Audit Retention</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Compliance Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Παραβάσεις Εργατικού Δικαίου:</span>
                      <span className="text-red-600">2 (Μικρές)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Digital Work Card Adoption:</span>
                      <span className="text-green-600">100%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Real-time Reporting:</span>
                      <span className="text-green-600">99.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data Integrity Score:</span>
                      <span className="text-green-600">98.7%</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Export Audit Reports</h4>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline" size="sm">
                      <FileCheck className="mr-2 h-4 w-4" />
                      Daily Audit Report (PDF)
                    </Button>
                    <Button className="w-full" variant="outline" size="sm">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      ERGANI Sync Log (Excel)
                    </Button>
                    <Button className="w-full" variant="outline" size="sm">
                      <Shield className="mr-2 h-4 w-4" />
                      Compliance Summary (PDF)
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h5 className="font-medium text-blue-800 mb-1">Audit Trail Integrity</h5>
                  <div className="text-sm text-blue-700">
                    ✓ Κρυπτογραφημένη αποθήκευση<br/>
                    ✓ Tamper-proof timestamps<br/>
                    ✓ Immutable event logs<br/>
                    ✓ Digital signatures για κρίσιμα γεγονότα
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Event Log */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Λεπτομερές Event Log
              </CardTitle>
              <CardDescription>
                Αναλυτική καταγραφή όλων των γεγονότων για audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { 
                    timestamp: '2025-01-19T16:24:15.234Z', 
                    employee: 'Μαρία Παπαδοπούλου', 
                    afm: '123456789',
                    event: 'CHECK_OUT', 
                    location: 'Κυρίως Λόμπι', 
                    device: 'KIOSK_001', 
                    erganiId: 'ERG_2847',
                    verification: 'Biometric + Photo',
                    duration: '8ω 30λ',
                    violations: 'Καμία'
                  },
                  { 
                    timestamp: '2025-01-19T16:20:08.156Z', 
                    employee: 'Νίκος Γεωργίου', 
                    afm: '987654321',
                    event: 'CHECK_OUT', 
                    location: 'Καθαριότητα B\' Όροφος', 
                    device: 'MOBILE_APP', 
                    erganiId: 'ERG_2846',
                    verification: 'NFC Card',
                    duration: '7ω 45λ',
                    violations: 'Καμία'
                  },
                  { 
                    timestamp: '2025-01-19T16:15:33.789Z', 
                    employee: 'Ελένη Κώστα', 
                    afm: '456789123',
                    event: 'BREAK_END', 
                    location: 'Εστιατόριο', 
                    device: 'KIOSK_002', 
                    erganiId: 'ERG_2845',
                    verification: 'QR Code',
                    duration: '15λ διάλειμμα',
                    violations: 'Καμία'
                  },
                  { 
                    timestamp: '2025-01-19T16:10:12.456Z', 
                    employee: 'Μαρία Παπαδοπούλου', 
                    afm: '123456789',
                    event: 'LOCATION_CHANGE', 
                    location: 'Spa Center → Conference Center', 
                    device: 'MOBILE_APP', 
                    erganiId: 'ERG_2844',
                    verification: 'Biometric',
                    duration: 'N/A',
                    violations: 'Καμία'
                  }
                ].map((log, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium">{log.employee}</div>
                        <div className="text-gray-600">ΑΦΜ: {log.afm}</div>
                        <div className="text-gray-600">{new Date(log.timestamp).toLocaleString('el-GR')}</div>
                      </div>
                      <div>
                        <Badge className="mb-1">{log.event}</Badge>
                        <div className="text-gray-600">{log.location}</div>
                        <div className="text-gray-600">Device: {log.device}</div>
                      </div>
                      <div>
                        <div className="font-medium text-green-600">ERGANI: {log.erganiId}</div>
                        <div className="text-gray-600">Επαλήθευση: {log.verification}</div>
                        <div className="text-gray-600">Διάρκεια: {log.duration}</div>
                      </div>
                      <div>
                        <div className="font-medium">
                          Παραβάσεις: <span className="text-green-600">{log.violations}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Immutable Hash: abc123def456...
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Φόρτωση Περισσότερων Events
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Session Tab */}
        <TabsContent value="active-session">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Πρόσφατα Γεγονότα
              </CardTitle>
              <CardDescription>
                Τελευταία 10 γεγονότα ψηφιακής κάρτας εργασίας
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentEvents.length > 0 ? (
                  recentEvents.map((event, index) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <Badge className={getEventTypeColor(event.eventType)}>
                          {WORK_CARD_EVENT_TYPES[event.eventType].name}
                        </Badge>
                        <div>
                          <div className="font-medium">{currentEmployee.name}</div>
                          <div className="text-sm text-gray-600">
                            {event.location.propertyName} - {event.metadata.departmentCode}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{formatTime(event.timestamp)}</div>
                        <div className="flex items-center gap-1 text-xs">
                          {event.erganiStatus.synced ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                          )}
                          <span className={event.erganiStatus.synced ? 'text-green-600' : 'text-red-600'}>
                            ERGANI {event.erganiStatus.synced ? 'OK' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Δεν υπάρχουν πρόσφατα γεγονότα</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  ERGANI II Συμμόρφωση
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-green-600">95%</div>
                    <div className="text-sm text-gray-600">Επιτυχής Συγχρονισμός</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-blue-600">{recentEvents.length}</div>
                    <div className="text-sm text-gray-600">Γεγονότα Σήμερα</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Κατάσταση Σύνδεσης</h4>
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                      {isOnline ? 'Συνδεδεμένο στο ERGANI II' : 'Αποσυνδεδεμένο από ERGANI II'}
                    </span>
                  </div>
                </div>

                {pendingEvents.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-800">Γεγονότα σε Αναμονή</h4>
                    <p className="text-sm text-yellow-700">
                      {pendingEvents.length} γεγονότα θα συγχρονιστούν όταν επανέλθει η σύνδεση
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Αυτόματος Υπολογισμός Μισθοδοσίας
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-purple-600">98%</div>
                    <div className="text-sm text-gray-600">Ακρίβεια Υπολογισμών</div>
                  </div>
                  <div className="text-center p-3 border rounded">
                    <div className="text-2xl font-bold text-orange-600">0</div>
                    <div className="text-sm text-gray-600">Χειροκίνητες Διορθώσεις</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Αυτοματοποιημένες Λειτουργίες</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Υπολογισμός κανονικών ωρών</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Υπολογισμός υπερωριών (+25%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Νυχτερινό επίδομα (+25%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Αμειβόμενα διαλείμματα</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Εντοπισμός παραβάσεων</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Ρυθμίσεις Συσκευής
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deviceId">Device ID</Label>
                  <Input
                    id="deviceId"
                    value={deviceInfo.id}
                    onChange={(e) => setDeviceInfo({...deviceInfo, id: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="deviceType">Τύπος Συσκευής</Label>
                  <Select 
                    value={deviceInfo.type} 
                    onValueChange={(value) => setDeviceInfo({...deviceInfo, type: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Κινητό</SelectItem>
                      <SelectItem value="kiosk">Kiosk</SelectItem>
                      <SelectItem value="web">Web Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="deviceIp">IP Address</Label>
                  <Input
                    id="deviceIp"
                    value={deviceInfo.ip || ''}
                    onChange={(e) => setDeviceInfo({...deviceInfo, ip: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ρυθμίσεις Τοποθεσίας
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="workplaceId">Workplace ID</Label>
                  <Input
                    id="workplaceId"
                    value={currentLocation.workplaceId}
                    onChange={(e) => setCurrentLocation({...currentLocation, workplaceId: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="propertyName">Όνομα Ξενοδοχείου</Label>
                  <Input
                    id="propertyName"
                    value={currentLocation.propertyName || ''}
                    onChange={(e) => setCurrentLocation({...currentLocation, propertyName: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Διεύθυνση</Label>
                  <Input
                    id="address"
                    value={currentLocation.address}
                    onChange={(e) => setCurrentLocation({...currentLocation, address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lat">Γεωγραφικό Πλάτος</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.0001"
                      value={currentLocation.coordinates.lat}
                      onChange={(e) => setCurrentLocation({
                        ...currentLocation, 
                        coordinates: {...currentLocation.coordinates, lat: parseFloat(e.target.value)}
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lng">Γεωγραφικό Μήκος</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="0.0001"
                      value={currentLocation.coordinates.lng}
                      onChange={(e) => setCurrentLocation({
                        ...currentLocation, 
                        coordinates: {...currentLocation.coordinates, lng: parseFloat(e.target.value)}
                      })}
                    />
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