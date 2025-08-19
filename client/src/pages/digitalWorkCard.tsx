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
  WifiOff
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

      <Tabs defaultValue="time-tracking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="time-tracking">Καταγραφή</TabsTrigger>
          <TabsTrigger value="active-session">Ενεργή Βάρδια</TabsTrigger>
          <TabsTrigger value="recent-events">Πρόσφατα</TabsTrigger>
          <TabsTrigger value="compliance">Συμμόρφωση</TabsTrigger>
          <TabsTrigger value="settings">Ρυθμίσεις</TabsTrigger>
        </TabsList>

        {/* Time Tracking Interface */}
        <TabsContent value="time-tracking">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Clock-In Interface */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Καταγραφή Γεγονότος Εργασίας
                  </CardTitle>
                  <CardDescription>
                    Καταγράψτε είσοδο, έξοδο, διαλείμματα και αλλαγές τοποθεσίας
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventType">Τύπος Γεγονότος</Label>
                      <Select 
                        value={eventData.eventType} 
                        onValueChange={(value) => setEventData({...eventData, eventType: value as any})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WORK_CARD_EVENT_TYPES).map(([key, event]) => (
                            <SelectItem key={key} value={key}>
                              {event.name} - {event.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="department">Τμήμα</Label>
                      <Select 
                        value={currentEmployee.department} 
                        onValueChange={(value) => setCurrentEmployee({...currentEmployee, department: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(HOTEL_WORK_PATTERNS).map(([key, pattern]) => (
                            <SelectItem key={key} value={key}>
                              {pattern.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Στοιχεία Εργαζομένου
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Όνομα</Label>
                    <div className="font-medium">{currentEmployee.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">ΑΦΜ</Label>
                    <div className="font-mono">{currentEmployee.afm}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Τμήμα</Label>
                    <div>{HOTEL_WORK_PATTERNS[currentEmployee.department as keyof typeof HOTEL_WORK_PATTERNS]?.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Ωριαίος Μισθός</Label>
                    <div>€{currentEmployee.hourlyRate.toFixed(2)}</div>
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

        {/* Recent Events */}
        <TabsContent value="recent-events">
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