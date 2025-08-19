/**
 * Leave Management System
 * Greek Labor Law Compliant Leave Calculations and Tracking
 */

// Greek Annual Leave Entitlements (2025)
export const ANNUAL_LEAVE_ENTITLEMENTS = {
  BASIC: {
    code: 'basic',
    name: 'Βασική Άδεια',
    description: 'Βασική ετήσια άδεια για εργαζομένους',
    minDays: 20, // Minimum 20 days for all employees
    calculation: 'tenure_based',
    increments: [
      { years: 0, days: 20 }, // 0-1 years: 20 days
      { years: 1, days: 21 }, // 1-2 years: 21 days
      { years: 2, days: 22 }, // 2-10 years: 22 days
      { years: 10, days: 23 }, // 10-15 years: 23 days
      { years: 15, days: 24 }, // 15-20 years: 24 days
      { years: 20, days: 25 }, // 20+ years: 25 days
      { years: 25, days: 26 }  // 25+ years: 26 days (some sectors)
    ],
    carryOverDays: 6, // Maximum 6 days can be carried to next year
    mustUseDays: 14, // Minimum 14 days must be used within the year
    mandatoryPeriod: '1-jun_30-sep', // Must take at least 14 days between June-September
    paymentDuringLeave: 'full_salary_plus_bonus'
  },

  SPECIAL_CATEGORIES: {
    YOUNG_WORKERS: {
      code: 'young-workers',
      name: 'Νεαροί Εργαζόμενοι',
      description: 'Εργαζόμενοι κάτω των 18 ετών',
      ageLimit: 18,
      extraDays: 5, // Additional 5 days for workers under 18
      mandatoryConsecutive: 14 // Must take at least 14 consecutive days
    },

    MOTHERS_3_CHILDREN: {
      code: 'mothers-3-children',
      name: 'Μητέρες 3+ Τέκνων',
      description: 'Μητέρες με 3 ή περισσότερα τέκνα',
      extraDays: 2, // Additional 2 days
      childrenRequired: 3
    },

    DISABLED_WORKERS: {
      code: 'disabled-workers',
      name: 'Άτομα με Αναπηρία',
      description: 'Εργαζόμενοι με αναπηρία άνω του 50%',
      extraDays: 6, // Additional 6 days
      disabilityThreshold: 50 // 50% disability minimum
    },

    SHIFT_WORKERS: {
      code: 'shift-workers',
      name: 'Βαρδιακοί Εργαζόμενοι',
      description: 'Εργαζόμενοι σε συνεχή βάρδια',
      extraDays: 1, // Additional 1 day
      shiftPattern: 'continuous'
    }
  }
};

// Sick Leave Entitlements
export const SICK_LEAVE_ENTITLEMENTS = {
  PAID_SICK_LEAVE: {
    code: 'paid-sick-leave',
    name: 'Άδεια Ασθενείας',
    description: 'Πληρωμένη άδεια ασθενείας',
    daysPerYear: 15, // 15 days paid sick leave per year
    doctorCertificateRequired: true,
    certificateAfterDays: 3, // Certificate required after 3 consecutive days
    paymentRate: 1.0, // 100% salary for first 15 days
    carryOver: false, // Cannot carry over to next year
    familyMemberCare: {
      enabled: true,
      daysPerYear: 5, // 5 days for family member care
      relationshipRequired: ['spouse', 'child', 'parent', 'sibling']
    }
  },

  EXTENDED_SICK_LEAVE: {
    code: 'extended-sick-leave',
    name: 'Παρατεταμένη Άδεια Ασθενείας',
    description: 'Άδεια ασθενείας πέραν των 15 ημερών',
    maxDaysPerYear: 60, // Maximum 60 additional days
    paymentRate: 0.5, // 50% salary
    socialSecurityCoverage: true,
    specialistCertificateRequired: true,
    reviewPeriod: 30 // Review every 30 days
  },

  CHRONIC_ILLNESS: {
    code: 'chronic-illness',
    name: 'Χρόνια Ασθένεια',
    description: 'Άδεια για χρόνιες παθήσεις',
    maxDaysPerYear: 22, // Up to 22 additional days
    conditions: ['diabetes', 'cancer', 'heart_disease', 'mental_health'],
    specialDocumentation: true,
    paymentRate: 0.75 // 75% salary
  }
};

// Parental Leave Entitlements
export const PARENTAL_LEAVE_ENTITLEMENTS = {
  MATERNITY_LEAVE: {
    code: 'maternity-leave',
    name: 'Άδεια Μητρότητας',
    description: 'Άδεια μητρότητας και τοκετού',
    totalDays: 119, // 17 weeks total
    preBirthDays: 56, // 8 weeks before birth (can be reduced to 7)
    postBirthDays: 63, // 9 weeks after birth
    paymentRate: 1.0, // 100% salary
    mandatory: true,
    healthInsuranceRequired: true,
    additionalForMultiple: {
      twins: 14, // Additional 14 days for twins
      triplets: 28 // Additional 28 days for triplets
    }
  },

  PATERNITY_LEAVE: {
    code: 'paternity-leave',
    name: 'Άδεια Πατρότητας',
    description: 'Άδεια πατρότητας',
    totalDays: 14, // 14 days paternity leave
    mustBeTakenDays: 84, // Must be taken within 84 days of birth
    paymentRate: 1.0, // 100% salary
    consecutive: false, // Can be taken in parts
    additionalForMultiple: {
      twins: 1, // Additional 1 day for twins
      triplets: 2 // Additional 2 days for triplets
    }
  },

  PARENTAL_LEAVE: {
    code: 'parental-leave',
    name: 'Γονική Άδεια',
    description: 'Άδεια ανατροφής τέκνου',
    totalMonths: 4, // 4 months parental leave
    ageLimit: 6, // Child must be under 6 years old
    paymentRate: 0.0, // Unpaid leave
    jobProtection: true,
    canBeShared: true, // Can be shared between parents
    partTimeOption: true,
    socialSecurityContinues: true
  },

  ADOPTION_LEAVE: {
    code: 'adoption-leave',
    name: 'Άδεια Υιοθεσίας',
    description: 'Άδεια για υιοθεσία παιδιού',
    totalDays: 49, // 7 weeks for adoption
    childAgeLimit: 12, // Child must be under 12 years old
    paymentRate: 1.0, // 100% salary
    documentationRequired: true
  }
};

// Special Leave Types
export const SPECIAL_LEAVE_TYPES = {
  MARRIAGE_LEAVE: {
    code: 'marriage-leave',
    name: 'Άδεια Γάμου',
    description: 'Άδεια για γάμο εργαζομένου',
    days: 6, // 6 days for own marriage
    paymentRate: 1.0,
    timeLimitAfterEvent: 60, // Must be taken within 60 days
    documentationRequired: true,
    familyMarriage: {
      child: 1, // 1 day for child's marriage
      sibling: 1 // 1 day for sibling's marriage
    }
  },

  BEREAVEMENT_LEAVE: {
    code: 'bereavement-leave',
    name: 'Άδεια Θανάτου',
    description: 'Άδεια για θάνατο συγγενούς',
    days: {
      spouse: 3,
      child: 5,
      parent: 3,
      sibling: 2,
      grandparent: 1,
      parentInLaw: 2
    },
    paymentRate: 1.0,
    documentationRequired: true,
    timeLimitAfterEvent: 30 // Must be taken within 30 days
  },

  MILITARY_LEAVE: {
    code: 'military-leave',
    name: 'Στρατιωτική Άδεια',
    description: 'Άδεια για στρατιωτικές υποχρεώσεις',
    days: 'as_required', // As many days as military service requires
    paymentRate: 0.0, // Unpaid
    jobProtection: true,
    reserveExercises: {
      days: 30, // Up to 30 days per year for reserve exercises
      paymentRate: 0.5 // 50% salary
    }
  },

  BLOOD_DONATION: {
    code: 'blood-donation',
    name: 'Άδεια Αιμοδοσίας',
    description: 'Άδεια για αιμοδοσία',
    days: 1, // 1 day per donation
    maxPerYear: 4, // Maximum 4 donations per year
    paymentRate: 1.0,
    documentationRequired: true
  },

  EDUCATION_LEAVE: {
    code: 'education-leave',
    name: 'Εκπαιδευτική Άδεια',
    description: 'Άδεια για εκπαιδευτικούς σκοπούς',
    maxDaysPerYear: 20, // Up to 20 days per year
    paymentRate: 0.0, // Usually unpaid
    approvalRequired: true,
    jobProtection: true,
    conditions: ['university_exams', 'professional_certification', 'language_certification']
  }
};

// Unpaid Leave Types
export const UNPAID_LEAVE_TYPES = {
  PERSONAL_LEAVE: {
    code: 'personal-leave',
    name: 'Προσωπική Άδεια',
    description: 'Άδεια άνευ αποδοχών για προσωπικούς λόγους',
    maxDaysPerYear: 30, // Up to 30 days per year
    approvalRequired: true,
    noticePeriod: 30, // 30 days notice required
    jobProtection: true,
    socialSecurityContinues: false
  },

  SABBATICAL_LEAVE: {
    code: 'sabbatical-leave',
    name: 'Άδεια Σαββατικού',
    description: 'Εκτεταμένη άδεια για προσωπική ανάπτυξη',
    maxMonths: 12, // Up to 12 months
    minimumTenure: 60, // Minimum 5 years employment
    approvalRequired: true,
    returnGuarantee: true,
    socialSecurityOptions: true
  },

  STUDY_LEAVE: {
    code: 'study-leave',
    name: 'Άδεια Σπουδών',
    description: 'Άδεια για μεταπτυχιακές σπουδές',
    maxYears: 2, // Up to 2 years
    academicInstitutionRequired: true,
    approvalRequired: true,
    returnCommitment: 24, // Must return for at least 24 months
    partialPaymentOption: true
  }
};

/**
 * Calculate annual leave entitlement based on tenure and special categories
 */
export function calculateAnnualLeaveEntitlement(
  employeeData: {
    startDate: string;
    dateOfBirth: string;
    hasChildren: boolean;
    numberOfChildren: number;
    hasDisability: boolean;
    disabilityPercentage: number;
    workPattern: string;
    gender: string;
  }
): {
  basicDays: number;
  bonusDays: number;
  totalDays: number;
  carryOverLimit: number;
  mandatoryUseDays: number;
  breakdown: Array<{
    category: string;
    description: string;
    days: number;
    reason: string;
  }>;
} {
  const currentDate = new Date();
  const startDate = new Date(employeeData.startDate);
  const yearsOfService = Math.floor((currentDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const age = Math.floor((currentDate.getTime() - new Date(employeeData.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  const breakdown = [];
  let totalDays = 0;
  let bonusDays = 0;

  // Calculate basic entitlement based on tenure
  const basicEntitlement = ANNUAL_LEAVE_ENTITLEMENTS.BASIC.increments
    .reverse()
    .find(increment => yearsOfService >= increment.years);
  
  const basicDays = basicEntitlement?.days || 20;
  totalDays += basicDays;
  
  breakdown.push({
    category: 'basic',
    description: 'Βασική ετήσια άδεια',
    days: basicDays,
    reason: `${yearsOfService} έτη υπηρεσίας`
  });

  // Check for young worker bonus
  if (age < ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.YOUNG_WORKERS.ageLimit) {
    const youngWorkerBonus = ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.YOUNG_WORKERS.extraDays;
    bonusDays += youngWorkerBonus;
    totalDays += youngWorkerBonus;
    
    breakdown.push({
      category: 'young-worker',
      description: 'Νεαρός εργαζόμενος',
      days: youngWorkerBonus,
      reason: `Ηλικία κάτω από ${ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.YOUNG_WORKERS.ageLimit} έτη`
    });
  }

  // Check for mothers with 3+ children bonus
  if (employeeData.gender === 'female' && 
      employeeData.numberOfChildren >= ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.MOTHERS_3_CHILDREN.childrenRequired) {
    const mothersBonus = ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.MOTHERS_3_CHILDREN.extraDays;
    bonusDays += mothersBonus;
    totalDays += mothersBonus;
    
    breakdown.push({
      category: 'mothers-bonus',
      description: 'Μητέρα 3+ τέκνων',
      days: mothersBonus,
      reason: `${employeeData.numberOfChildren} τέκνα`
    });
  }

  // Check for disability bonus
  if (employeeData.hasDisability && 
      employeeData.disabilityPercentage >= ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.DISABLED_WORKERS.disabilityThreshold) {
    const disabilityBonus = ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.DISABLED_WORKERS.extraDays;
    bonusDays += disabilityBonus;
    totalDays += disabilityBonus;
    
    breakdown.push({
      category: 'disability-bonus',
      description: 'Άτομο με αναπηρία',
      days: disabilityBonus,
      reason: `${employeeData.disabilityPercentage}% αναπηρία`
    });
  }

  // Check for shift worker bonus
  if (employeeData.workPattern === 'continuous_shifts') {
    const shiftBonus = ANNUAL_LEAVE_ENTITLEMENTS.SPECIAL_CATEGORIES.SHIFT_WORKERS.extraDays;
    bonusDays += shiftBonus;
    totalDays += shiftBonus;
    
    breakdown.push({
      category: 'shift-bonus',
      description: 'Βαρδιακός εργαζόμενος',
      days: shiftBonus,
      reason: 'Συνεχείς βάρδιες'
    });
  }

  return {
    basicDays,
    bonusDays,
    totalDays,
    carryOverLimit: ANNUAL_LEAVE_ENTITLEMENTS.BASIC.carryOverDays,
    mandatoryUseDays: ANNUAL_LEAVE_ENTITLEMENTS.BASIC.mustUseDays,
    breakdown
  };
}

/**
 * Calculate leave balance for an employee
 */
export function calculateLeaveBalance(
  entitlement: number,
  usedDays: number,
  pendingDays: number,
  carriedOverDays: number = 0
): {
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  carryOverEligible: number;
  mustUseBeforeYearEnd: number;
} {
  const totalEntitlement = entitlement + carriedOverDays;
  const availableDays = totalEntitlement - usedDays - pendingDays;
  const carryOverLimit = ANNUAL_LEAVE_ENTITLEMENTS.BASIC.carryOverDays;
  const mandatoryUseDays = ANNUAL_LEAVE_ENTITLEMENTS.BASIC.mustUseDays;
  
  const carryOverEligible = Math.min(availableDays, carryOverLimit);
  const mustUseBeforeYearEnd = Math.max(0, availableDays - carryOverLimit);

  return {
    totalEntitlement,
    usedDays,
    pendingDays,
    availableDays,
    carryOverEligible,
    mustUseBeforeYearEnd
  };
}

/**
 * Validate leave request against business rules
 */
export function validateLeaveRequest(
  leaveType: string,
  startDate: string,
  endDate: string,
  employeeData: {
    availableDays: number;
    hasUsedMandatoryDays: boolean;
    yearsOfService: number;
    lastLeaveDate?: string;
  }
): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const suggestions: string[] = [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const leaveDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  // Check if employee has enough days
  if (leaveType === 'annual' && leaveDays > employeeData.availableDays) {
    errors.push(`Δεν υπάρχουν αρκετές διαθέσιμες ημέρες. Ζητήθηκαν: ${leaveDays}, Διαθέσιμες: ${employeeData.availableDays}`);
  }

  // Check mandatory summer leave period (June-September)
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const isSummerPeriod = (startMonth >= 5 && startMonth <= 8) || (endMonth >= 5 && endMonth <= 8);
  
  if (leaveType === 'annual' && !employeeData.hasUsedMandatoryDays && !isSummerPeriod && leaveDays >= 14) {
    warnings.push('Συνιστάται να χρησιμοποιήσετε τουλάχιστον 14 ημέρες κατά την περίοδο Ιουνίου-Σεπτεμβρίου');
  }

  // Check minimum gap between leaves
  if (employeeData.lastLeaveDate) {
    const lastLeave = new Date(employeeData.lastLeaveDate);
    const daysSinceLastLeave = Math.ceil((start.getTime() - lastLeave.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysSinceLastLeave < 30) {
      warnings.push('Η προηγούμενη άδεια έληξε πριν από λιγότερο από 30 ημέρες');
    }
  }

  // Check for weekend optimization
  const startDay = start.getDay();
  const endDay = end.getDay();
  
  if (startDay !== 1 && startDay !== 0) { // Not starting on Monday or Sunday
    suggestions.push('Εξετάστε να ξεκινήσετε την άδεια τη Δευτέρα για βελτιστοποίηση');
  }
  
  if (endDay !== 5 && endDay !== 6) { // Not ending on Friday or Saturday
    suggestions.push('Εξετάστε να τελειώσετε την άδεια την Παρασκευή για βελτιστοποίηση');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    suggestions
  };
}

/**
 * Get all leave types and entitlements for UI
 */
export function getLeaveTypesAndEntitlements(): {
  annualLeave: typeof ANNUAL_LEAVE_ENTITLEMENTS;
  sickLeave: typeof SICK_LEAVE_ENTITLEMENTS;
  parentalLeave: typeof PARENTAL_LEAVE_ENTITLEMENTS;
  specialLeave: typeof SPECIAL_LEAVE_TYPES;
  unpaidLeave: typeof UNPAID_LEAVE_TYPES;
} {
  return {
    annualLeave: ANNUAL_LEAVE_ENTITLEMENTS,
    sickLeave: SICK_LEAVE_ENTITLEMENTS,
    parentalLeave: PARENTAL_LEAVE_ENTITLEMENTS,
    specialLeave: SPECIAL_LEAVE_TYPES,
    unpaidLeave: UNPAID_LEAVE_TYPES
  };
}

/**
 * Calculate total leave days for a specific period
 */
export function calculateLeaveDays(startDate: string, endDate: string, excludeWeekends: boolean = true): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    
    if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue; // Skip weekends
    }
    
    totalDays++;
  }
  
  return totalDays;
}

/**
 * Check for leave conflicts and overlaps
 */
export function checkLeaveConflicts(
  newLeaveStart: string,
  newLeaveEnd: string,
  existingLeaves: Array<{
    startDate: string;
    endDate: string;
    type: string;
    status: string;
  }>
): {
  hasConflicts: boolean;
  conflicts: Array<{
    type: string;
    startDate: string;
    endDate: string;
    overlapDays: number;
  }>;
} {
  const newStart = new Date(newLeaveStart);
  const newEnd = new Date(newLeaveEnd);
  const conflicts = [];

  for (const leave of existingLeaves) {
    if (leave.status === 'cancelled' || leave.status === 'rejected') {
      continue;
    }

    const existingStart = new Date(leave.startDate);
    const existingEnd = new Date(leave.endDate);

    // Check for overlap
    if (newStart <= existingEnd && newEnd >= existingStart) {
      const overlapStart = new Date(Math.max(newStart.getTime(), existingStart.getTime()));
      const overlapEnd = new Date(Math.min(newEnd.getTime(), existingEnd.getTime()));
      const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;

      conflicts.push({
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
        overlapDays
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}