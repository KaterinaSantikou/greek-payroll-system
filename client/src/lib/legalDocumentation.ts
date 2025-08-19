/**
 * Legal Documentation System
 * Greek Labor Law Compliance and Legal Document Management
 */

// Required Legal Documents for Greek Employment
export const REQUIRED_LEGAL_DOCUMENTS = {
  EMPLOYEE_DOCUMENTS: {
    category: 'employee-documents',
    name: 'Έγγραφα Εργαζομένου',
    description: 'Απαραίτητα έγγραφα για κάθε εργαζόμενο',
    documents: [
      {
        code: 'identity-card',
        name: 'Αστυνομική Ταυτότητα',
        description: 'Φωτοαντίγραφο αστυνομικής ταυτότητας',
        mandatory: true,
        expiryTracking: true,
        renewalNotice: 30, // Days before expiry
        digitalCopy: true,
        originalRequired: false
      },
      {
        code: 'afm-certificate',
        name: 'Βεβαίωση ΑΦΜ',
        description: 'Βεβαίωση Αριθμού Φορολογικού Μητρώου',
        mandatory: true,
        expiryTracking: false,
        validityCheck: 'afm_algorithm',
        digitalCopy: true,
        originalRequired: false
      },
      {
        code: 'amka-certificate',
        name: 'Βεβαίωση ΑΜΚΑ',
        description: 'Αριθμός Μητρώου Κοινωνικής Ασφάλισης',
        mandatory: true,
        expiryTracking: false,
        validityCheck: 'luhn_algorithm',
        digitalCopy: true,
        originalRequired: false
      },
      {
        code: 'iban-certificate',
        name: 'Βεβαίωση IBAN',
        description: 'Τραπεζικός λογαριασμός για μισθοδοσία',
        mandatory: true,
        expiryTracking: false,
        validityCheck: 'iban_format',
        digitalCopy: true,
        originalRequired: false
      },
      {
        code: 'education-certificates',
        name: 'Πιστοποιητικά Εκπαίδευσης',
        description: 'Τίτλοι σπουδών και επαγγελματικά πιστοποιητικά',
        mandatory: false,
        expiryTracking: false,
        positionDependent: true,
        digitalCopy: true,
        originalRequired: false
      }
    ]
  },

  HEALTH_SAFETY_DOCUMENTS: {
    category: 'health-safety',
    name: 'Υγεία & Ασφάλεια',
    description: 'Έγγραφα υγείας και ασφάλειας εργασίας',
    documents: [
      {
        code: 'medical-certificate',
        name: 'Ιατρική Εξέταση',
        description: 'Πιστοποιητικό υγείας για εργασία',
        mandatory: true,
        expiryTracking: true,
        renewalPeriod: 365, // Annual renewal
        renewalNotice: 30,
        positionDependent: true,
        specialRequirements: ['night_shift', 'hazardous_work', 'food_handling']
      },
      {
        code: 'safety-training',
        name: 'Εκπαίδευση Ασφαλείας',
        description: 'Πιστοποιητικό εκπαίδευσης ασφάλειας εργασίας',
        mandatory: true,
        expiryTracking: true,
        renewalPeriod: 1095, // 3 years
        renewalNotice: 60,
        digitalCopy: true
      },
      {
        code: 'occupational-health',
        name: 'Ιατρός Εργασίας',
        description: 'Εξέταση από ιατρό εργασίας',
        mandatory: true,
        expiryTracking: true,
        renewalPeriod: 365, // Annual
        renewalNotice: 30,
        companySize: '>50_employees'
      },
      {
        code: 'health-safety-coordinator',
        name: 'Συντονιστής Υγείας & Ασφάλειας',
        description: 'Διορισμός συντονιστή για μεγάλα έργα κατασκευών',
        mandatory: true,
        applicableTo: ['construction_projects'],
        projectSize: 'large_construction',
        qualificationRequired: true,
        certificationTracking: true,
        digitalCopy: true,
        lawReference: '2025_health_safety_expansion'
      },
      {
        code: 'first-aid-training',
        name: 'Εκπαίδευση Πρώτων Βοηθειών',
        description: 'Υποχρεωτική εκπαίδευση σε βασικές διαδικασίες έκτακτης ανάγκης',
        mandatory: true,
        trainingContent: ['cpr', 'heimlich_maneuver', 'basic_emergency_procedures'],
        expiryTracking: true,
        renewalPeriod: 730, // 2 years
        renewalNotice: 60,
        allEmployees: true,
        certificationRequired: true,
        digitalCopy: true,
        lawReference: '2025_first_aid_requirements'
      },
      {
        code: 'digital-work-card-protection',
        name: 'Προστασία Ψηφιακής Κάρτας Εργασίας',
        description: 'Δήλωση προστασίας κατά μείωσης μισθού λόγω ψηφιακής κάρτας',
        mandatory: true,
        protectionType: 'salary_reduction_prohibition',
        digitalImplementation: true,
        complianceCheck: 'automatic',
        employeeRights: ['salary_protection', 'no_reduction_due_to_digital_card'],
        lawReference: '2025_digital_work_card_protection'
      }
    ]
  },

  FOREIGN_WORKER_DOCUMENTS: {
    category: 'foreign-workers',
    name: 'Αλλοδαποί Εργαζόμενοι',
    description: 'Έγγραφα για εργαζομένους εκτός ΕΕ',
    documents: [
      {
        code: 'passport',
        name: 'Διαβατήριο',
        description: 'Έγκυρο διαβατήριο',
        mandatory: true,
        expiryTracking: true,
        renewalNotice: 90,
        applicableTo: ['non_eu_citizens'],
        digitalCopy: true,
        originalRequired: true
      },
      {
        code: 'work-permit',
        name: 'Άδεια Εργασίας',
        description: 'Άδεια εργασίας για μη-ΕΕ πολίτες',
        mandatory: true,
        expiryTracking: true,
        renewalNotice: 90,
        applicableTo: ['non_eu_citizens'],
        renewalProcess: 'ministry_labor',
        digitalCopy: true,
        originalRequired: true
      },
      {
        code: 'residence-permit',
        name: 'Άδεια Διαμονής',
        description: 'Άδεια διαμονής στην Ελλάδα',
        mandatory: true,
        expiryTracking: true,
        renewalNotice: 90,
        applicableTo: ['non_eu_citizens'],
        digitalCopy: true,
        originalRequired: true
      },
      {
        code: 'eu-registration',
        name: 'Βεβαίωση ΕΕ',
        description: 'Βεβαίωση εγγραφής πολίτη ΕΕ',
        mandatory: true,
        expiryTracking: false,
        applicableTo: ['eu_citizens'],
        digitalCopy: true,
        originalRequired: false
      }
    ]
  },

  EFKA_INSURANCE_DOCUMENTS: {
    category: 'efka-insurance',
    name: 'ΕΦΚΑ & Ασφάλιση',
    description: 'Έγγραφα ασφάλισης και ΕΦΚΑ',
    documents: [
      {
        code: 'efka-registration',
        name: 'Δήλωση ΕΦΚΑ',
        description: 'Δήλωση εργαζομένου στον ΕΦΚΑ',
        mandatory: true,
        deadline: 8, // 8 days from employment start
        responsibleParty: 'employer',
        digitalSubmission: true,
        systemIntegration: 'efka_api'
      },
      {
        code: 'insurance-history',
        name: 'Ασφαλιστικό Ιστορικό',
        description: 'Ιστορικό ασφάλισης από προηγούμενους εργοδότες',
        mandatory: false,
        usefulFor: ['pension_calculation', 'benefits_determination'],
        digitalCopy: true
      },
      {
        code: 'auxiliary-insurance',
        name: 'Επικουρική Ασφάλιση',
        description: 'Στοιχεία επικουρικής ασφάλισης',
        mandatory: false,
        positionDependent: true,
        digitalCopy: true
      }
    ]
  },

  MILITARY_SERVICE_DOCUMENTS: {
    category: 'military-service',
    name: 'Στρατιωτικές Υποχρεώσεις',
    description: 'Έγγραφα στρατιωτικής θητείας',
    applicableTo: ['greek_male_citizens'],
    documents: [
      {
        code: 'military-certificate',
        name: 'Πιστοποιητικό Στρατολογίας',
        description: 'Πιστοποιητικό εκπλήρωσης στρατιωτικών υποχρεώσεων',
        mandatory: true,
        ageRequirement: '>18',
        exemptions: ['medical', 'educational_deferment', 'alternative_service'],
        digitalCopy: true,
        originalRequired: false
      },
      {
        code: 'deferment-certificate',
        name: 'Αναβολή Στρατολογίας',
        description: 'Αναβολή για σπουδές ή οικογενειακούς λόγους',
        mandatory: false,
        expiryTracking: true,
        temporaryDocument: true,
        digitalCopy: true
      }
    ]
  }
};

// Legal Restrictions and Compliance Requirements
export const LEGAL_RESTRICTIONS = {
  AGE_RESTRICTIONS: {
    category: 'age-restrictions',
    name: 'Ηλικιακοί Περιορισμοί',
    restrictions: [
      {
        code: 'minimum-age',
        name: 'Ελάχιστη Ηλικία Εργασίας',
        description: 'Ελάχιστη ηλικία για νόμιμη εργασία',
        minimumAge: 16,
        lightWorkAge: 15, // Light work with restrictions
        hazardousWorkAge: 18,
        nightWorkAge: 18,
        complianceCheck: 'mandatory'
      },
      {
        code: 'young-worker-protections',
        name: 'Προστασία Νεαρών Εργαζομένων',
        description: 'Ειδικές προστασίες για εργαζομένους κάτω των 18',
        ageLimit: 18,
        restrictions: [
          'no_night_work',
          'no_overtime',
          'no_hazardous_work',
          'medical_checkups_required',
          'education_time_protected'
        ],
        maxDailyHours: 7,
        maxWeeklyHours: 35
      }
    ]
  },

  WORKING_TIME_RESTRICTIONS: {
    category: 'working-time',
    name: 'Περιορισμοί Ωραρίου',
    restrictions: [
      {
        code: 'maximum-daily-hours',
        name: 'Μέγιστες Ημερήσιες Ώρες',
        description: 'Μέγιστο όριο ημερήσιων ωρών εργασίας',
        standardHours: 8,
        maximumHours: 10, // Including overtime
        emergencyHours: 12, // In emergency situations
        restPeriods: {
          minimum: 11, // 11 hours rest between shifts
          weekly: 24 // 24 consecutive hours per week
        }
      },
      {
        code: 'weekly-limits',
        name: 'Εβδομαδιαία Όρια',
        description: 'Μέγιστες εβδομαδιαίες ώρες εργασίας',
        standardHours: 40,
        maximumHours: 48, // EU Working Time Directive
        averagingPeriod: 120, // Days for calculating average
        exceptions: ['seasonal_work', 'essential_services']
      }
    ]
  },

  HEALTH_SAFETY_RESTRICTIONS: {
    category: 'health-safety',
    name: 'Περιορισμοί Υγείας & Ασφάλειας',
    restrictions: [
      {
        code: 'pregnant-workers',
        name: 'Έγκυες Εργαζόμενες',
        description: 'Περιορισμοί για έγκυες εργαζομένες',
        prohibitedActivities: [
          'heavy_lifting',
          'toxic_substances',
          'radiation_exposure',
          'night_work',
          'overtime'
        ],
        medicalCertificateRequired: true,
        riskAssessmentRequired: true
      },
      {
        code: 'hazardous-work',
        name: 'Επικίνδυνη Εργασία',
        description: 'Περιορισμοί για επικίνδυνες εργασίες',
        minimumAge: 18,
        specialTrainingRequired: true,
        medicalClearanceRequired: true,
        periodicHealthChecks: true,
        maxDailyHours: 6,
        categories: ['chemical', 'nuclear', 'height_work', 'mining']
      },
      {
        code: 'construction-safety-coordinator',
        name: 'Συντονιστής Ασφάλειας Κατασκευών',
        description: 'Υποχρεωτικός διορισμός συντονιστή για μεγάλα κατασκευαστικά έργα',
        projectTypes: ['large_construction', 'infrastructure', 'high_risk_construction'],
        minimumProjectValue: 500000, // €500,000
        qualificationRequirements: [
          'engineering_degree',
          'safety_certification',
          'construction_experience'
        ],
        responsibilities: [
          'safety_planning',
          'risk_assessment',
          'safety_monitoring',
          'incident_reporting',
          'worker_training_oversight'
        ],
        lawReference: '2025_health_safety_expansion'
      },
      {
        code: 'mandatory-first-aid-training',
        name: 'Υποχρεωτική Εκπαίδευση Πρώτων Βοηθειών',
        description: 'Εκπαίδευση όλων των εργαζομένων σε βασικές διαδικασίες έκτακτης ανάγκης',
        trainingModules: [
          'cpr_certification',
          'heimlich_maneuver',
          'basic_wound_care',
          'emergency_response_procedures',
          'workplace_specific_hazards'
        ],
        trainingFrequency: 730, // Every 2 years
        certificationRequired: true,
        applicableToAllEmployees: true,
        exemptions: ['remote_workers', 'administrative_only'],
        lawReference: '2025_first_aid_requirements'
      },
      {
        code: 'digital-work-card-salary-protection',
        name: 'Προστασία Μισθού από Ψηφιακή Κάρτα Εργασίας',
        description: 'Απαγόρευση μείωσης μισθών εξαιτίας της εισαγωγής ψηφιακής κάρτας εργασίας',
        protectionScope: [
          'salary_reduction_prohibition',
          'benefit_reduction_prohibition',
          'working_conditions_protection'
        ],
        enforcementMechanism: 'automatic_system_check',
        penaltiesForViolation: [
          'administrative_fines',
          'labor_court_action',
          'compensation_orders'
        ],
        reportingMechanism: 'digital_platform_integrated',
        lawReference: '2025_digital_work_card_protection'
      }
    ]
  },

  DISABILITY_ACCOMMODATIONS: {
    category: 'disability',
    name: 'Προσαρμογές Αναπηρίας',
    restrictions: [
      {
        code: 'workplace-accommodations',
        name: 'Προσαρμογές Χώρου Εργασίας',
        description: 'Υποχρεωτικές προσαρμογές για άτομα με αναπηρία',
        accommodationTypes: [
          'physical_accessibility',
          'assistive_technology',
          'modified_schedules',
          'job_restructuring'
        ],
        evaluationRequired: true,
        medicalDocumentation: true
      }
    ]
  }
};

// Layoff Notice Periods based on Greek Labor Law
export const LAYOFF_NOTICE_PERIODS = {
  INDIVIDUAL_LAYOFFS: {
    category: 'individual',
    name: 'Ατομικές Απολύσεις',
    description: 'Περίοδοι προειδοποίησης για ατομικές απολύσεις',
    noticePeriods: [
      {
        tenureMonths: 0,
        tenureLimit: 12,
        noticeDays: 0,
        description: 'Δοκιμαστική περίοδος (0-12 μήνες)'
      },
      {
        tenureMonths: 12,
        tenureLimit: 24,
        noticeDays: 30,
        description: '1-2 έτη υπηρεσίας'
      },
      {
        tenureMonths: 24,
        tenureLimit: 60,
        noticeDays: 60,
        description: '2-5 έτη υπηρεσίας'
      },
      {
        tenureMonths: 60,
        tenureLimit: 120,
        noticeDays: 90,
        description: '5-10 έτη υπηρεσίας'
      },
      {
        tenureMonths: 120,
        tenureLimit: 180,
        noticeDays: 120,
        description: '10-15 έτη υπηρεσίας'
      },
      {
        tenureMonths: 180,
        tenureLimit: 240,
        noticeDays: 150,
        description: '15-20 έτη υπηρεσίας'
      },
      {
        tenureMonths: 240,
        tenureLimit: null,
        noticeDays: 180,
        description: '20+ έτη υπηρεσίας'
      }
    ],
    paymentInLieu: true, // Can pay instead of notice
    severancePayRequired: true
  },

  COLLECTIVE_LAYOFFS: {
    category: 'collective',
    name: 'Συλλογικές Απολύσεις',
    description: 'Περίοδοι προειδοποίησης για συλλογικές απολύσεις',
    thresholds: [
      {
        companySize: '20-99',
        layoffThreshold: 6,
        noticePeriod: 45,
        description: 'Μικρές επιχειρήσεις (20-99 εργαζόμενοι)'
      },
      {
        companySize: '100-299',
        layoffThreshold: 10,
        noticePeriod: 45,
        description: 'Μεσαίες επιχειρήσεις (100-299 εργαζόμενοι)'
      },
      {
        companySize: '300+',
        layoffThreshold: 30,
        noticePeriod: 45,
        description: 'Μεγάλες επιχειρήσεις (300+ εργαζόμενοι)'
      }
    ],
    consultationRequired: true,
    laborInspectorateNotification: true,
    unionConsultation: true
  },

  SPECIAL_CATEGORIES: {
    category: 'special',
    name: 'Ειδικές Κατηγορίες',
    description: 'Ειδικές προστασίες για συγκεκριμένες κατηγορίες',
    protectedCategories: [
      {
        category: 'pregnant_workers',
        name: 'Έγκυες Εργαζόμενες',
        protection: 'dismissal_prohibited',
        protectionPeriod: 'pregnancy_plus_18_months',
        exceptions: ['serious_misconduct', 'company_closure']
      },
      {
        category: 'union_representatives',
        name: 'Συνδικαλιστικοί Εκπρόσωποι',
        protection: 'enhanced_protection',
        noticePeriod: 'double_standard',
        approvalRequired: 'labor_inspectorate'
      },
      {
        category: 'disabled_workers',
        name: 'Άτομα με Αναπηρία',
        protection: 'enhanced_protection',
        justificationRequired: true,
        accommodationFirst: true
      }
    ]
  }
};

// Contract Termination Procedures
export const TERMINATION_PROCEDURES = {
  VOLUNTARY_RESIGNATION: {
    category: 'resignation',
    name: 'Οικειοθελής Παραίτηση',
    description: 'Διαδικασίες για οικειοθελή παραίτηση',
    procedures: [
      {
        step: 1,
        action: 'written_notice',
        description: 'Έγγραφη ειδοποίηση παραίτησης',
        timeframe: 'advance_notice_required',
        noticeMinimum: 15, // 15 days minimum notice
        documentRequired: true
      },
      {
        step: 2,
        action: 'handover_duties',
        description: 'Παράδοση καθηκόντων και υλικού',
        timeframe: 'during_notice_period',
        checklistRequired: true
      },
      {
        step: 3,
        action: 'final_settlement',
        description: 'Εκκαθάριση οφειλών και απαιτήσεων',
        timeframe: 'last_working_day',
        includesItems: ['final_salary', 'unused_leave', 'overtime_pay']
      }
    ]
  },

  DISMISSAL_WITH_CAUSE: {
    category: 'dismissal-cause',
    name: 'Απόλυση με Αιτία',
    description: 'Διαδικασίες απόλυσης με βάσιμη αιτία',
    validCauses: [
      'serious_misconduct',
      'repeated_violations',
      'incompetence',
      'breach_of_contract',
      'criminal_activity',
      'unauthorized_absence'
    ],
    procedures: [
      {
        step: 1,
        action: 'investigation',
        description: 'Διερεύνηση περιστατικού',
        timeframe: 'immediate',
        documentationRequired: true
      },
      {
        step: 2,
        action: 'disciplinary_hearing',
        description: 'Πειθαρχική διαδικασία',
        timeframe: 'within_reasonable_time',
        employeeRights: ['representation', 'defense', 'evidence_review']
      },
      {
        step: 3,
        action: 'decision_notification',
        description: 'Κοινοποίηση απόφασης',
        timeframe: 'written_notification',
        noNoticeRequired: true,
        noSeveranceRequired: true
      }
    ]
  },

  DISMISSAL_WITHOUT_CAUSE: {
    category: 'dismissal-no-cause',
    name: 'Απόλυση χωρίς Αιτία',
    description: 'Διαδικασίες απόλυσης χωρίς βάσιμη αιτία',
    procedures: [
      {
        step: 1,
        action: 'notice_period',
        description: 'Τήρηση περιόδου προειδοποίησης',
        timeframe: 'based_on_tenure',
        paymentInLieuOption: true
      },
      {
        step: 2,
        action: 'severance_calculation',
        description: 'Υπολογισμός αποζημίωσης',
        calculation: 'statutory_formula',
        minimumPayment: true
      },
      {
        step: 3,
        action: 'final_documentation',
        description: 'Έκδοση απαραίτητων εγγράφων',
        requiredDocuments: [
          'termination_certificate',
          'employment_reference',
          'efka_notification',
          'tax_certificate'
        ]
      }
    ]
  },

  RETIREMENT: {
    category: 'retirement',
    name: 'Συνταξιοδότηση',
    description: 'Διαδικασίες συνταξιοδότησης',
    types: [
      {
        type: 'normal_retirement',
        name: 'Κανονική Συνταξιοδότηση',
        ageRequirement: 67,
        serviceYears: 15,
        procedures: ['efka_application', 'final_settlement', 'handover']
      },
      {
        type: 'early_retirement',
        name: 'Πρόωρη Συνταξιοδότηση',
        ageRequirement: 62,
        serviceYears: 40,
        penalties: 'reduced_pension',
        procedures: ['special_application', 'medical_evaluation']
      }
    ]
  }
};

/**
 * Calculate layoff notice period based on tenure
 */
export function calculateLayoffNotice(
  startDate: string,
  terminationDate: string,
  layoffType: 'individual' | 'collective' = 'individual'
): {
  tenureMonths: number;
  noticeDays: number;
  description: string;
  paymentInLieuAllowed: boolean;
  severanceRequired: boolean;
} {
  const start = new Date(startDate);
  const end = new Date(terminationDate);
  const tenureMonths = Math.floor((end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000));

  const noticePeriods = LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.noticePeriods;
  
  const applicablePeriod = noticePeriods.find(period => 
    tenureMonths >= period.tenureMonths && 
    (period.tenureLimit === null || tenureMonths < period.tenureLimit)
  );

  return {
    tenureMonths,
    noticeDays: applicablePeriod?.noticeDays || 0,
    description: applicablePeriod?.description || 'Άγνωστη περίοδος',
    paymentInLieuAllowed: LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.paymentInLieu,
    severanceRequired: LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.severancePayRequired
  };
}

/**
 * Check document compliance for an employee
 */
export function checkDocumentCompliance(
  employeeData: {
    nationality: string;
    age: number;
    position: string;
    workType: string;
    hasDisability: boolean;
    gender: string;
  },
  documents: Array<{
    type: string;
    expiryDate?: string;
    status: 'valid' | 'expired' | 'missing';
  }>
): {
  compliance: 'compliant' | 'warnings' | 'non_compliant';
  missingDocuments: string[];
  expiringDocuments: Array<{
    type: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }>;
  violations: string[];
} {
  const missingDocuments: string[] = [];
  const expiringDocuments: Array<{
    type: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }> = [];
  const violations: string[] = [];

  // Check mandatory documents
  const requiredCategories = Object.values(REQUIRED_LEGAL_DOCUMENTS);
  
  for (const category of requiredCategories) {
    for (const doc of category.documents) {
      // Check if document applies to this employee
      if (doc.applicableTo && !doc.applicableTo.includes(getEmployeeCategory(employeeData))) {
        continue;
      }

      const employeeDoc = documents.find(d => d.type === doc.code);
      
      if (doc.mandatory && (!employeeDoc || employeeDoc.status === 'missing')) {
        missingDocuments.push(doc.name);
      }

      if (employeeDoc && doc.expiryTracking && employeeDoc.expiryDate) {
        const expiryDate = new Date(employeeDoc.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysUntilExpiry <= (doc.renewalNotice || 30)) {
          expiringDocuments.push({
            type: doc.name,
            expiryDate: employeeDoc.expiryDate,
            daysUntilExpiry
          });
        }

        if (daysUntilExpiry < 0) {
          violations.push(`Έχει λήξει: ${doc.name}`);
        }
      }
    }
  }

  // Check age restrictions
  if (employeeData.age < 16) {
    violations.push('Παράνομη εργασία - ηλικία κάτω των 16 ετών');
  }

  if (employeeData.age < 18) {
    const restrictions = LEGAL_RESTRICTIONS.AGE_RESTRICTIONS.restrictions[1];
    if (employeeData.workType === 'night_shift') {
      violations.push('Νυχτερινή εργασία απαγορεύεται για ανήλικους');
    }
  }

  let compliance: 'compliant' | 'warnings' | 'non_compliant' = 'compliant';
  
  if (violations.length > 0 || missingDocuments.length > 0) {
    compliance = 'non_compliant';
  } else if (expiringDocuments.length > 0) {
    compliance = 'warnings';
  }

  return {
    compliance,
    missingDocuments,
    expiringDocuments,
    violations
  };
}

/**
 * Get employee category for document requirements
 */
function getEmployeeCategory(employeeData: {
  nationality: string;
  age: number;
  position: string;
  workType: string;
  hasDisability: boolean;
  gender: string;
}): string {
  if (employeeData.nationality === 'greek') {
    return 'greek_citizens';
  } else if (['eu_member'].includes(employeeData.nationality)) {
    return 'eu_citizens';
  } else {
    return 'non_eu_citizens';
  }
}

/**
 * Generate termination checklist
 */
export function generateTerminationChecklist(
  terminationType: 'resignation' | 'dismissal-cause' | 'dismissal-no-cause' | 'retirement',
  employeeData: {
    startDate: string;
    position: string;
    hasAssets: boolean;
    hasPendingProjects: boolean;
  }
): {
  checklist: Array<{
    category: string;
    task: string;
    responsible: string;
    deadline: string;
    completed: boolean;
    priority: 'high' | 'medium' | 'low';
  }>;
  estimatedDays: number;
} {
  const checklist = [];
  let estimatedDays = 1;

  // Get procedures for termination type
  const procedures = TERMINATION_PROCEDURES[terminationType.toUpperCase().replace('-', '_') as keyof typeof TERMINATION_PROCEDURES];
  
  if (procedures && 'procedures' in procedures) {
    for (const procedure of procedures.procedures as any[]) {
      checklist.push({
        category: 'legal',
        task: procedure.description,
        responsible: 'hr',
        deadline: procedure.timeframe,
        completed: false,
        priority: 'high' as const
      });
    }
  }

  // Add common tasks
  checklist.push(
    {
      category: 'assets',
      task: 'Παράδοση εταιρικού εξοπλισμού',
      responsible: 'it',
      deadline: 'last_working_day',
      completed: false,
      priority: 'high' as const
    },
    {
      category: 'access',
      task: 'Ανάκληση προσβάσεων συστημάτων',
      responsible: 'it',
      deadline: 'last_working_day',
      completed: false,
      priority: 'high' as const
    },
    {
      category: 'documentation',
      task: 'Έκδοση πιστοποιητικού εργασίας',
      responsible: 'hr',
      deadline: 'within_5_days',
      completed: false,
      priority: 'medium' as const
    }
  );

  if (employeeData.hasPendingProjects) {
    checklist.push({
      category: 'handover',
      task: 'Παράδοση εκκρεμών έργων',
      responsible: 'manager',
      deadline: 'during_notice',
      completed: false,
      priority: 'high' as const
    });
    estimatedDays += 5;
  }

  return {
    checklist,
    estimatedDays
  };
}

/**
 * Get all legal documentation requirements
 */
export function getLegalDocumentationRequirements(): {
  requiredDocuments: typeof REQUIRED_LEGAL_DOCUMENTS;
  legalRestrictions: typeof LEGAL_RESTRICTIONS;
  layoffNotices: typeof LAYOFF_NOTICE_PERIODS;
  terminationProcedures: typeof TERMINATION_PROCEDURES;
} {
  return {
    requiredDocuments: REQUIRED_LEGAL_DOCUMENTS,
    legalRestrictions: LEGAL_RESTRICTIONS,
    layoffNotices: LAYOFF_NOTICE_PERIODS,
    terminationProcedures: TERMINATION_PROCEDURES
  };
}

/**
 * Check if health and safety coordinator is required for construction project
 */
export function checkHealthSafetyCoordinatorRequirement(
  projectData: {
    type: string;
    value: number;
    riskLevel: 'low' | 'medium' | 'high';
    duration: number; // months
  }
): {
  required: boolean;
  reason: string;
  qualificationRequirements: string[];
  compliance: string;
} {
  const isConstructionProject = projectData.type.toLowerCase().includes('construction') || 
                               projectData.type.toLowerCase().includes('infrastructure');
  
  const isLargeProject = projectData.value >= 500000; // €500,000 threshold
  const isHighRisk = projectData.riskLevel === 'high';
  const isLongTerm = projectData.duration >= 6; // 6+ months

  const required = isConstructionProject && (isLargeProject || isHighRisk || isLongTerm);

  return {
    required,
    reason: required 
      ? `Υποχρεωτικός διορισμός λόγω: ${isLargeProject ? 'μεγάλο έργο (>€500K), ' : ''}${isHighRisk ? 'υψηλός κίνδυνος, ' : ''}${isLongTerm ? 'μακροχρόνιο έργο (6+ μήνες)' : ''}`.trim().replace(/,$/, '')
      : 'Δεν απαιτείται για αυτό το έργο',
    qualificationRequirements: required ? [
      'Πτυχίο μηχανικού ή συναφούς ειδικότητας',
      'Πιστοποίηση ασφάλειας εργασίας',
      'Εμπειρία σε κατασκευαστικά έργα (min 3 έτη)',
      'Εκπαίδευση σε νομοθεσία υγείας & ασφάλειας'
    ] : [],
    compliance: '2025_health_safety_expansion'
  };
}

/**
 * Generate first aid training requirements for employees
 */
export function generateFirstAidTrainingRequirements(
  employeeData: {
    totalEmployees: number;
    workplaceType: string;
    hasRemoteWorkers: boolean;
    hasHazardousWork: boolean;
  }
): {
  trainingRequired: boolean;
  exemptEmployees: number;
  trainingModules: string[];
  frequency: number; // days
  certificationRequired: boolean;
  estimatedCost: number;
} {
  const administrativeOnly = employeeData.workplaceType === 'administrative' && !employeeData.hasHazardousWork;
  const remoteWorkers = employeeData.hasRemoteWorkers ? Math.floor(employeeData.totalEmployees * 0.3) : 0;
  const exemptEmployees = administrativeOnly ? Math.floor(employeeData.totalEmployees * 0.2) : remoteWorkers;

  const trainingModules = [
    'Καρδιοπνευμονική Αναζωογόνηση (CPR)',
    'Τεχνική Heimlich',
    'Βασική Φροντίδα Τραυμάτων',
    'Διαδικασίες Έκτακτης Ανάγκης',
    'Ειδικοί Κίνδυνοι Χώρου Εργασίας'
  ];

  if (employeeData.hasHazardousWork) {
    trainingModules.push(
      'Χειρισμός Χημικών Εκτάκτων Αναγκών',
      'Πρώτες Βοήθειες σε Εγκαύματα',
      'Αντιμετώπιση Τοξικών Εισπνοών'
    );
  }

  const trainingCostPerEmployee = 150; // €150 per employee
  const participatingEmployees = employeeData.totalEmployees - exemptEmployees;

  return {
    trainingRequired: true,
    exemptEmployees,
    trainingModules,
    frequency: 730, // Every 2 years
    certificationRequired: true,
    estimatedCost: participatingEmployees * trainingCostPerEmployee
  };
}

/**
 * Validate digital work card salary protection compliance
 */
export function validateDigitalWorkCardProtection(
  salaryData: {
    previousSalary: number;
    currentSalary: number;
    digitalCardImplementationDate: string;
    salaryChangeDate: string;
    salaryChangeReason: string;
  }
): {
  compliant: boolean;
  violation: boolean;
  protectionTriggered: boolean;
  recommendations: string[];
  legalActions: string[];
} {
  const implementationDate = new Date(salaryData.digitalCardImplementationDate);
  const salaryChangeDate = new Date(salaryData.salaryChangeDate);
  
  const salaryReduced = salaryData.currentSalary < salaryData.previousSalary;
  const changedAfterImplementation = salaryChangeDate >= implementationDate;
  const reasonRelatedToDigitalCard = salaryData.salaryChangeReason.toLowerCase().includes('digital') || 
                                   salaryData.salaryChangeReason.toLowerCase().includes('ψηφιακ') ||
                                   salaryData.salaryChangeReason.toLowerCase().includes('κάρτα');

  const violation = salaryReduced && changedAfterImplementation && reasonRelatedToDigitalCard;
  const protectionTriggered = salaryReduced && changedAfterImplementation;

  const recommendations = [];
  const legalActions = [];

  if (violation) {
    recommendations.push(
      'Άμεση επαναφορά μισθού στο προηγούμενο επίπεδο',
      'Καταβολή διαφοράς για την περίοδο μείωσης',
      'Αναθεώρηση αιτιολογίας αλλαγής μισθού'
    );
    
    legalActions.push(
      'Αναφορά στο Σώμα Επιθεώρησης Εργασίας',
      'Πιθανή επιβολή διοικητικών προστίμων',
      'Αγωγή εργαζομένου για αποζημίωση'
    );
  } else if (protectionTriggered) {
    recommendations.push(
      'Τεκμηρίωση εναλλακτικών λόγων μείωσης μισθού',
      'Συμβουλή νομικού τμήματος',
      'Διαβούλευση με εργαζόμενο'
    );
  }

  return {
    compliant: !violation,
    violation,
    protectionTriggered,
    recommendations,
    legalActions
  };
}

/**
 * Generate comprehensive health and safety compliance report
 */
export function generateHealthSafetyComplianceReport(
  companyData: {
    industry: string;
    employeeCount: number;
    hasConstructionProjects: boolean;
    hasHazardousWork: boolean;
    digitalCardImplemented: boolean;
    currentProjects: Array<{
      type: string;
      value: number;
      riskLevel: 'low' | 'medium' | 'high';
      duration: number;
    }>;
  }
): {
  coordinatorRequirements: Array<{
    projectId: number;
    required: boolean;
    reason: string;
  }>;
  firstAidTraining: {
    required: boolean;
    participatingEmployees: number;
    estimatedCost: number;
  };
  digitalCardProtection: {
    active: boolean;
    monitoringRequired: boolean;
  };
  complianceScore: number;
  recommendations: string[];
} {
  const coordinatorRequirements = companyData.currentProjects.map((project, index) => {
    const check = checkHealthSafetyCoordinatorRequirement(project);
    return {
      projectId: index + 1,
      required: check.required,
      reason: check.reason
    };
  });

  const firstAidTraining = generateFirstAidTrainingRequirements({
    totalEmployees: companyData.employeeCount,
    workplaceType: companyData.industry,
    hasRemoteWorkers: true,
    hasHazardousWork: companyData.hasHazardousWork
  });

  let complianceScore = 100;
  const recommendations = [];

  // Deduct points for missing requirements
  const requiredCoordinators = coordinatorRequirements.filter(req => req.required).length;
  if (requiredCoordinators > 0) {
    complianceScore -= requiredCoordinators * 15;
    recommendations.push(`Διορισμός ${requiredCoordinators} συντονιστή/ών ασφάλειας για κατασκευαστικά έργα`);
  }

  if (firstAidTraining.trainingRequired) {
    complianceScore -= 20;
    recommendations.push('Οργάνωση προγράμματος εκπαίδευσης πρώτων βοηθειών');
  }

  if (companyData.digitalCardImplemented) {
    recommendations.push('Ενεργοποίηση συστήματος παρακολούθησης προστασίας μισθών');
  }

  return {
    coordinatorRequirements,
    firstAidTraining: {
      required: firstAidTraining.trainingRequired,
      participatingEmployees: companyData.employeeCount - firstAidTraining.exemptEmployees,
      estimatedCost: firstAidTraining.estimatedCost
    },
    digitalCardProtection: {
      active: companyData.digitalCardImplemented,
      monitoringRequired: true
    },
    complianceScore: Math.max(0, complianceScore),
    recommendations
  };
}