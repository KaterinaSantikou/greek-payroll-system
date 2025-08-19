/**
 * Working Time Arrangements and Schedule Management
 * EU Working Time Directive and Greek Labor Law Compliance
 */

// Contract Types with Greek Labor Law Specifications
export const CONTRACT_TYPES = {
  FULL_TIME: {
    code: 'full-time',
    name: 'Πλήρης Απασχόληση',
    minWeeklyHours: 35,
    maxWeeklyHours: 40,
    standardWeeklyHours: 40,
    trialPeriodMonths: { min: 2, max: 12 },
    fullBenefits: true,
    description: 'Συμβάσεις αορίστου ή ορισμένου χρόνου με πλήρη απασχόληση'
  },
  PART_TIME: {
    code: 'part-time',
    name: 'Μερική Απασχόληση',
    minWeeklyHours: 10,
    maxWeeklyHours: 34,
    standardWeeklyHours: 20,
    trialPeriodMonths: { min: 1, max: 6 },
    fullBenefits: false,
    proRatedBenefits: true,
    description: 'Συμβάσεις μερικής απασχόλησης με αναλογικά δικαιώματα'
  },
  TEMPORARY: {
    code: 'temporary',
    name: 'Προσωρινή Εργασία',
    minWeeklyHours: 20,
    maxWeeklyHours: 40,
    maxDurationMonths: 24,
    renewalAllowed: true,
    maxRenewals: 2,
    trialPeriodMonths: { min: 1, max: 3 },
    description: 'Προσωρινές συμβάσεις εργασίας για συγκεκριμένες ανάγκες'
  },
  SEASONAL: {
    code: 'seasonal',
    name: 'Εποχιακή Εργασία',
    minWeeklyHours: 25,
    maxWeeklyHours: 48,
    maxDurationMonths: 8,
    seasonalWork: true,
    specialConditions: ['tourism', 'agriculture', 'hospitality'],
    description: 'Εποχιακές συμβάσεις για τουρισμό, γεωργία και συναφείς κλάδους'
  },
  FREELANCE: {
    code: 'freelance',
    name: 'Ελεύθερη Συνεργασία',
    independentContractor: true,
    flexibleHours: true,
    projectBased: true,
    requiresWorkPermit: true,
    description: 'Συμβάσεις ελεύθερης συνεργασίας και παροχής υπηρεσιών'
  },
  APPRENTICESHIP: {
    code: 'apprenticeship',
    name: 'Μαθητεία',
    minWeeklyHours: 20,
    maxWeeklyHours: 35,
    maxDurationMonths: 36,
    educationComponent: true,
    specialProtections: true,
    description: 'Προγράμματα μαθητείας με εκπαιδευτικό στοιχείο'
  },
  INTERNSHIP: {
    code: 'internship',
    name: 'Πρακτική Άσκηση',
    minWeeklyHours: 15,
    maxWeeklyHours: 30,
    maxDurationMonths: 12,
    educationComponent: true,
    limitedBenefits: true,
    description: 'Προγράμματα πρακτικής άσκησης για φοιτητές και αποφοίτους'
  }
};

// Schedule Types
export const SCHEDULE_TYPES = {
  PREDICTABLE: {
    code: 'predictable',
    name: 'Προβλέψιμο Ωράριο',
    fixedHours: true,
    advanceNotice: 0,
    description: 'Σταθερό ωράριο εργασίας με προβλέψιμες ώρες'
  },
  UNPREDICTABLE: {
    code: 'unpredictable',
    name: 'Μη Προβλέψιμο Ωράριο',
    fixedHours: false,
    advanceNotice: 48, // hours
    compensation: 0.1, // 10% premium for unpredictability
    description: 'Μεταβλητό ωράριο εργασίας με 48ωρη προειδοποίηση'
  },
  ROTATING: {
    code: 'rotating',
    name: 'Εναλλασσόμενες Βάρδιες',
    shiftWork: true,
    rotationCycle: 28, // days
    nightWorkPremium: 0.25,
    description: 'Σύστημα εναλλασσόμενων βαρδιών με κυκλικό πρόγραμμα'
  },
  ON_CALL: {
    code: 'on-call',
    name: 'Κλήση Εργασίας',
    onCallAvailability: true,
    callOutPremium: 0.5,
    minCallOutHours: 3,
    description: 'Διαθεσιμότητα για κλήση σε εργασία κατά περίπτωση'
  },
  SHIFT: {
    code: 'shift',
    name: 'Βάρδιες',
    shiftWork: true,
    shiftPremiums: { morning: 0, evening: 0.15, night: 0.25 },
    description: 'Σύστημα βαρδιών πρωί, απόγευμα και νύχτα'
  }
};

// Working Time Arrangements
export const WORKING_TIME_ARRANGEMENTS = {
  STANDARD: {
    code: 'standard',
    name: 'Στάνταρ Εργασία',
    fixedLocation: true,
    fixedHours: true,
    description: 'Παραδοσιακό μοντέλο εργασίας σε σταθερό χώρο και ώρες'
  },
  FLEXIBLE: {
    code: 'flexible',
    name: 'Ευέλικτη Εργασία',
    flexibleStart: true,
    flexibleEnd: true,
    coreHoursRequired: true,
    description: 'Ευελιξία στις ώρες έναρξης και λήξης με υποχρεωτικές κεντρικές ώρες'
  },
  REMOTE: {
    code: 'remote',
    name: 'Τηλεργασία',
    remoteWork: true,
    rightToDisconnect: true,
    digitalTools: true,
    description: 'Πλήρης τηλεργασία από το σπίτι ή άλλο χώρο'
  },
  HYBRID: {
    code: 'hybrid',
    name: 'Υβριδική Εργασία',
    partialRemote: true,
    flexibleDays: true,
    officePresence: true,
    description: 'Συνδυασμός γραφείου και τηλεργασίας'
  },
  COMPRESSED: {
    code: 'compressed',
    name: 'Συμπιεσμένη Εβδομάδα',
    fourDayWeek: true,
    longerDays: true,
    extendedWeekend: true,
    description: 'Τετραήμερη εργασία με περισσότερες ώρες ανά ημέρα'
  }
};

// EU Working Time Directive Limits
export const EU_WORKING_TIME_LIMITS = {
  MAX_WEEKLY_HOURS: 48,
  MAX_DAILY_HOURS: 8,
  MIN_REST_BETWEEN_SHIFTS: 11, // hours
  MIN_WEEKLY_REST: 24, // hours
  MAX_CONSECUTIVE_DAYS: 6,
  MIN_ANNUAL_LEAVE: 20, // days (Greece provides 24)
  MAX_NIGHT_WORK: 8, // hours per night shift
  NIGHT_PERIOD: { start: '22:00', end: '06:00' }
};

// Greek Specific Requirements
export const GREEK_LABOR_REQUIREMENTS = {
  MINIMUM_WAGE_2025: 760, // €760/month
  ANNUAL_LEAVE_DAYS: 24, // Minimum in Greece
  SICK_LEAVE_DAYS: 15,
  MATERNITY_LEAVE_DAYS: 119, // 17 weeks
  PATERNITY_LEAVE_DAYS: 14, // 2 weeks
  MAX_TRIAL_PERIOD_MONTHS: 12,
  NOTICE_PERIOD_DAYS: { employee: 30, employer: 30 },
  OVERTIME_DAILY_LIMIT: 2, // hours
  OVERTIME_WEEKLY_LIMIT: 10, // hours
  SUNDAY_WORK_PREMIUM: 0.75 // 75%
};

/**
 * Calculate trial period details based on contract type and position
 */
export function calculateTrialPeriod(
  contractType: string,
  position: string,
  startDate: Date
): {
  recommendedDuration: number;
  maxDuration: number;
  endDate: Date;
  extensionAllowed: boolean;
  reviewDates: Date[];
} {
  const contract = CONTRACT_TYPES[contractType as keyof typeof CONTRACT_TYPES];
  if (!contract?.trialPeriodMonths) {
    throw new Error(`Invalid contract type: ${contractType}`);
  }

  // Determine recommended duration based on position complexity
  const isManagementPosition = position.toLowerCase().includes('manager') || 
                              position.toLowerCase().includes('director') ||
                              position.toLowerCase().includes('supervisor');
  
  const isSpecialistPosition = position.toLowerCase().includes('specialist') ||
                              position.toLowerCase().includes('analyst') ||
                              position.toLowerCase().includes('engineer');

  let recommendedDuration = contract.trialPeriodMonths.min;
  
  if (isManagementPosition) {
    recommendedDuration = Math.min(contract.trialPeriodMonths.max, 12);
  } else if (isSpecialistPosition) {
    recommendedDuration = Math.min(contract.trialPeriodMonths.max, 6);
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + recommendedDuration);

  // Calculate review dates (monthly for first 3 months, then quarterly)
  const reviewDates: Date[] = [];
  for (let month = 1; month <= recommendedDuration; month++) {
    if (month <= 3 || month % 3 === 0) {
      const reviewDate = new Date(startDate);
      reviewDate.setMonth(reviewDate.getMonth() + month);
      reviewDates.push(reviewDate);
    }
  }

  return {
    recommendedDuration,
    maxDuration: contract.trialPeriodMonths.max,
    endDate,
    extensionAllowed: recommendedDuration < contract.trialPeriodMonths.max,
    reviewDates
  };
}

/**
 * Validate working time arrangement compliance
 */
export function validateWorkingTimeCompliance(schedule: {
  weeklyHours: number;
  dailyHours: number;
  consecutiveDays: number;
  restBetweenShifts: number;
  nightHours?: number;
  weekendWork?: boolean;
  contractType: string;
}): {
  isCompliant: boolean;
  violations: string[];
  warnings: string[];
} {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check EU Working Time Directive compliance
  if (schedule.weeklyHours > EU_WORKING_TIME_LIMITS.MAX_WEEKLY_HOURS) {
    violations.push(`Υπέρβαση μέγιστων εβδομαδιαίων ωρών: ${schedule.weeklyHours} > ${EU_WORKING_TIME_LIMITS.MAX_WEEKLY_HOURS}`);
  }

  if (schedule.dailyHours > EU_WORKING_TIME_LIMITS.MAX_DAILY_HOURS) {
    violations.push(`Υπέρβαση μέγιστων ημερήσιων ωρών: ${schedule.dailyHours} > ${EU_WORKING_TIME_LIMITS.MAX_DAILY_HOURS}`);
  }

  if (schedule.consecutiveDays > EU_WORKING_TIME_LIMITS.MAX_CONSECUTIVE_DAYS) {
    violations.push(`Υπέρβαση συνεχόμενων ημερών εργασίας: ${schedule.consecutiveDays} > ${EU_WORKING_TIME_LIMITS.MAX_CONSECUTIVE_DAYS}`);
  }

  if (schedule.restBetweenShifts < EU_WORKING_TIME_LIMITS.MIN_REST_BETWEEN_SHIFTS) {
    violations.push(`Ανεπαρκής ανάπαυση μεταξύ βαρδιών: ${schedule.restBetweenShifts} < ${EU_WORKING_TIME_LIMITS.MIN_REST_BETWEEN_SHIFTS} ώρες`);
  }

  if (schedule.nightHours && schedule.nightHours > EU_WORKING_TIME_LIMITS.MAX_NIGHT_WORK) {
    violations.push(`Υπέρβαση νυχτερινών ωρών: ${schedule.nightHours} > ${EU_WORKING_TIME_LIMITS.MAX_NIGHT_WORK}`);
  }

  // Check contract-specific limits
  const contractType = CONTRACT_TYPES[schedule.contractType as keyof typeof CONTRACT_TYPES];
  if (contractType) {
    if (schedule.weeklyHours < contractType.minWeeklyHours) {
      violations.push(`Λιγότερες από τις ελάχιστες εβδομαδιαίες ώρες για ${contractType.name}: ${schedule.weeklyHours} < ${contractType.minWeeklyHours}`);
    }
    
    if (schedule.weeklyHours > contractType.maxWeeklyHours) {
      violations.push(`Περισσότερες από τις μέγιστες εβδομαδιαίες ώρες για ${contractType.name}: ${schedule.weeklyHours} > ${contractType.maxWeeklyHours}`);
    }
  }

  // Warnings for best practices
  if (schedule.weeklyHours > 45) {
    warnings.push('Συνιστάται περιορισμός εβδομαδιαίων ωρών κάτω από 45 για καλύτερη ισορροπία εργασίας-ζωής');
  }

  if (schedule.weekendWork) {
    warnings.push('Η εργασία Σαββατοκύριακου απαιτεί ειδική αποζημίωση και εγκρίσεις');
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    warnings
  };
}

/**
 * Calculate weekly schedule patterns
 */
export function generateWeeklySchedulePattern(
  scheduleType: string,
  dailyHours: number,
  workDays: number[] = [1, 2, 3, 4, 5] // Monday-Friday default
): {
  pattern: Array<{
    day: number;
    dayName: string;
    startTime: string;
    endTime: string;
    workHours: number;
    breaks: Array<{ start: string; end: string; type: string }>;
  }>;
  totalWeeklyHours: number;
} {
  const dayNames = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
  const pattern = [];
  let totalWeeklyHours = 0;

  // Standard break schedule
  const calculateBreaks = (hours: number) => {
    const breaks = [];
    if (hours >= 4) {
      breaks.push({ start: '10:30', end: '10:45', type: 'Διάλειμμα' });
    }
    if (hours >= 6) {
      breaks.push({ start: '13:00', end: '13:30', type: 'Μεσημεριανό' });
    }
    if (hours >= 8) {
      breaks.push({ start: '15:30', end: '15:45', type: 'Διάλειμμα' });
    }
    return breaks;
  };

  for (let day = 0; day < 7; day++) {
    if (workDays.includes(day)) {
      let startTime = '09:00';
      let endTime = '17:00';

      // Adjust times based on schedule type
      switch (scheduleType) {
        case 'shift':
          if (day % 3 === 0) { // Morning shift
            startTime = '06:00';
            endTime = '14:00';
          } else if (day % 3 === 1) { // Evening shift
            startTime = '14:00';
            endTime = '22:00';
          } else { // Night shift
            startTime = '22:00';
            endTime = '06:00';
          }
          break;
        case 'compressed':
          startTime = '08:00';
          endTime = '18:00'; // 10-hour days for 4-day week
          break;
        case 'flexible':
          startTime = '08:00-10:00'; // Flexible range
          endTime = '16:00-18:00';
          break;
      }

      pattern.push({
        day,
        dayName: dayNames[day],
        startTime,
        endTime,
        workHours: dailyHours,
        breaks: calculateBreaks(dailyHours)
      });

      totalWeeklyHours += dailyHours;
    } else {
      pattern.push({
        day,
        dayName: dayNames[day],
        startTime: '',
        endTime: '',
        workHours: 0,
        breaks: []
      });
    }
  }

  return { pattern, totalWeeklyHours };
}

/**
 * Calculate premium rates for special working conditions
 */
export function calculatePremiumRates(workingConditions: {
  isNightWork?: boolean;
  isWeekendWork?: boolean;
  isHolidayWork?: boolean;
  isOvertimeWork?: boolean;
  isHazardousWork?: boolean;
  scheduleType?: string;
}): {
  totalPremiumRate: number;
  premiumBreakdown: Array<{ type: string; rate: number; description: string }>;
} {
  const premiumBreakdown = [];
  let totalPremiumRate = 0;

  if (workingConditions.isNightWork) {
    const nightPremium = 0.25; // 25%
    premiumBreakdown.push({
      type: 'Νυχτερινή Εργασία',
      rate: nightPremium,
      description: 'Επίδομα νυχτερινής εργασίας (22:00-06:00)'
    });
    totalPremiumRate += nightPremium;
  }

  if (workingConditions.isWeekendWork) {
    const weekendPremium = GREEK_LABOR_REQUIREMENTS.SUNDAY_WORK_PREMIUM; // 75%
    premiumBreakdown.push({
      type: 'Εργασία Σαββατοκύριακου',
      rate: weekendPremium,
      description: 'Επίδομα εργασίας Σαββάτου/Κυριακής'
    });
    totalPremiumRate += weekendPremium;
  }

  if (workingConditions.isHolidayWork) {
    const holidayPremium = 1.0; // 100%
    premiumBreakdown.push({
      type: 'Εργασία Αργίας',
      rate: holidayPremium,
      description: 'Επίδομα εργασίας σε επίσημες αργίες'
    });
    totalPremiumRate += holidayPremium;
  }

  if (workingConditions.isOvertimeWork) {
    const overtimePremium = 0.25; // 25%
    premiumBreakdown.push({
      type: 'Υπερεργασία',
      rate: overtimePremium,
      description: 'Επίδομα υπερεργασίας (πρώτες 2 ώρες 25%, μετά 50%)'
    });
    totalPremiumRate += overtimePremium;
  }

  if (workingConditions.isHazardousWork) {
    const hazardPremium = 0.20; // 20%
    premiumBreakdown.push({
      type: 'Επικίνδυνη Εργασία',
      rate: hazardPremium,
      description: 'Επίδομα επικινδυνότητας και δυσμενών συνθηκών'
    });
    totalPremiumRate += hazardPremium;
  }

  if (workingConditions.scheduleType === 'unpredictable') {
    const unpredictablePremium = 0.10; // 10%
    premiumBreakdown.push({
      type: 'Μη Προβλέψιμο Ωράριο',
      rate: unpredictablePremium,
      description: 'Επίδομα για μη προβλέψιμο πρόγραμμα εργασίας'
    });
    totalPremiumRate += unpredictablePremium;
  }

  return { totalPremiumRate, premiumBreakdown };
}

/**
 * Get contract type options for UI
 */
export function getContractTypeOptions() {
  return Object.values(CONTRACT_TYPES).map(contract => ({
    value: contract.code,
    label: contract.name,
    description: contract.description
  }));
}

/**
 * Get schedule type options for UI
 */
export function getScheduleTypeOptions() {
  return Object.values(SCHEDULE_TYPES).map(schedule => ({
    value: schedule.code,
    label: schedule.name,
    description: schedule.description
  }));
}

/**
 * Get working time arrangement options for UI
 */
export function getWorkingTimeArrangementOptions() {
  return Object.values(WORKING_TIME_ARRANGEMENTS).map(arrangement => ({
    value: arrangement.code,
    label: arrangement.name,
    description: arrangement.description
  }));
}