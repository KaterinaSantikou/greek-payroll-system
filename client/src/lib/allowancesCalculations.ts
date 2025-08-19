/**
 * Special Allowances & Bonuses System
 * Greek Labor Law Compliant Allowances and Holiday Bonuses
 */

// Greek Holiday Bonuses - Required by Law
export const GREEK_HOLIDAY_BONUSES = {
  CHRISTMAS: {
    code: 'christmas-bonus',
    name: 'Δώρο Χριστουγέννων',
    description: 'Υποχρεωτικό δώρο Χριστουγέννων (25 ημέρες μισθού)',
    rate: 25 / 30, // 25 days salary / 30 days month
    paymentMonth: 12,
    minimumServiceMonths: 3, // Must work 3 months to qualify
    proRated: true,
    mandatory: true,
    taxable: true
  },
  EASTER: {
    code: 'easter-bonus',
    name: 'Δώρο Πάσχα',
    description: 'Υποχρεωτικό δώρο Πάσχα (15 ημέρες μισθού)',
    rate: 15 / 30, // 15 days salary / 30 days month
    paymentMonth: 4, // April (varies by Orthodox Easter)
    minimumServiceMonths: 2, // Must work 2 months to qualify
    proRated: true,
    mandatory: true,
    taxable: true
  },
  VACATION: {
    code: 'vacation-bonus',
    name: 'Επίδομα Αδείας',
    description: 'Επίδομα αδείας (15 ημέρες μισθού)',
    rate: 15 / 30, // 15 days salary / 30 days month
    paymentMonth: 'before_vacation', // Paid before taking vacation
    minimumServiceMonths: 1,
    proRated: true,
    mandatory: true,
    taxable: true
  }
};

// Regular Allowances
export const REGULAR_ALLOWANCES = {
  TRANSPORT: {
    code: 'transport-allowance',
    name: 'Επίδομα Μεταφοράς',
    description: 'Επίδομα για μεταφορικά έξοδα',
    types: {
      PUBLIC_TRANSPORT: { name: 'Δημόσια Μέσα', maxMonthly: 120, taxExempt: 120 },
      COMPANY_CAR: { name: 'Εταιρικό Αυτοκίνητο', calculation: 'benefit_in_kind' },
      MILEAGE: { name: 'Χιλιομετρικό Επίδομα', ratePerKm: 0.20, maxMonthly: 300 },
      FUEL_ALLOWANCE: { name: 'Επίδομα Καυσίμων', maxMonthly: 200, taxExempt: 150 }
    },
    mandatory: false,
    taxable: true,
    socialSecurityExempt: false
  },
  
  FOOD: {
    code: 'food-allowance',
    name: 'Επίδομα Διατροφής',
    description: 'Επίδομα για φαγητό ή εστιατόριο',
    types: {
      MEAL_VOUCHERS: { name: 'Κουπόνια Φαγητού', maxDaily: 12, taxExempt: 12 },
      CASH_ALLOWANCE: { name: 'Μετρητά Διατροφής', maxDaily: 10, taxExempt: 8 },
      COMPANY_CANTEEN: { name: 'Εταιρικό Εστιατόριο', calculation: 'subsidized_rate' }
    },
    mandatory: false,
    taxable: true,
    socialSecurityExempt: true, // Up to limits
    maxTaxExemptMonthly: 250
  },
  
  UNIFORM: {
    code: 'uniform-allowance',
    name: 'Επίδομα Ενδυμασίας',
    description: 'Επίδομα για στολή ή ειδικά ρούχα εργασίας',
    types: {
      ANNUAL_CASH: { name: 'Ετήσιο Μετρητών', maxAnnual: 500, taxExempt: 500 },
      COMPANY_PROVIDED: { name: 'Εταιρική Παροχή', calculation: 'actual_cost' },
      MAINTENANCE: { name: 'Συντήρηση Στολής', maxMonthly: 50, taxExempt: 50 }
    },
    mandatory: false,
    taxable: false, // Usually tax exempt
    socialSecurityExempt: true
  },
  
  EDUCATION: {
    code: 'education-allowance',
    name: 'Επίδομα Εκπαίδευσης',
    description: 'Επίδομα για εκπαίδευση και πιστοποιήσεις',
    types: {
      TRAINING_COURSES: { name: 'Σεμινάρια/Κουρς', maxAnnual: 2000, taxExempt: 2000 },
      CERTIFICATION: { name: 'Πιστοποιήσεις', maxAnnual: 1500, taxExempt: 1500 },
      LANGUAGE_COURSES: { name: 'Ξένες Γλώσσες', maxAnnual: 1000, taxExempt: 1000 },
      HIGHER_EDUCATION: { name: 'Τριτοβάθμια Εκπαίδευση', maxAnnual: 5000, taxExempt: 3000 }
    },
    mandatory: false,
    taxable: true,
    socialSecurityExempt: true,
    requiresApproval: true
  },
  
  POSITION: {
    code: 'position-allowance',
    name: 'Επίδομα Θέσης',
    description: 'Επίδομα για ειδική θέση ή αρμοδιότητες',
    types: {
      MANAGEMENT: { name: 'Διοικητικό', percentage: 0.15, description: 'Επίδομα διοικητικής θέσης' },
      SUPERVISOR: { name: 'Επιβλεπτικό', percentage: 0.10, description: 'Επίδομα επίβλεψης' },
      SPECIALIST: { name: 'Ειδικότητας', percentage: 0.08, description: 'Επίδομα ειδικής ειδικότητας' },
      RESPONSIBILITY: { name: 'Ευθύνης', percentage: 0.12, description: 'Επίδομα ειδικής ευθύνης' },
      BILINGUAL: { name: 'Δίγλωσσο', fixedAmount: 150, description: 'Επίδομα ξένης γλώσσας' }
    },
    mandatory: false,
    taxable: true,
    socialSecuritySubject: true
  }
};

// Industry-Specific Allowances
export const INDUSTRY_ALLOWANCES = {
  BANKING: {
    code: 'banking-allowances',
    name: 'Τραπεζικά Επιδόματα',
    allowances: {
      CASH_HANDLING: { name: 'Χειρισμός Μετρητών', fixedAmount: 200, description: 'Επίδομα χειρισμού χρημάτων' },
      BRANCH_MANAGER: { name: 'Διευθυντής Καταστήματος', percentage: 0.20, description: 'Επίδομα διεύθυνσης' },
      SALES_TARGET: { name: 'Στόχων Πωλήσεων', calculation: 'performance_based', description: 'Επίδομα επίτευξης στόχων' }
    }
  },
  
  TOURISM: {
    code: 'tourism-allowances',
    name: 'Τουριστικά Επιδόματα',
    allowances: {
      SEASONAL: { name: 'Εποχιακό', percentage: 0.15, description: 'Επίδομα εποχιακής εργασίας' },
      LANGUAGE: { name: 'Ξένων Γλωσσών', fixedAmount: 100, description: 'Επίδομα ξένης γλώσσας' },
      CUSTOMER_SERVICE: { name: 'Εξυπηρέτησης', fixedAmount: 80, description: 'Επίδομα εξυπηρέτησης πελατών' }
    }
  },
  
  CONSTRUCTION: {
    code: 'construction-allowances',
    name: 'Οικοδομικά Επιδόματα',
    allowances: {
      DANGEROUS_WORK: { name: 'Επικίνδυνης Εργασίας', percentage: 0.20, description: 'Επίδομα επικινδυνότητας' },
      HEIGHT_WORK: { name: 'Εργασίας σε Ύψος', percentage: 0.25, description: 'Επίδομα εργασίας σε ύψος' },
      HEAVY_MACHINERY: { name: 'Βαρέων Μηχανημάτων', fixedAmount: 150, description: 'Επίδομα χειρισμού μηχανημάτων' }
    }
  },
  
  HEALTHCARE: {
    code: 'healthcare-allowances',
    name: 'Υγειονομικά Επιδόματα',
    allowances: {
      NIGHT_SHIFT: { name: 'Νυχτερινής Βάρδιας', percentage: 0.25, description: 'Επίδομα νυχτερινής εργασίας' },
      INFECTION_RISK: { name: 'Κινδύνου Μόλυνσης', percentage: 0.15, description: 'Επίδομα κινδύνου μόλυνσης' },
      SPECIALIST_MEDICAL: { name: 'Ιατρικής Ειδικότητας', fixedAmount: 300, description: 'Επίδομα ιατρικής ειδικότητας' }
    }
  },
  
  COMMERCE: {
    code: 'commerce-allowances',
    name: 'Εμπορικά Επιδόματα',
    allowances: {
      SALES_COMMISSION: { name: 'Προμήθεια Πωλήσεων', calculation: 'commission_based', description: 'Προμήθεια επί των πωλήσεων' },
      CASHIER: { name: 'Ταμείου', fixedAmount: 100, description: 'Επίδομα ταμείου' },
      INVENTORY: { name: 'Αποθήκης', fixedAmount: 80, description: 'Επίδομα διαχείρισης αποθήκης' }
    }
  }
};

// Family Allowances (as per Collective Agreements)
export const FAMILY_ALLOWANCES = {
  MARRIAGE: {
    code: 'marriage-allowance',
    name: 'Επίδομα Γάμου',
    description: 'Επίδομα για παντρεμένους εργαζόμενους',
    amount: 50, // Monthly amount varies by collective agreement
    taxable: false,
    socialSecurityExempt: true,
    requiresDocumentation: true
  },
  
  CHILDREN: {
    code: 'children-allowance',
    name: 'Επίδομα Τέκνων',
    description: 'Επίδομα ανά τέκνο',
    rates: {
      FIRST_CHILD: { amount: 40, description: 'Πρώτο τέκνο' },
      SECOND_CHILD: { amount: 60, description: 'Δεύτερο τέκνο' },
      THIRD_CHILD: { amount: 80, description: 'Τρίτο τέκνο' },
      ADDITIONAL: { amount: 100, description: 'Κάθε επιπλέον τέκνο' }
    },
    maxAge: 18, // Up to 18 years old (or 23 if studying)
    maxAgeStudying: 23,
    taxable: false,
    socialSecurityExempt: true,
    requiresDocumentation: true
  }
};

/**
 * Calculate holiday bonuses based on service period and salary
 */
export function calculateHolidayBonus(
  bonusType: keyof typeof GREEK_HOLIDAY_BONUSES,
  monthlySalary: number,
  serviceMonths: number,
  workingDaysInPeriod: number = 25 // Standard working days per month
): {
  grossAmount: number;
  proRatedAmount: number;
  isEligible: boolean;
  taxable: boolean;
  description: string;
} {
  const bonus = GREEK_HOLIDAY_BONUSES[bonusType];
  
  const isEligible = serviceMonths >= bonus.minimumServiceMonths;
  
  if (!isEligible) {
    return {
      grossAmount: 0,
      proRatedAmount: 0,
      isEligible: false,
      taxable: bonus.taxable,
      description: `Δεν πληροί τις προϋποθέσεις (απαιτούνται ${bonus.minimumServiceMonths} μήνες υπηρεσίας)`
    };
  }
  
  const grossAmount = monthlySalary * bonus.rate;
  
  // Pro-rate if less than full year service
  let proRatedAmount = grossAmount;
  if (bonus.proRated && serviceMonths < 12) {
    proRatedAmount = grossAmount * (serviceMonths / 12);
  }
  
  return {
    grossAmount,
    proRatedAmount,
    isEligible: true,
    taxable: bonus.taxable,
    description: bonus.description
  };
}

/**
 * Calculate regular allowances
 */
export function calculateRegularAllowance(
  allowanceType: keyof typeof REGULAR_ALLOWANCES,
  subType: string,
  baseSalary: number,
  specificAmount?: number
): {
  monthlyAmount: number;
  taxable: boolean;
  socialSecuritySubject: boolean;
  description: string;
} {
  const allowance = REGULAR_ALLOWANCES[allowanceType];
  const subTypeConfig = allowance.types[subType as keyof typeof allowance.types] as any;
  
  if (!subTypeConfig) {
    throw new Error(`Invalid subtype ${subType} for allowance ${allowanceType}`);
  }
  
  let monthlyAmount = 0;
  
  // Calculate amount based on type
  if (subTypeConfig.percentage) {
    monthlyAmount = baseSalary * subTypeConfig.percentage;
  } else if (subTypeConfig.fixedAmount) {
    monthlyAmount = subTypeConfig.fixedAmount;
  } else if (subTypeConfig.maxMonthly) {
    monthlyAmount = specificAmount || subTypeConfig.maxMonthly;
  } else if (subTypeConfig.maxDaily) {
    monthlyAmount = (specificAmount || subTypeConfig.maxDaily) * 25; // 25 working days
  }
  
  return {
    monthlyAmount,
    taxable: allowance.taxable,
    socialSecuritySubject: (allowance as any).socialSecuritySubject || false,
    description: subTypeConfig.name
  };
}

/**
 * Calculate industry-specific allowances
 */
export function calculateIndustryAllowance(
  industry: keyof typeof INDUSTRY_ALLOWANCES,
  allowanceCode: string,
  baseSalary: number,
  performanceData?: any
): {
  monthlyAmount: number;
  taxable: boolean;
  description: string;
} {
  const industryConfig = INDUSTRY_ALLOWANCES[industry];
  const allowanceConfig = industryConfig.allowances[allowanceCode as keyof typeof industryConfig.allowances] as any;
  
  if (!allowanceConfig) {
    throw new Error(`Invalid allowance ${allowanceCode} for industry ${industry}`);
  }
  
  let monthlyAmount = 0;
  
  if (allowanceConfig.percentage) {
    monthlyAmount = baseSalary * allowanceConfig.percentage;
  } else if (allowanceConfig.fixedAmount) {
    monthlyAmount = allowanceConfig.fixedAmount;
  } else if (allowanceConfig.calculation === 'performance_based' && performanceData) {
    // Performance-based calculation (varies by implementation)
    monthlyAmount = performanceData.achievementRate * baseSalary * 0.1; // Example
  } else if (allowanceConfig.calculation === 'commission_based' && performanceData) {
    // Commission-based calculation
    monthlyAmount = performanceData.salesAmount * (performanceData.commissionRate || 0.02);
  }
  
  return {
    monthlyAmount,
    taxable: true, // Most industry allowances are taxable
    description: allowanceConfig.description
  };
}

/**
 * Calculate family allowances
 */
export function calculateFamilyAllowances(
  isMarried: boolean,
  numberOfChildren: number,
  childrenAges: number[]
): {
  marriageAllowance: number;
  childrenAllowance: number;
  totalFamilyAllowance: number;
  breakdown: Array<{ type: string; amount: number; description: string }>;
} {
  const breakdown = [];
  let marriageAllowance = 0;
  let childrenAllowance = 0;
  
  // Marriage allowance
  if (isMarried) {
    marriageAllowance = FAMILY_ALLOWANCES.MARRIAGE.amount;
    breakdown.push({
      type: 'marriage',
      amount: marriageAllowance,
      description: FAMILY_ALLOWANCES.MARRIAGE.description
    });
  }
  
  // Children allowances
  const eligibleChildren = childrenAges.filter(age => 
    age <= FAMILY_ALLOWANCES.CHILDREN.maxAge || 
    (age <= FAMILY_ALLOWANCES.CHILDREN.maxAgeStudying) // Assuming studying
  );
  
  eligibleChildren.forEach((age, index) => {
    let childAmount = 0;
    let description = '';
    
    switch (index) {
      case 0:
        childAmount = FAMILY_ALLOWANCES.CHILDREN.rates.FIRST_CHILD.amount;
        description = FAMILY_ALLOWANCES.CHILDREN.rates.FIRST_CHILD.description;
        break;
      case 1:
        childAmount = FAMILY_ALLOWANCES.CHILDREN.rates.SECOND_CHILD.amount;
        description = FAMILY_ALLOWANCES.CHILDREN.rates.SECOND_CHILD.description;
        break;
      case 2:
        childAmount = FAMILY_ALLOWANCES.CHILDREN.rates.THIRD_CHILD.amount;
        description = FAMILY_ALLOWANCES.CHILDREN.rates.THIRD_CHILD.description;
        break;
      default:
        childAmount = FAMILY_ALLOWANCES.CHILDREN.rates.ADDITIONAL.amount;
        description = FAMILY_ALLOWANCES.CHILDREN.rates.ADDITIONAL.description;
        break;
    }
    
    childrenAllowance += childAmount;
    breakdown.push({
      type: 'child',
      amount: childAmount,
      description: `${description} (${age} ετών)`
    });
  });
  
  return {
    marriageAllowance,
    childrenAllowance,
    totalFamilyAllowance: marriageAllowance + childrenAllowance,
    breakdown
  };
}

/**
 * Get all available allowances for UI selection
 */
export function getAllowanceOptions(): Array<{
  category: string;
  value: string;
  label: string;
  description: string;
  mandatory: boolean;
}> {
  const options: Array<{
    category: string;
    value: string;
    label: string;
    description: string;
    mandatory: boolean;
  }> = [];
  
  // Holiday bonuses
  Object.entries(GREEK_HOLIDAY_BONUSES).forEach(([key, bonus]) => {
    options.push({
      category: 'holiday',
      value: key,
      label: bonus.name,
      description: bonus.description,
      mandatory: bonus.mandatory
    });
  });
  
  // Regular allowances
  Object.entries(REGULAR_ALLOWANCES).forEach(([key, allowance]) => {
    Object.entries(allowance.types).forEach(([subKey, subType]) => {
      options.push({
        category: 'regular',
        value: `${key}.${subKey}`,
        label: `${allowance.name} - ${subType.name}`,
        description: allowance.description,
        mandatory: allowance.mandatory
      });
    });
  });
  
  // Industry allowances
  Object.entries(INDUSTRY_ALLOWANCES).forEach(([industry, config]) => {
    Object.entries(config.allowances).forEach(([key, allowance]) => {
      options.push({
        category: 'industry',
        value: `${industry}.${key}`,
        label: `${config.name} - ${allowance.name}`,
        description: allowance.description,
        mandatory: false
      });
    });
  });
  
  // Family allowances
  Object.entries(FAMILY_ALLOWANCES).forEach(([key, allowance]) => {
    options.push({
      category: 'family',
      value: key,
      label: allowance.name,
      description: allowance.description,
      mandatory: false
    });
  });
  
  return options;
}

/**
 * Calculate total allowances for an employee
 */
export function calculateTotalAllowances(
  baseSalary: number,
  selectedAllowances: Array<{
    type: string;
    subType?: string;
    amount?: number;
    performanceData?: any;
  }>,
  employeeData: {
    serviceMonths: number;
    isMarried: boolean;
    numberOfChildren: number;
    childrenAges: number[];
    industry?: string;
  }
): {
  totalMonthlyAllowances: number;
  totalAnnualBonuses: number;
  breakdown: Array<{
    category: string;
    type: string;
    amount: number;
    taxable: boolean;
    description: string;
  }>;
  holidayBonuses: Array<{
    type: string;
    amount: number;
    month: number | string;
    description: string;
  }>;
} {
  const breakdown: Array<{
    category: string;
    type: string;
    amount: number;
    taxable: boolean;
    description: string;
  }> = [];
  const holidayBonuses: Array<{
    type: string;
    amount: number;
    month: number | string;
    description: string;
  }> = [];
  let totalMonthlyAllowances = 0;
  let totalAnnualBonuses = 0;
  
  // Process selected allowances
  selectedAllowances.forEach(allowance => {
    const [mainType, subType] = allowance.type.split('.');
    
    if (GREEK_HOLIDAY_BONUSES[mainType as keyof typeof GREEK_HOLIDAY_BONUSES]) {
      // Holiday bonus
      const bonus = calculateHolidayBonus(
        mainType as keyof typeof GREEK_HOLIDAY_BONUSES,
        baseSalary,
        employeeData.serviceMonths
      );
      
      if (bonus.isEligible) {
        totalAnnualBonuses += bonus.proRatedAmount;
        holidayBonuses.push({
          type: mainType,
          amount: bonus.proRatedAmount,
          month: GREEK_HOLIDAY_BONUSES[mainType as keyof typeof GREEK_HOLIDAY_BONUSES].paymentMonth,
          description: bonus.description
        });
      }
    } else if (REGULAR_ALLOWANCES[mainType as keyof typeof REGULAR_ALLOWANCES]) {
      // Regular allowance
      const allowanceCalc = calculateRegularAllowance(
        mainType as keyof typeof REGULAR_ALLOWANCES,
        subType || '',
        baseSalary,
        allowance.amount
      );
      
      totalMonthlyAllowances += allowanceCalc.monthlyAmount;
      breakdown.push({
        category: 'regular',
        type: allowance.type,
        amount: allowanceCalc.monthlyAmount,
        taxable: allowanceCalc.taxable,
        description: allowanceCalc.description
      });
    } else if (employeeData.industry && INDUSTRY_ALLOWANCES[employeeData.industry as keyof typeof INDUSTRY_ALLOWANCES]) {
      // Industry allowance
      const industryCalc = calculateIndustryAllowance(
        employeeData.industry as keyof typeof INDUSTRY_ALLOWANCES,
        subType || '',
        baseSalary,
        allowance.performanceData
      );
      
      totalMonthlyAllowances += industryCalc.monthlyAmount;
      breakdown.push({
        category: 'industry',
        type: allowance.type,
        amount: industryCalc.monthlyAmount,
        taxable: industryCalc.taxable,
        description: industryCalc.description
      });
    }
  });
  
  // Add family allowances
  const familyAllowances = calculateFamilyAllowances(
    employeeData.isMarried,
    employeeData.numberOfChildren,
    employeeData.childrenAges
  );
  
  totalMonthlyAllowances += familyAllowances.totalFamilyAllowance;
  familyAllowances.breakdown.forEach(item => {
    breakdown.push({
      category: 'family',
      type: item.type,
      amount: item.amount,
      taxable: false,
      description: item.description
    });
  });
  
  return {
    totalMonthlyAllowances,
    totalAnnualBonuses,
    breakdown,
    holidayBonuses
  };
}