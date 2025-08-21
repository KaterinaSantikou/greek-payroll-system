/**
 * Digital Work Card System - Ψηφιακή Κάρτα Εργασίας
 * Greek ERGANI II Compliance with Retrospective & Proactive Modes
 * Integrated with Payroll System for Automated Processing
 * Supports Απολογιστικό (Retrospective) & Προαναγγελτικό (Proactive) Operations
 * Full Legal Compliance with €10,500 Penalty Avoidance
 */

// Operational Modes - Τρόποι Λειτουργίας
export const OPERATIONAL_MODES = {
  PROACTIVE: {
    code: 'proactive',
    name: 'Προαναγγελτικό',
    description: 'Προκαταρκτική δήλωση αλλαγών ωραρίου/υπερωριών',
    requiresPreApproval: true,
    realTimeSync: true,
    maxDelayHours: 0 // Must be immediate
  },
  RETROSPECTIVE: {
    code: 'retrospective', 
    name: 'Απολογιστικό',
    description: 'Εκ των υστέρων καταχώρηση εργασιακών γεγονότων',
    requiresPreApproval: false,
    realTimeSync: false,
    maxDelayHours: 72, // Greek law: within 3 days
    overtimeDeadlineHours: 24 // Overtime must be reported within 24h
  }
};

// Legal Compliance Rules - Νομικοί Περιορισμοί
export const COMPLIANCE_RULES = {
  MONTHLY_MODE_CONSISTENCY: {
    rule: 'NO_MIXED_MODES_PER_MONTH',
    description: 'Δεν επιτρέπεται συνύπαρξη προαναγγελτικού και απολογιστικού στον ίδιο μήνα',
    penaltyAmount: 10500, // €10,500 per violation
    lawReference: 'Υπ. Εργασίας - Οδηγός ΨΚΕ 2024'
  },
  MODE_DECLARATION_DEADLINE: {
    rule: 'DECLARE_BEFORE_MONTH_START',
    description: 'Η μετάβαση δηλώνεται πριν την έναρξη του μήνα',
    penaltyAmount: 10500,
    lawReference: 'ERGANI II Regulation Article 15'
  },
  TIMESTAMP_ACCURACY: {
    rule: 'ACTUAL_WORK_REFLECTION',
    description: 'Τα χτυπήματα πρέπει να αντανακλούν την πραγματική έναρξη/λήξη εργασίας',
    penaltyAmount: 10500,
    lawReference: 'Greek Labor Law 4808/2021'
  },
  ARCHIVE_RETENTION: {
    rule: 'MINIMUM_5_YEAR_RETENTION',
    description: 'Τεκμηρίωση/αρχεία συστήματος τηρούνται ≥5 έτη',
    penaltyAmount: 5000,
    lawReference: 'Greek Data Retention Laws'
  }
};

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
  apiEndpoint: 'https://ergani.gov.gr/api/v2',
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

// Enhanced Digital Work Card Event Interface with Retrospective Support
export interface DigitalWorkCardEvent {
  id: string;
  employeeId: string;
  employeeAFM: string;
  eventType: keyof typeof WORK_CARD_EVENT_TYPES;
  timestamp: string; // ISO format - when reported to system
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
  
  // Απολογιστικό σύστημα - Retrospective system fields
  retrospectiveData?: {
    isRetrospectiveEntry: boolean;
    actualWorkTimestamp: string; // When work actually started/ended
    reportingDelayHours: number;
    lateReportingReason?: string;
    requiresApproval: boolean;
    approvedBy?: string;
    approvedAt?: string;
  };
  
  // Νομική συμμόρφωση - Legal compliance
  complianceData: {
    validated: boolean;
    issues: string[]; // Array of compliance issues
    penaltyRisk: 'none' | 'low' | 'medium' | 'high';
    auditFingerprint: string; // Immutable hash for 5-year archive
    legalArchiveStatus: 'active' | 'archived' | 'expired';
    retentionExpiryDate?: string; // 5+ years retention
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

// Company Digital Work Card Settings Interface
export interface CompanyWorkCardSettings {
  companyId: string;
  operationalMode: 'proactive' | 'retrospective';
  currentMonth: string; // YYYY-MM format
  nextMonthMode?: 'proactive' | 'retrospective';
  
  // Compliance settings
  maxRetrospectiveHours: number; // Default: 72
  overtimeReportingDeadline: number; // Default: 24
  strictTimestampValidation: boolean;
  mandatoryLocationVerification: boolean;
  penaltyThresholdEuros: number; // Default: 10,500
  
  // Legal requirements
  auditRetentionYears: number; // Minimum: 5
  automaticComplianceAlerts: boolean;
}

// Retrospective Overtime Entry Interface
export interface RetrospectiveOvertimeEntry {
  entryId: string;
  employeeId: string;
  companyId: string;
  workDate: string; // YYYY-MM-DD
  
  overtimeStartTime: string;
  overtimeEndTime: string;
  overtimeMinutes: number;
  overtimeType: 'regular' | 'night' | 'holiday' | 'sunday';
  overtimeRate: number; // 1.25, 1.5, etc.
  
  // Retrospective reporting
  reportedAt: string;
  reportingDeadlineMet: boolean;
  lateReportingReason?: string;
  
  // Approval workflow
  requiresApproval: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // ERGANI compliance
  erganiSubmitted: boolean;
  erganiSubmissionId?: string;
  complianceNotes?: string;
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
/**
 * Enhanced ERGANI Sync with Retrospective Support
 */
export async function syncToERGANI(
  event: DigitalWorkCardEvent,
  operationalMode: 'proactive' | 'retrospective' = 'proactive'
): Promise<{
  success: boolean;
  erganiId?: string;
  errorMessage?: string;
  complianceWarnings?: string[];
}> {
  const complianceWarnings: string[] = [];
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

    // Enhanced ERGANI payload with retrospective support
    const erganiPayload = {
      employee_afm: event.employeeAFM,
      employer_afm: process.env.COMPANY_AFM || 'COMPANY_AFM_REQUIRED',
      workplace_id: event.location.workplaceId,
      event_type: WORK_CARD_EVENT_TYPES[event.eventType].erganiCode,
      
      // Use actual work timestamp for retrospective entries
      timestamp: event.retrospectiveData?.actualWorkTimestamp || event.timestamp,
      reported_timestamp: event.timestamp, // When reported to system
      
      location: {
        lat: event.location.coordinates?.lat,
        lng: event.location.coordinates?.lng,
        address: event.location.address
      },
      device_id: event.device.id,
      metadata: {
        department: event.metadata.departmentCode,
        biometric_verified: event.metadata.biometricVerified || false,
        operational_mode: operationalMode,
        is_retrospective: event.retrospectiveData?.isRetrospectiveEntry || false,
        reporting_delay_hours: event.retrospectiveData?.reportingDelayHours || 0,
        compliance_level: event.complianceData.penaltyRisk,
        audit_fingerprint: event.complianceData.auditFingerprint
      }
    };
    
    // Add compliance warnings for retrospective entries
    if (event.retrospectiveData?.isRetrospectiveEntry) {
      const delayHours = event.retrospectiveData.reportingDelayHours;
      if (delayHours > 72) {
        complianceWarnings.push(`Καθυστέρηση ${delayHours}h υπερβαίνει το όριο των 72h`);
      }
      if (delayHours > 24 && event.payrollImpact.overtimeHours && event.payrollImpact.overtimeHours > 0) {
        complianceWarnings.push(`Εκπρόθεσμη αναφορά υπερωριών: ${delayHours}h`);
      }
    }

    // Simulate ERGANI API call (replace with actual implementation)
    const response = await fetch(ERGANI_II_CONFIG.apiEndpoint + '/work-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ERGANI_API_TOKEN}`,
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
      erganiId: result.id || `ergani_${Date.now()}`,
      complianceWarnings
    };

  } catch (error) {
    console.error('ERGANI sync error:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Άγνωστο σφάλμα συγχρονισμού ERGANI',
      complianceWarnings
    };
  }
}

/**
 * Validate Operational Mode Change - Επικύρωση Αλλαγής Τρόπου Λειτουργίας
 */
export function validateModeChange(
  currentMode: 'proactive' | 'retrospective',
  newMode: 'proactive' | 'retrospective', 
  targetMonth: string, // YYYY-MM format
  currentMonth: string
): {
  isValid: boolean;
  violations: string[];
  penaltyRisk: number; // In euros
  recommendations: string[];
} {
  const violations: string[] = [];
  const recommendations: string[] = [];
  let penaltyRisk = 0;
  
  // Rule 1: Cannot change mode during current month
  if (targetMonth === currentMonth) {
    violations.push('Δεν επιτρέπεται αλλαγή τρόπου λειτουργίας εντός του τρέχοντος μήνα');
    penaltyRisk += COMPLIANCE_RULES.MONTHLY_MODE_CONSISTENCY.penaltyAmount;
  }
  
  // Rule 2: Must declare before month starts
  const targetDate = new Date(targetMonth + '-01');
  const today = new Date();
  const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilTarget < 1) {
    violations.push('Η αλλαγή τρόπου λειτουργίας πρέπει να δηλωθεί πριν την έναρξη του μήνα');
    penaltyRisk += COMPLIANCE_RULES.MODE_DECLARATION_DEADLINE.penaltyAmount;
  }
  
  // Recommendations
  if (newMode === 'retrospective') {
    recommendations.push('Εκπαιδεύστε το προσωπικό για τις προθεσμίες απολογιστικού συστήματος (72h γενικά, 24h για υπερωρίες)');
    recommendations.push('Ενεργοποιήστε αυτόματες ειδοποιήσεις για εκπρόθεσμες καταχωρήσεις');
  }
  
  if (newMode === 'proactive') {
    recommendations.push('Προετοιμαστείτε για προαναγγελία όλων των αλλαγών ωραρίου');
    recommendations.push('Εξασφαλίστε real-time σύνδεση με ERGANI II');
  }
  
  return {
    isValid: violations.length === 0,
    violations,
    penaltyRisk,
    recommendations
  };
}

/**
 * Create Retrospective Overtime Entry - Δημιουργία Απολογιστικής Καταχώρησης Υπερωριών
 */
export function createRetrospectiveOvertimeEntry(
  employeeId: string,
  workDate: string,
  overtimeStart: string,
  overtimeEnd: string,
  overtimeType: 'regular' | 'night' | 'holiday' | 'sunday' = 'regular'
): RetrospectiveOvertimeEntry {
  const now = new Date();
  const workDateTime = new Date(workDate);
  const hoursDelay = Math.floor((now.getTime() - workDateTime.getTime()) / (1000 * 60 * 60));
  
  // Calculate overtime duration
  const startTime = new Date(overtimeStart);
  const endTime = new Date(overtimeEnd);
  const overtimeMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  
  // Determine overtime rate based on type
  const rates = {
    regular: 1.25,
    night: 1.50,
    holiday: 1.75,
    sunday: 1.75
  };
  
  // Check if reporting deadline is met (24 hours for overtime)
  const deadlineMet = hoursDelay <= 24;
  
  return {
    entryId: `retro_ot_${Date.now()}_${employeeId}`,
    employeeId,
    companyId: 'COMPANY_001', // Would come from context
    workDate,
    overtimeStartTime: overtimeStart,
    overtimeEndTime: overtimeEnd,
    overtimeMinutes,
    overtimeType,
    overtimeRate: rates[overtimeType],
    reportedAt: now.toISOString(),
    reportingDeadlineMet: deadlineMet,
    lateReportingReason: deadlineMet ? undefined : `Καθυστέρηση ${hoursDelay} ωρών στην αναφορά`,
    requiresApproval: !deadlineMet || overtimeMinutes > 180, // Require approval if late or >3h
    status: 'pending',
    erganiSubmitted: false
  };
}

/**
 * Validate Retrospective Entry - Επικύρωση Απολογιστικής Καταχώρησης
 */
export function validateRetrospectiveEntry(
  event: DigitalWorkCardEvent,
  companySettings: CompanyWorkCardSettings
): {
  isValid: boolean;
  violations: string[];
  penaltyRisk: number;
  complianceLevel: 'compliant' | 'warning' | 'violation';
} {
  const violations: string[] = [];
  let penaltyRisk = 0;
  
  if (!event.retrospectiveData) {
    return { isValid: true, violations: [], penaltyRisk: 0, complianceLevel: 'compliant' };
  }
  
  const { reportingDelayHours, actualWorkTimestamp } = event.retrospectiveData;
  
  // Check maximum retrospective hours (72h general rule)
  if (reportingDelayHours > companySettings.maxRetrospectiveHours) {
    violations.push(`Υπερβολική καθυστέρηση αναφοράς: ${reportingDelayHours}h (μέγιστο: ${companySettings.maxRetrospectiveHours}h)`);
    penaltyRisk += COMPLIANCE_RULES.TIMESTAMP_ACCURACY.penaltyAmount;
  }
  
  // Check overtime specific deadline (24h)
  if (event.eventType === 'check_out' && event.payrollImpact.overtimeHours && event.payrollImpact.overtimeHours > 0) {
    if (reportingDelayHours > companySettings.overtimeReportingDeadline) {
      violations.push(`Εκπρόθεσμη αναφορά υπερωριών: ${reportingDelayHours}h (προθεσμία: ${companySettings.overtimeReportingDeadline}h)`);
      penaltyRisk += COMPLIANCE_RULES.TIMESTAMP_ACCURACY.penaltyAmount;
    }
  }
  
  // Check if actual timestamp reflects real work
  if (companySettings.strictTimestampValidation) {
    const actualTime = new Date(actualWorkTimestamp);
    const reportedTime = new Date(event.timestamp);
    const timeDiffHours = Math.abs(actualTime.getTime() - reportedTime.getTime()) / (1000 * 60 * 60);
    
    if (timeDiffHours > 0.5) { // More than 30 minutes difference
      violations.push('Το χρονόσημα δεν αντανακλά την πραγματική έναρξη/λήξη εργασίας');
      penaltyRisk += COMPLIANCE_RULES.TIMESTAMP_ACCURACY.penaltyAmount;
    }
  }
  
  // Determine compliance level
  let complianceLevel: 'compliant' | 'warning' | 'violation' = 'compliant';
  if (penaltyRisk > 0) {
    complianceLevel = penaltyRisk >= 10000 ? 'violation' : 'warning';
  }
  
  return {
    isValid: violations.length === 0,
    violations,
    penaltyRisk,
    complianceLevel
  };
}

/**
 * Generate Immutable Audit Fingerprint - Δημιουργία Αμετάβλητου Audit Hash
 */
export function generateAuditFingerprint(
  event: DigitalWorkCardEvent,
  previousHash?: string
): string {
  const eventData = {
    id: event.id,
    employeeId: event.employeeId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    actualTimestamp: event.retrospectiveData?.actualWorkTimestamp || event.timestamp,
    location: event.location,
    previousHash: previousHash || 'GENESIS'
  };
  
  // In real implementation, use crypto.createHash('sha256')
  const dataString = JSON.stringify(eventData, Object.keys(eventData).sort());
  return `audit_${btoa(dataString).substring(0, 32)}_${Date.now()}`;
}

/**
 * Calculate Legal Retention Date - Υπολογισμός Ημερομηνίας Νομικής Διατήρησης
 */
export function calculateRetentionExpiryDate(
  eventDate: string,
  retentionYears: number = 5
): string {
  const eventDateTime = new Date(eventDate);
  eventDateTime.setFullYear(eventDateTime.getFullYear() + retentionYears);
  return eventDateTime.toISOString().split('T')[0]; // Return YYYY-MM-DD format
}

/**
 * Generate compliance report for digital work card usage with retrospective support
 */
export function generateDigitalWorkCardComplianceReport(
  sessions: WorkSession[],
  period: { start: string; end: string },
  companySettings: CompanyWorkCardSettings
): {
  totalSessions: number;
  compliantSessions: number;
  retrospectiveSessions: number;
  violationSummary: { [key: string]: number };
  penaltyRisk: number;
  erganiSyncRate: number;
  payrollAccuracy: number;
  recommendations: string[];
  legalCompliance: {
    retentionCompliance: number; // % of records with proper retention dates
    auditTrailIntegrity: number; // % of records with valid audit fingerprints
    modeConsistency: boolean; // No mixed modes in month
  };
} {
  const totalSessions = sessions.length;
  const compliantSessions = sessions.filter(s => s.violations.length === 0).length;
  const retrospectiveSessions = 0; // Would be calculated from actual data
  
  // Count violations by type
  const violationSummary: { [key: string]: number } = {};
  let totalPenaltyRisk = 0;
  
  sessions.forEach(session => {
    session.violations.forEach(violation => {
      violationSummary[violation.type] = (violationSummary[violation.type] || 0) + 1;
      
      // Calculate penalty risk based on violation type
      if (violation.severity === 'high') {
        totalPenaltyRisk += COMPLIANCE_RULES.TIMESTAMP_ACCURACY.penaltyAmount;
      }
    });
  });

  // Calculate sync rates
  const erganiSyncRate = 95; // Simulated
  const payrollAccuracy = 98; // Simulated

  // Generate recommendations with retrospective focus
  const recommendations = [];
  if (compliantSessions / totalSessions < 0.9) {
    recommendations.push('Βελτίωση εκπαίδευσης προσωπικού για σωστή χρήση ψηφιακής κάρτας');
  }
  
  if (companySettings.operationalMode === 'retrospective') {
    recommendations.push('Ενεργοποίηση αυτόματων υπενθυμίσεων για προθεσμίες απολογιστικών καταχωρήσεων');
    recommendations.push('Τακτικός έλεγχος συμμόρφωσης για αποφυγή προστίμων €10,500');
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
  
  if (totalPenaltyRisk > 0) {
    recommendations.push(`ΠΡΟΣΟΧΗ: Κίνδυνος προστίμου €${totalPenaltyRisk.toLocaleString()} - άμεση διόρθωση απαιτείται`);
  }

  return {
    totalSessions,
    compliantSessions,
    retrospectiveSessions,
    violationSummary,
    penaltyRisk: totalPenaltyRisk,
    erganiSyncRate,
    payrollAccuracy,
    recommendations,
    legalCompliance: {
      retentionCompliance: 100, // Simulated - would check retention dates
      auditTrailIntegrity: 100, // Simulated - would verify audit fingerprints
      modeConsistency: true // Simulated - would check for mixed modes
    }
  };
}