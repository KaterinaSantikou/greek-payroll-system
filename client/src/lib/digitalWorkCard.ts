/**
 * Digital Work Card System - Ψηφιακή Κάρτα Εργασίας
 * Greek ERGANI II Compliance and Real-time Time Tracking
 * Integrated with Payroll System for Automated Processing
 */

// Digital Work Card Event Types per ERGANI II Standards
export const WORK_CARD_EVENT_TYPES = {
  CHECK_IN: {
    code: 'check_in',
    name: 'Είσοδος',
    description: 'Έναρξη εργασίας',
    erganiCode: 'WI', // Work In
    mandatory: true,
    triggers: ['shift_start', 'overtime_start', 'break_end']
  },
  CHECK_OUT: {
    code: 'check_out',
    name: 'Έξοδος',
    description: 'Λήξη εργασίας',
    erganiCode: 'WO', // Work Out
    mandatory: true,
    triggers: ['shift_end', 'overtime_end', 'emergency_leave']
  },
  BREAK_START: {
    code: 'break_start',
    name: 'Έναρξη Διαλείμματος',
    description: 'Έναρξη διαλείμματος',
    erganiCode: 'BS', // Break Start
    mandatory: false,
    maxDuration: 60, // minutes
    paidBreak: true
  },
  BREAK_END: {
    code: 'break_end',
    name: 'Λήξη Διαλείμματος',
    description: 'Λήξη διαλείμματος',
    erganiCode: 'BE', // Break End
    mandatory: false,
    autoReturn: true
  },
  LOCATION_CHANGE: {
    code: 'location_change',
    name: 'Αλλαγή Τοποθεσίας',
    description: 'Μετακίνηση σε άλλη τοποθεσία εργασίας',
    erganiCode: 'LC', // Location Change
    mandatory: false,
    requiresApproval: true
  },
  EMERGENCY_EXIT: {
    code: 'emergency_exit',
    name: 'Έκτακτη Έξοδος',
    description: 'Έκτακτη διακοπή εργασίας',
    erganiCode: 'EE', // Emergency Exit
    mandatory: false,
    requiresJustification: true
  }
};

// Greek Hotel Industry Specific Work Patterns
export const HOTEL_WORK_PATTERNS = {
  FRONT_DESK: {
    code: 'front_desk',
    name: 'Ρεσεψιόν',
    shifts: [
      { name: 'Πρωινή', start: '06:00', end: '14:00', type: 'morning' },
      { name: 'Απογευματινή', start: '14:00', end: '22:00', type: 'afternoon' },
      { name: 'Νυχτερινή', start: '22:00', end: '06:00', type: 'night', premium: 25 }
    ],
    breakPolicy: { duration: 30, paid: true, flexible: false },
    overtimeRules: { threshold: 8, rate: 1.25, nightRate: 1.5 }
  },
  HOUSEKEEPING: {
    code: 'housekeeping',
    name: 'Καθαριότητα',
    shifts: [
      { name: 'Πρωινή', start: '08:00', end: '16:00', type: 'morning' },
      { name: 'Απογευματινή', start: '16:00', end: '00:00', type: 'afternoon' }
    ],
    breakPolicy: { duration: 45, paid: true, flexible: true },
    physicalWork: true,
    safetyRequirements: ['protective_equipment', 'chemical_training']
  },
  RESTAURANT: {
    code: 'restaurant',
    name: 'Εστιατόριο',
    shifts: [
      { name: 'Πρωινή (Πρωινό)', start: '06:00', end: '12:00', type: 'breakfast' },
      { name: 'Μεσημεριανή (Γεύμα)', start: '11:00', end: '17:00', type: 'lunch' },
      { name: 'Βραδινή (Δείπνο)', start: '17:00', end: '23:00', type: 'dinner' }
    ],
    breakPolicy: { duration: 30, paid: false, required: true },
    tipTracking: true,
    foodHandling: true
  },
  MAINTENANCE: {
    code: 'maintenance',
    name: 'Συντήρηση',
    shifts: [
      { name: 'Κανονικό Ωράριο', start: '08:00', end: '17:00', type: 'standard' },
      { name: 'Έκτακτο (24/7)', start: 'on_call', end: 'on_call', type: 'emergency' }
    ],
    breakPolicy: { duration: 60, paid: true, flexible: true },
    hazardousWork: true,
    emergencyCall: true,
    specialEquipment: true
  },
  SEASONAL_OUTDOOR: {
    code: 'seasonal_outdoor',
    name: 'Εποχιακό Εξωτερικό',
    shifts: [
      { name: 'Ημερήσια', start: '09:00', end: '18:00', type: 'day' },
      { name: 'Εκδηλώσεων', start: '18:00', end: '02:00', type: 'events' }
    ],
    seasonality: { start: 'april', end: 'october' },
    weatherDependent: true,
    outdoorWork: true
  }
};

// ERGANI II Integration Configuration
export const ERGANI_II_CONFIG = {
  apiEndpoint: import.meta.env.VITE_ERGANI_API_ENDPOINT || '/api/ergani',
  requiredFields: [
    'employee_afm',
    'employer_afm', 
    'workplace_id',
    'event_type',
    'timestamp',
    'location_coordinates',
    'device_id'
  ],
  realTimeSync: true,
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000,
    timeoutMs: 5000
  },
  validationRules: {
    maxEventsPerDay: 20,
    minTimeBetweenEvents: 60, // seconds
    maxShiftDuration: 12 * 60, // minutes
    requiredBreakAfter: 6 * 60 // minutes
  }
};

// Digital Work Card Event Interface
export interface DigitalWorkCardEvent {
  id: string;
  employeeId: string;
  employeeAFM: string;
  eventType: keyof typeof WORK_CARD_EVENT_TYPES;
  timestamp: string; // ISO format
  location: {
    workplaceId: string;
    coordinates?: { lat: number; lng: number };
    address: string;
    propertyName?: string; // For multi-property hotels
  };
  device: {
    id: string;
    type: 'mobile' | 'kiosk' | 'web';
    ip?: string;
    userAgent?: string;
  };
  metadata: {
    shiftId?: string;
    departmentCode?: string;
    supervisorId?: string;
    notes?: string;
    biometricVerified?: boolean;
    photoVerified?: boolean;
  };
  erganiStatus: {
    synced: boolean;
    syncedAt?: string;
    erganiId?: string;
    errorMessage?: string;
    retryCount: number;
  };
  payrollImpact: {
    regularHours?: number;
    overtimeHours?: number;
    nightShiftHours?: number;
    breakMinutes?: number;
    specialPremiums?: string[];
  };
}

// Work Session Calculation
export interface WorkSession {
  id: string;
  employeeId: string;
  date: string;
  checkIn: DigitalWorkCardEvent;
  checkOut?: DigitalWorkCardEvent;
  breaks: Array<{
    start: DigitalWorkCardEvent;
    end?: DigitalWorkCardEvent;
    duration?: number;
    paid: boolean;
  }>;
  locationChanges: DigitalWorkCardEvent[];
  totalWorkedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  nightShiftMinutes: number;
  breakMinutes: number;
  violations: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  payrollCalculations: {
    regularPay: number;
    overtimePay: number;
    nightShiftPremium: number;
    breakPay: number;
    totalPay: number;
  };
}

/**
 * Calculate work session from digital work card events
 */
export function calculateWorkSession(
  events: DigitalWorkCardEvent[],
  employeeData: {
    hourlyRate: number;
    department: string;
    shiftPattern: string;
    contractType: string;
  }
): WorkSession {
  const sortedEvents = events.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const checkIn = sortedEvents.find(e => e.eventType === 'check_in');
  const checkOut = sortedEvents.find(e => e.eventType === 'check_out');
  
  if (!checkIn) {
    throw new Error('Δεν βρέθηκε γεγονός εισόδου στην εργασία');
  }

  const session: WorkSession = {
    id: `session_${checkIn.employeeId}_${checkIn.timestamp.split('T')[0]}`,
    employeeId: checkIn.employeeId,
    date: checkIn.timestamp.split('T')[0],
    checkIn,
    checkOut,
    breaks: [],
    locationChanges: [],
    totalWorkedMinutes: 0,
    regularMinutes: 0,
    overtimeMinutes: 0,
    nightShiftMinutes: 0,
    breakMinutes: 0,
    violations: [],
    payrollCalculations: {
      regularPay: 0,
      overtimePay: 0,
      nightShiftPremium: 0,
      breakPay: 0,
      totalPay: 0
    }
  };

  // Process breaks
  let currentBreakStart: DigitalWorkCardEvent | null = null;
  for (const event of sortedEvents) {
    if (event.eventType === 'break_start') {
      currentBreakStart = event;
    } else if (event.eventType === 'break_end' && currentBreakStart) {
      const breakDuration = calculateMinutesBetween(currentBreakStart.timestamp, event.timestamp);
      session.breaks.push({
        start: currentBreakStart,
        end: event,
        duration: breakDuration,
        paid: WORK_CARD_EVENT_TYPES.BREAK_START.paidBreak
      });
      currentBreakStart = null;
    } else if (event.eventType === 'location_change') {
      session.locationChanges.push(event);
    }
  }

  // Calculate total worked time
  if (checkOut) {
    const totalMinutes = calculateMinutesBetween(checkIn.timestamp, checkOut.timestamp);
    const totalBreakMinutes = session.breaks.reduce((sum, br) => sum + (br.duration || 0), 0);
    session.totalWorkedMinutes = totalMinutes - totalBreakMinutes;
    session.breakMinutes = totalBreakMinutes;

    // Determine regular vs overtime hours
    const standardShiftMinutes = 8 * 60; // 8 hours standard
    if (session.totalWorkedMinutes <= standardShiftMinutes) {
      session.regularMinutes = session.totalWorkedMinutes;
    } else {
      session.regularMinutes = standardShiftMinutes;
      session.overtimeMinutes = session.totalWorkedMinutes - standardShiftMinutes;
    }

    // Calculate night shift hours (22:00 - 06:00)
    session.nightShiftMinutes = calculateNightShiftMinutes(checkIn.timestamp, checkOut.timestamp);
  }

  // Detect violations
  session.violations = detectViolations(session, employeeData);

  // Calculate payroll impact
  session.payrollCalculations = calculatePayrollImpact(session, employeeData);

  return session;
}

/**
 * Calculate minutes between two timestamps
 */
function calculateMinutesBetween(start: string, end: string): number {
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60));
}

/**
 * Calculate night shift minutes (22:00 - 06:00)
 */
function calculateNightShiftMinutes(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  let nightMinutes = 0;

  // Create night shift start/end times for the same day
  const nightStart = new Date(start);
  nightStart.setHours(22, 0, 0, 0);
  
  const nightEnd = new Date(start);
  nightEnd.setDate(nightEnd.getDate() + 1);
  nightEnd.setHours(6, 0, 0, 0);

  // Calculate overlap with night shift period
  const overlapStart = new Date(Math.max(start.getTime(), nightStart.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), nightEnd.getTime()));

  if (overlapStart < overlapEnd) {
    nightMinutes = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
  }

  return nightMinutes;
}

/**
 * Detect labor law violations
 */
function detectViolations(
  session: WorkSession, 
  employeeData: { contractType: string; shiftPattern: string }
): Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> {
  const violations = [];

  // Maximum daily working hours (10 hours + 2 overtime max)
  if (session.totalWorkedMinutes > 12 * 60) {
    violations.push({
      type: 'excessive_daily_hours',
      description: `Υπερβολικές ώρες εργασίας: ${Math.floor(session.totalWorkedMinutes / 60)} ώρες (μέγιστο: 12)`,
      severity: 'high' as const
    });
  }

  // Mandatory break after 6 hours
  if (session.totalWorkedMinutes > 6 * 60 && session.breaks.length === 0) {
    violations.push({
      type: 'missing_mandatory_break',
      description: 'Απαιτείται διάλειμμα μετά από 6 ώρες συνεχούς εργασίας',
      severity: 'medium' as const
    });
  }

  // Excessive overtime (more than 3 hours)
  if (session.overtimeMinutes > 3 * 60) {
    violations.push({
      type: 'excessive_overtime',
      description: `Υπερβολικές υπερωρίες: ${Math.floor(session.overtimeMinutes / 60)} ώρες (μέγιστο: 3)`,
      severity: 'high' as const
    });
  }

  // Night shift violations (more than 8 hours in night period)
  if (session.nightShiftMinutes > 8 * 60) {
    violations.push({
      type: 'excessive_night_work',
      description: `Υπερβολικές νυχτερινές ώρες: ${Math.floor(session.nightShiftMinutes / 60)} ώρες`,
      severity: 'medium' as const
    });
  }

  return violations;
}

/**
 * Calculate payroll impact from work session
 */
function calculatePayrollImpact(
  session: WorkSession,
  employeeData: { hourlyRate: number; department: string }
): {
  regularPay: number;
  overtimePay: number;
  nightShiftPremium: number;
  breakPay: number;
  totalPay: number;
} {
  const { hourlyRate } = employeeData;
  
  // Regular pay calculation
  const regularPay = (session.regularMinutes / 60) * hourlyRate;
  
  // Overtime pay (25% premium)
  const overtimePay = (session.overtimeMinutes / 60) * hourlyRate * 1.25;
  
  // Night shift premium (25% for hours between 22:00-06:00)
  const nightShiftPremium = (session.nightShiftMinutes / 60) * hourlyRate * 0.25;
  
  // Paid break calculation
  const paidBreakMinutes = session.breaks
    .filter(br => br.paid)
    .reduce((sum, br) => sum + (br.duration || 0), 0);
  const breakPay = (paidBreakMinutes / 60) * hourlyRate;
  
  const totalPay = regularPay + overtimePay + nightShiftPremium + breakPay;

  return {
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    nightShiftPremium: Math.round(nightShiftPremium * 100) / 100,
    breakPay: Math.round(breakPay * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100
  };
}

/**
 * Sync event to ERGANI II system
 */
export async function syncToERGANI(event: DigitalWorkCardEvent): Promise<{
  success: boolean;
  erganiId?: string;
  errorMessage?: string;
}> {
  try {
    // Validate required fields
    const missingFields = ERGANI_II_CONFIG.requiredFields.filter(field => {
      if (field === 'employee_afm') return !event.employeeAFM;
      if (field === 'event_type') return !event.eventType;
      if (field === 'timestamp') return !event.timestamp;
      if (field === 'location_coordinates') return !event.location.coordinates;
      if (field === 'device_id') return !event.device.id;
      return false;
    });

    if (missingFields.length > 0) {
      throw new Error(`Λείπουν απαιτούμενα πεδία: ${missingFields.join(', ')}`);
    }

    // Prepare ERGANI payload
    const erganiPayload = {
      employee_afm: event.employeeAFM,
      employer_afm: import.meta.env.VITE_COMPANY_AFM || 'COMPANY_AFM_REQUIRED',
      workplace_id: event.location.workplaceId,
      event_type: WORK_CARD_EVENT_TYPES[event.eventType].erganiCode,
      timestamp: event.timestamp,
      location: {
        lat: event.location.coordinates?.lat,
        lng: event.location.coordinates?.lng,
        address: event.location.address
      },
      device_id: event.device.id,
      metadata: {
        department: event.metadata.departmentCode,
        biometric_verified: event.metadata.biometricVerified || false
      }
    };

    // Simulate ERGANI API call (replace with actual implementation)
    const response = await fetch(ERGANI_II_CONFIG.apiEndpoint + '/work-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_ERGANI_API_TOKEN || ''}`,
      },
      body: JSON.stringify(erganiPayload),
      signal: AbortSignal.timeout(ERGANI_II_CONFIG.retryPolicy.timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`ERGANI API σφάλμα: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      erganiId: result.id || `ergani_${Date.now()}`
    };

  } catch (error) {
    console.error('ERGANI sync error:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Άγνωστο σφάλμα συγχρονισμού ERGANI'
    };
  }
}

/**
 * Generate compliance report for digital work card usage
 */
export function generateDigitalWorkCardComplianceReport(
  sessions: WorkSession[],
  period: { start: string; end: string }
): {
  totalSessions: number;
  compliantSessions: number;
  violationSummary: { [key: string]: number };
  erganiSyncRate: number;
  payrollAccuracy: number;
  recommendations: string[];
} {
  const totalSessions = sessions.length;
  const compliantSessions = sessions.filter(s => s.violations.length === 0).length;
  
  // Count violations by type
  const violationSummary: { [key: string]: number } = {};
  sessions.forEach(session => {
    session.violations.forEach(violation => {
      violationSummary[violation.type] = (violationSummary[violation.type] || 0) + 1;
    });
  });

  // Calculate ERGANI sync rate (would be based on actual sync status)
  const erganiSyncRate = 95; // Simulated - would be calculated from actual sync data

  // Calculate payroll accuracy (would be based on payroll integration)
  const payrollAccuracy = 98; // Simulated - would be calculated from payroll matching

  // Generate recommendations
  const recommendations = [];
  if (compliantSessions / totalSessions < 0.9) {
    recommendations.push('Βελτίωση εκπαίδευσης προσωπικού για σωστή χρήση ψηφιακής κάρτας');
  }
  if (violationSummary.excessive_daily_hours > 0) {
    recommendations.push('Αναθεώρηση προγραμματισμού βαρδιών για αποφυγή υπερβολικών ωρών');
  }
  if (violationSummary.missing_mandatory_break > 0) {
    recommendations.push('Υπενθύμιση υποχρεωτικών διαλειμμάτων σε εργαζομένους');
  }
  if (erganiSyncRate < 95) {
    recommendations.push('Βελτίωση σύνδεσης ERGANI II για πραγματικό χρόνο συγχρονισμό');
  }

  return {
    totalSessions,
    compliantSessions,
    violationSummary,
    erganiSyncRate,
    payrollAccuracy,
    recommendations
  };
}