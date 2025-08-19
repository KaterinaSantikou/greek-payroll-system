/**
 * Overtime & Special Hours Calculation System
 * Greek Labor Law Compliant Overtime and Premium Calculations
 */

// Greek Labor Law Overtime and Premium Rates (2025)
export const OVERTIME_RATES = {
  STANDARD_OVERTIME: {
    code: 'standard-overtime',
    name: 'Κανονικές Υπερωρίες',
    description: 'Υπερωρίες εντός κανονικών ημερών εργασίας',
    multiplier: 1.25, // 25% increase
    maxDailyHours: 2, // Maximum 2 hours overtime per day
    maxWeeklyHours: 8, // Maximum 8 hours overtime per week
    maxAnnualHours: 150, // Maximum 150 hours overtime per year
    requiresApproval: true,
    mandatory: false
  },
  
  URGENT_OVERTIME: {
    code: 'urgent-overtime',
    name: 'Επείγουσες Υπερωρίες',
    description: 'Υπερωρίες για επείγουσες ανάγκες επιχείρησης',
    multiplier: 1.50, // 50% increase
    maxDailyHours: 4, // Maximum 4 hours in urgent cases
    requiresApproval: true,
    mandatory: true, // Can be mandatory in urgent cases
    documentation: 'Requires written justification'
  }
};

export const SUNDAY_RATES = {
  REGULAR_SUNDAY: {
    code: 'regular-sunday',
    name: 'Κυριακάτικη Εργασία',
    description: 'Εργασία την Κυριακή',
    multiplier: 1.75, // 75% increase
    maxHoursPerMonth: 4, // Maximum 4 Sundays per month
    requiresApproval: true,
    alternativeRest: true // Must provide alternative rest day
  },
  
  ESSENTIAL_SUNDAY: {
    code: 'essential-sunday',
    name: 'Αναγκαία Κυριακάτικη Εργασία',
    description: 'Εργασία Κυριακής για βασικές υπηρεσίες',
    multiplier: 2.00, // 100% increase
    sectors: ['healthcare', 'tourism', 'transportation', 'security'],
    requiresApproval: false, // Pre-approved for essential services
    alternativeRest: true
  }
};

export const NIGHT_SHIFT_RATES = {
  STANDARD_NIGHT: {
    code: 'standard-night',
    name: 'Νυχτερινή Βάρδια',
    description: 'Νυχτερινή εργασία (22:00 - 06:00)',
    multiplier: 1.25, // 25% increase
    startTime: '22:00',
    endTime: '06:00',
    minimumHours: 3, // Minimum 3 hours to qualify
    healthCheckRequired: true
  },
  
  FULL_NIGHT: {
    code: 'full-night',
    name: 'Πλήρης Νυχτερινή Βάρδια',
    description: 'Πλήρης νυχτερινή βάρδια (20:00 - 08:00)',
    multiplier: 1.40, // 40% increase
    startTime: '20:00',
    endTime: '08:00',
    minimumHours: 7, // Full night shift
    healthCheckRequired: true,
    ageRestrictions: { minAge: 18, maxAge: 50 } // Age restrictions for full night
  }
};

export const HOLIDAY_RATES = {
  NATIONAL_HOLIDAY: {
    code: 'national-holiday',
    name: 'Εθνική Εορτή',
    description: 'Εργασία σε εθνική εορτή',
    multiplier: 2.00, // 100% increase
    holidays: [
      'new-year', 'epiphany', 'independence-day', 'easter-monday',
      'may-day', 'holy-spirit', 'assumption', 'ochi-day', 'christmas', 'boxing-day'
    ],
    requiresApproval: true,
    compensatoryTime: true // Alternative: compensatory time off
  },
  
  RELIGIOUS_HOLIDAY: {
    code: 'religious-holiday',
    name: 'Θρησκευτική Εορτή',
    description: 'Εργασία σε θρησκευτική εορτή',
    multiplier: 1.75, // 75% increase
    holidays: [
      'good-friday', 'easter-saturday', 'holy-saturday',
      'pentecost', 'all-saints'
    ],
    requiresApproval: true,
    compensatoryTime: true
  },
  
  COMPANY_HOLIDAY: {
    code: 'company-holiday',
    name: 'Εταιρική Αργία',
    description: 'Εργασία σε εταιρική αργία',
    multiplier: 1.50, // 50% increase
    requiresApproval: true,
    compensatoryTime: true
  }
};

// Special Work Conditions with Premium Rates
export const SPECIAL_CONDITIONS = {
  HAZARDOUS_WORK: {
    code: 'hazardous-work',
    name: 'Επικίνδυνη Εργασία',
    description: 'Εργασία σε επικίνδυνες συνθήκες',
    multiplier: 1.20, // 20% increase
    sectors: ['construction', 'mining', 'chemicals', 'nuclear'],
    safetyTrainingRequired: true,
    medicalCheckRequired: true,
    maxDailyHours: 6 // Reduced working hours
  },
  
  EXTREME_WEATHER: {
    code: 'extreme-weather',
    name: 'Ακραίες Καιρικές Συνθήκες',
    description: 'Εργασία σε ακραίες καιρικές συνθήκες',
    multiplier: 1.15, // 15% increase
    conditions: ['extreme-heat', 'extreme-cold', 'storms'],
    temperatureThresholds: { hot: 35, cold: -5 },
    specialEquipmentRequired: true
  },
  
  REMOTE_LOCATION: {
    code: 'remote-location',
    name: 'Απομακρυσμένη Τοποθεσία',
    description: 'Εργασία σε απομακρυσμένη περιοχή',
    multiplier: 1.10, // 10% increase
    accommodationProvided: true,
    transportationProvided: true,
    minimumAssignmentDays: 7
  }
};

// Greek National Holidays (2025)
export const GREEK_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: 'Πρωτοχρονιά', type: 'national' },
  { date: '2025-01-06', name: 'Θεοφάνεια', type: 'religious' },
  { date: '2025-03-03', name: 'Καθαρά Δευτέρα', type: 'religious' },
  { date: '2025-03-25', name: 'Εθνική Επέτειος', type: 'national' },
  { date: '2025-04-18', name: 'Μεγάλη Παρασκευή', type: 'religious' },
  { date: '2025-04-20', name: 'Κυριακή του Πάσχα', type: 'religious' },
  { date: '2025-04-21', name: 'Δευτέρα του Πάσχα', type: 'religious' },
  { date: '2025-05-01', name: 'Εργατική Πρωτομαγιά', type: 'national' },
  { date: '2025-06-09', name: 'Αγίου Πνεύματος', type: 'religious' },
  { date: '2025-08-15', name: 'Κοίμηση Θεοτόκου', type: 'religious' },
  { date: '2025-10-28', name: 'Επέτειος του ΌΧΙ', type: 'national' },
  { date: '2025-12-25', name: 'Χριστούγεννα', type: 'religious' },
  { date: '2025-12-26', name: 'Δεύτερη μέρα Χριστουγέννων', type: 'religious' }
];

/**
 * Calculate overtime pay based on Greek labor law
 */
export function calculateOvertime(
  hourlyRate: number,
  overtimeHours: number,
  overtimeType: keyof typeof OVERTIME_RATES,
  employeeData: {
    weeklyHoursWorked: number;
    dailyHoursWorked: number;
    annualOvertimeHours: number;
  }
): {
  overtimePay: number;
  hourlyOvertimeRate: number;
  isWithinLimits: boolean;
  violations: string[];
  requiresApproval: boolean;
} {
  const overtimeConfig = OVERTIME_RATES[overtimeType];
  const violations: string[] = [];
  
  // Check daily overtime limits
  if (overtimeHours > overtimeConfig.maxDailyHours) {
    violations.push(`Υπέρβαση ημερήσιου ορίου υπερωριών (${overtimeConfig.maxDailyHours}h)`);
  }
  
  // Check weekly overtime limits (if applicable)
  if ((overtimeConfig as any).maxWeeklyHours && 
      employeeData.weeklyHoursWorked + overtimeHours > 40 + (overtimeConfig as any).maxWeeklyHours) {
    violations.push(`Υπέρβαση εβδομαδιαίου ορίου υπερωριών (${(overtimeConfig as any).maxWeeklyHours}h)`);
  }
  
  // Check annual overtime limits (if applicable)
  if ((overtimeConfig as any).maxAnnualHours && 
      employeeData.annualOvertimeHours + overtimeHours > (overtimeConfig as any).maxAnnualHours) {
    violations.push(`Υπέρβαση ετήσιου ορίου υπερωριών (${(overtimeConfig as any).maxAnnualHours}h)`);
  }
  
  const hourlyOvertimeRate = hourlyRate * overtimeConfig.multiplier;
  const overtimePay = hourlyOvertimeRate * overtimeHours;
  
  return {
    overtimePay,
    hourlyOvertimeRate,
    isWithinLimits: violations.length === 0,
    violations,
    requiresApproval: overtimeConfig.requiresApproval
  };
}

/**
 * Calculate Sunday work premium
 */
export function calculateSundayPremium(
  hourlyRate: number,
  sundayHours: number,
  sundayType: keyof typeof SUNDAY_RATES,
  employeeSector: string,
  monthlySundaysWorked: number
): {
  sundayPay: number;
  hourlySundayRate: number;
  isWithinLimits: boolean;
  violations: string[];
  requiresApproval: boolean;
  alternativeRestRequired: boolean;
} {
  const sundayConfig = SUNDAY_RATES[sundayType];
  const violations: string[] = [];
  
  // Check if sector is allowed for essential Sunday work
  if (sundayType === 'ESSENTIAL_SUNDAY' && 
      (sundayConfig as any).sectors && 
      !(sundayConfig as any).sectors.includes(employeeSector)) {
    violations.push(`Ο κλάδος ${employeeSector} δεν επιτρέπεται για αναγκαία κυριακάτικη εργασία`);
  }
  
  // Check monthly Sunday work limits
  if ((sundayConfig as any).maxHoursPerMonth && monthlySundaysWorked >= (sundayConfig as any).maxHoursPerMonth) {
    violations.push(`Υπέρβαση μηνιαίου ορίου κυριακάτικης εργασίας (${(sundayConfig as any).maxHoursPerMonth} Κυριακές)`);
  }
  
  const hourlySundayRate = hourlyRate * sundayConfig.multiplier;
  const sundayPay = hourlySundayRate * sundayHours;
  
  return {
    sundayPay,
    hourlySundayRate,
    isWithinLimits: violations.length === 0,
    violations,
    requiresApproval: sundayConfig.requiresApproval,
    alternativeRestRequired: sundayConfig.alternativeRest
  };
}

/**
 * Calculate night shift premium
 */
export function calculateNightShiftPremium(
  hourlyRate: number,
  nightHours: number,
  nightType: keyof typeof NIGHT_SHIFT_RATES,
  employeeAge: number,
  hasHealthClearance: boolean
): {
  nightPay: number;
  hourlyNightRate: number;
  isEligible: boolean;
  violations: string[];
  healthCheckRequired: boolean;
} {
  const nightConfig = NIGHT_SHIFT_RATES[nightType];
  const violations: string[] = [];
  
  // Check minimum hours requirement
  if (nightHours < nightConfig.minimumHours) {
    violations.push(`Ελάχιστες ώρες νυχτερινής εργασίας: ${nightConfig.minimumHours}h`);
  }
  
  // Check age restrictions for full night shifts
  if ((nightConfig as any).ageRestrictions) {
    if (employeeAge < (nightConfig as any).ageRestrictions.minAge) {
      violations.push(`Ελάχιστη ηλικία για νυχτερινή εργασία: ${(nightConfig as any).ageRestrictions.minAge} έτη`);
    }
    if (employeeAge > (nightConfig as any).ageRestrictions.maxAge) {
      violations.push(`Μέγιστη ηλικία για πλήρη νυχτερινή βάρδια: ${(nightConfig as any).ageRestrictions.maxAge} έτη`);
    }
  }
  
  // Check health clearance
  if (nightConfig.healthCheckRequired && !hasHealthClearance) {
    violations.push('Απαιτείται ιατρική εξέταση για νυχτερινή εργασία');
  }
  
  const hourlyNightRate = hourlyRate * nightConfig.multiplier;
  const nightPay = hourlyNightRate * nightHours;
  
  return {
    nightPay,
    hourlyNightRate,
    isEligible: violations.length === 0,
    violations,
    healthCheckRequired: nightConfig.healthCheckRequired
  };
}

/**
 * Calculate holiday work premium
 */
export function calculateHolidayPremium(
  hourlyRate: number,
  holidayHours: number,
  holidayDate: string,
  holidayType: keyof typeof HOLIDAY_RATES,
  preferCompensatoryTime: boolean = false
): {
  holidayPay: number;
  hourlyHolidayRate: number;
  isNationalHoliday: boolean;
  holidayName: string;
  compensatoryTimeAvailable: boolean;
  requiresApproval: boolean;
} {
  const holidayConfig = HOLIDAY_RATES[holidayType];
  const holiday = GREEK_HOLIDAYS_2025.find(h => h.date === holidayDate);
  
  const hourlyHolidayRate = hourlyRate * holidayConfig.multiplier;
  let holidayPay = hourlyHolidayRate * holidayHours;
  
  // If compensatory time is preferred and available, adjust calculation
  if (preferCompensatoryTime && holidayConfig.compensatoryTime) {
    holidayPay = hourlyRate * holidayHours; // Base rate + compensatory time off
  }
  
  return {
    holidayPay,
    hourlyHolidayRate,
    isNationalHoliday: holiday?.type === 'national' || false,
    holidayName: holiday?.name || 'Άγνωστη εορτή',
    compensatoryTimeAvailable: holidayConfig.compensatoryTime,
    requiresApproval: holidayConfig.requiresApproval
  };
}

/**
 * Calculate special conditions premium
 */
export function calculateSpecialConditionsPremium(
  hourlyRate: number,
  hoursWorked: number,
  conditionType: keyof typeof SPECIAL_CONDITIONS,
  employeeData: {
    hasSpecialTraining: boolean;
    hasMedicalClearance: boolean;
    sector: string;
  }
): {
  premiumPay: number;
  hourlyPremiumRate: number;
  isEligible: boolean;
  violations: string[];
  requiresSpecialEquipment: boolean;
} {
  const conditionConfig = SPECIAL_CONDITIONS[conditionType];
  const violations: string[] = [];
  
  // Check sector eligibility
  if ((conditionConfig as any).sectors && !(conditionConfig as any).sectors.includes(employeeData.sector)) {
    violations.push(`Ο κλάδος ${employeeData.sector} δεν είναι επιλέξιμος για ${conditionConfig.name}`);
  }
  
  // Check training requirements
  if ((conditionConfig as any).safetyTrainingRequired && !employeeData.hasSpecialTraining) {
    violations.push('Απαιτείται ειδική εκπαίδευση ασφαλείας');
  }
  
  // Check medical requirements
  if ((conditionConfig as any).medicalCheckRequired && !employeeData.hasMedicalClearance) {
    violations.push('Απαιτείται ιατρική εξέταση');
  }
  
  // Check daily hour limits
  if ((conditionConfig as any).maxDailyHours && hoursWorked > (conditionConfig as any).maxDailyHours) {
    violations.push(`Μέγιστες ημερήσιες ώρες για ${conditionConfig.name}: ${(conditionConfig as any).maxDailyHours}h`);
  }
  
  const hourlyPremiumRate = hourlyRate * conditionConfig.multiplier;
  const premiumPay = hourlyPremiumRate * hoursWorked;
  
  return {
    premiumPay,
    hourlyPremiumRate,
    isEligible: violations.length === 0,
    violations,
    requiresSpecialEquipment: (conditionConfig as any).specialEquipmentRequired || false
  };
}

/**
 * Check if a date is a Greek holiday
 */
export function isGreekHoliday(date: string): {
  isHoliday: boolean;
  holidayName?: string;
  holidayType?: string;
} {
  const holiday = GREEK_HOLIDAYS_2025.find(h => h.date === date);
  
  return {
    isHoliday: !!holiday,
    holidayName: holiday?.name,
    holidayType: holiday?.type
  };
}

/**
 * Calculate total premium pay for a work session
 */
export function calculateTotalPremiumPay(
  baseSalary: number,
  workingHours: number,
  workDate: string,
  workStartTime: string,
  workEndTime: string,
  conditions: {
    isOvertime: boolean;
    overtimeHours?: number;
    isSunday: boolean;
    isNightShift: boolean;
    hasSpecialConditions?: keyof typeof SPECIAL_CONDITIONS;
    employeeData: {
      sector: string;
      age: number;
      hasHealthClearance: boolean;
      hasSpecialTraining: boolean;
      weeklyHoursWorked: number;
      annualOvertimeHours: number;
      monthlySundaysWorked: number;
    };
  }
): {
  basePay: number;
  overtimePay: number;
  sundayPremium: number;
  nightPremium: number;
  holidayPremium: number;
  specialConditionsPremium: number;
  totalPremiumPay: number;
  totalPay: number;
  violations: string[];
  approvalRequired: boolean;
} {
  const hourlyRate = baseSalary / (40 * 4.33); // Monthly salary to hourly rate
  let totalPremiumPay = 0;
  const violations: string[] = [];
  let approvalRequired = false;
  
  const basePay = hourlyRate * workingHours;
  
  // Calculate overtime
  let overtimePay = 0;
  if (conditions.isOvertime && conditions.overtimeHours) {
    const overtimeCalc = calculateOvertime(
      hourlyRate,
      conditions.overtimeHours,
      'STANDARD_OVERTIME',
      {
        ...conditions.employeeData,
        dailyHoursWorked: workingHours
      }
    );
    overtimePay = overtimeCalc.overtimePay;
    totalPremiumPay += overtimePay;
    violations.push(...overtimeCalc.violations);
    if (overtimeCalc.requiresApproval) approvalRequired = true;
  }
  
  // Calculate Sunday premium
  let sundayPremium = 0;
  if (conditions.isSunday) {
    const sundayCalc = calculateSundayPremium(
      hourlyRate,
      workingHours,
      'REGULAR_SUNDAY',
      conditions.employeeData.sector,
      conditions.employeeData.monthlySundaysWorked
    );
    sundayPremium = sundayCalc.sundayPay - basePay; // Premium only
    totalPremiumPay += sundayPremium;
    violations.push(...sundayCalc.violations);
    if (sundayCalc.requiresApproval) approvalRequired = true;
  }
  
  // Calculate night shift premium
  let nightPremium = 0;
  if (conditions.isNightShift) {
    const nightCalc = calculateNightShiftPremium(
      hourlyRate,
      workingHours,
      'STANDARD_NIGHT',
      conditions.employeeData.age,
      conditions.employeeData.hasHealthClearance
    );
    nightPremium = nightCalc.nightPay - basePay; // Premium only
    totalPremiumPay += nightPremium;
    violations.push(...nightCalc.violations);
  }
  
  // Calculate holiday premium
  let holidayPremium = 0;
  const holidayCheck = isGreekHoliday(workDate);
  if (holidayCheck.isHoliday) {
    const holidayCalc = calculateHolidayPremium(
      hourlyRate,
      workingHours,
      holidayCheck.holidayType === 'national' ? 'NATIONAL_HOLIDAY' : 'RELIGIOUS_HOLIDAY',
      workDate
    );
    holidayPremium = holidayCalc.holidayPay - basePay; // Premium only
    totalPremiumPay += holidayPremium;
    if (holidayCalc.requiresApproval) approvalRequired = true;
  }
  
  // Calculate special conditions premium
  let specialConditionsPremium = 0;
  if (conditions.hasSpecialConditions) {
    const specialCalc = calculateSpecialConditionsPremium(
      hourlyRate,
      workingHours,
      conditions.hasSpecialConditions,
      {
        hasSpecialTraining: conditions.employeeData.hasSpecialTraining,
        hasMedicalClearance: conditions.employeeData.hasHealthClearance,
        sector: conditions.employeeData.sector
      }
    );
    specialConditionsPremium = specialCalc.premiumPay - basePay; // Premium only
    totalPremiumPay += specialConditionsPremium;
    violations.push(...specialCalc.violations);
  }
  
  return {
    basePay,
    overtimePay,
    sundayPremium,
    nightPremium,
    holidayPremium,
    specialConditionsPremium,
    totalPremiumPay,
    totalPay: basePay + totalPremiumPay,
    violations,
    approvalRequired
  };
}

/**
 * Get overtime and premium rates for UI display
 */
export function getOvertimeAndPremiumRates(): {
  overtimeRates: typeof OVERTIME_RATES;
  sundayRates: typeof SUNDAY_RATES;
  nightRates: typeof NIGHT_SHIFT_RATES;
  holidayRates: typeof HOLIDAY_RATES;
  specialConditions: typeof SPECIAL_CONDITIONS;
  holidays: typeof GREEK_HOLIDAYS_2025;
} {
  return {
    overtimeRates: OVERTIME_RATES,
    sundayRates: SUNDAY_RATES,
    nightRates: NIGHT_SHIFT_RATES,
    holidayRates: HOLIDAY_RATES,
    specialConditions: SPECIAL_CONDITIONS,
    holidays: GREEK_HOLIDAYS_2025
  };
}