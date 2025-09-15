/**
 * Legal Documentation System
 * Greek Labor Law Compliance and Legal Document Management
 * Updated with EU Directive 2019/1152 (Law 5053/2023) and 2025 Strike Actions
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
        originalRequired: false,
      },
      {
        code: 'afm-certificate',
        name: 'Βεβαίωση ΑΦΜ',
        description: 'Βεβαίωση Αριθμού Φορολογικού Μητρώου',
        mandatory: true,
        expiryTracking: false,
        validityCheck: 'afm_algorithm',
        digitalCopy: true,
        originalRequired: false,
      },
      {
        code: 'amka-certificate',
        name: 'Βεβαίωση ΑΜΚΑ',
        description: 'Αριθμός Μητρώου Κοινωνικής Ασφάλισης',
        mandatory: true,
        expiryTracking: false,
        validityCheck: 'luhn_algorithm',
        digitalCopy: true,
        originalRequired: false,
      },
      {
        code: 'iban-certificate',
        name: 'Βεβαίωση IBAN',
        description: 'Τραπεζικός λογαριασμός για μισθοδοσία',
        mandatory: true,
        expiryTracking: false,
        validityCheck: 'iban_format',
        digitalCopy: true,
        originalRequired: false,
      },
      {
        code: 'education-certificates',
        name: 'Πιστοποιητικά Εκπαίδευσης',
        description: 'Τίτλοι σπουδών και επαγγελματικά πιστοποιητικά',
        mandatory: false,
        expiryTracking: false,
        positionDependent: true,
        digitalCopy: true,
        originalRequired: false,
      },
    ],
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
        specialRequirements: ['night_shift', 'hazardous_work', 'food_handling'],
      },
      {
        code: 'safety-training',
        name: 'Εκπαίδευση Ασφαλείας',
        description: 'Πιστοποιητικό εκπαίδευσης ασφάλειας εργασίας',
        mandatory: true,
        expiryTracking: true,
        renewalPeriod: 1095, // 3 years
        renewalNotice: 60,
        digitalCopy: true,
      },
      {
        code: 'occupational-health',
        name: 'Ιατρός Εργασίας',
        description: 'Εξέταση από ιατρό εργασίας',
        mandatory: true,
        expiryTracking: true,
        renewalPeriod: 365, // Annual
        renewalNotice: 30,
        companySize: '>50_employees',
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
        lawReference: '2025_health_safety_expansion',
      },
      {
        code: 'first-aid-training',
        name: 'Εκπαίδευση Πρώτων Βοηθειών',
        description:
          'Υποχρεωτική εκπαίδευση σε βασικές διαδικασίες έκτακτης ανάγκης',
        mandatory: true,
        trainingContent: [
          'cpr',
          'heimlich_maneuver',
          'basic_emergency_procedures',
        ],
        expiryTracking: true,
        renewalPeriod: 730, // 2 years
        renewalNotice: 60,
        allEmployees: true,
        certificationRequired: true,
        digitalCopy: true,
        lawReference: '2025_first_aid_requirements',
      },
      {
        code: 'digital-work-card-protection',
        name: 'Προστασία Ψηφιακής Κάρτας Εργασίας',
        description:
          'Δήλωση προστασίας κατά μείωσης μισθού λόγω ψηφιακής κάρτας',
        mandatory: true,
        protectionType: 'salary_reduction_prohibition',
        digitalImplementation: true,
        complianceCheck: 'automatic',
        employeeRights: [
          'salary_protection',
          'no_reduction_due_to_digital_card',
        ],
        lawReference: '2025_digital_work_card_protection',
      },
    ],
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
        originalRequired: true,
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
        originalRequired: true,
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
        originalRequired: true,
      },
      {
        code: 'eu-registration',
        name: 'Βεβαίωση ΕΕ',
        description: 'Βεβαίωση εγγραφής πολίτη ΕΕ',
        mandatory: true,
        expiryTracking: false,
        applicableTo: ['eu_citizens'],
        digitalCopy: true,
        originalRequired: false,
      },
    ],
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
        systemIntegration: 'efka_api',
      },
      {
        code: 'insurance-history',
        name: 'Ασφαλιστικό Ιστορικό',
        description: 'Ιστορικό ασφάλισης από προηγούμενους εργοδότες',
        mandatory: false,
        usefulFor: ['pension_calculation', 'benefits_determination'],
        digitalCopy: true,
      },
      {
        code: 'auxiliary-insurance',
        name: 'Επικουρική Ασφάλιση',
        description: 'Στοιχεία επικουρικής ασφάλισης',
        mandatory: false,
        positionDependent: true,
        digitalCopy: true,
      },
    ],
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
        originalRequired: false,
      },
      {
        code: 'deferment-certificate',
        name: 'Αναβολή Στρατολογίας',
        description: 'Αναβολή για σπουδές ή οικογενειακούς λόγους',
        mandatory: false,
        expiryTracking: true,
        temporaryDocument: true,
        digitalCopy: true,
      },
    ],
  },
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
        complianceCheck: 'mandatory',
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
          'education_time_protected',
        ],
        maxDailyHours: 7,
        maxWeeklyHours: 35,
      },
    ],
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
          weekly: 24, // 24 consecutive hours per week
        },
      },
      {
        code: 'weekly-limits',
        name: 'Εβδομαδιαία Όρια',
        description: 'Μέγιστες εβδομαδιαίες ώρες εργασίας',
        standardHours: 40,
        maximumHours: 48, // EU Working Time Directive
        averagingPeriod: 120, // Days for calculating average
        exceptions: ['seasonal_work', 'essential_services'],
      },
    ],
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
          'overtime',
        ],
        medicalCertificateRequired: true,
        riskAssessmentRequired: true,
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
        categories: ['chemical', 'nuclear', 'height_work', 'mining'],
      },
      {
        code: 'construction-safety-coordinator',
        name: 'Συντονιστής Ασφάλειας Κατασκευών',
        description:
          'Υποχρεωτικός διορισμός συντονιστή για μεγάλα κατασκευαστικά έργα',
        projectTypes: [
          'large_construction',
          'infrastructure',
          'high_risk_construction',
        ],
        minimumProjectValue: 500000, // €500,000
        qualificationRequirements: [
          'engineering_degree',
          'safety_certification',
          'construction_experience',
        ],
        responsibilities: [
          'safety_planning',
          'risk_assessment',
          'safety_monitoring',
          'incident_reporting',
          'worker_training_oversight',
        ],
        lawReference: '2025_health_safety_expansion',
      },
      {
        code: 'mandatory-first-aid-training',
        name: 'Υποχρεωτική Εκπαίδευση Πρώτων Βοηθειών',
        description:
          'Εκπαίδευση όλων των εργαζομένων σε βασικές διαδικασίες έκτακτης ανάγκης',
        trainingModules: [
          'cpr_certification',
          'heimlich_maneuver',
          'basic_wound_care',
          'emergency_response_procedures',
          'workplace_specific_hazards',
        ],
        trainingFrequency: 730, // Every 2 years
        certificationRequired: true,
        applicableToAllEmployees: true,
        exemptions: ['remote_workers', 'administrative_only'],
        lawReference: '2025_first_aid_requirements',
      },
      {
        code: 'digital-work-card-salary-protection',
        name: 'Προστασία Μισθού από Ψηφιακή Κάρτα Εργασίας',
        description:
          'Απαγόρευση μείωσης μισθών εξαιτίας της εισαγωγής ψηφιακής κάρτας εργασίας',
        protectionScope: [
          'salary_reduction_prohibition',
          'benefit_reduction_prohibition',
          'working_conditions_protection',
        ],
        enforcementMechanism: 'automatic_system_check',
        penaltiesForViolation: [
          'administrative_fines',
          'labor_court_action',
          'compensation_orders',
        ],
        reportingMechanism: 'digital_platform_integrated',
        lawReference: '2025_digital_work_card_protection',
      },
    ],
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
          'job_restructuring',
        ],
        evaluationRequired: true,
        medicalDocumentation: true,
      },
    ],
  },
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
        description: 'Δοκιμαστική περίοδος (0-12 μήνες)',
      },
      {
        tenureMonths: 12,
        tenureLimit: 24,
        noticeDays: 30,
        description: '1-2 έτη υπηρεσίας',
      },
      {
        tenureMonths: 24,
        tenureLimit: 60,
        noticeDays: 60,
        description: '2-5 έτη υπηρεσίας',
      },
      {
        tenureMonths: 60,
        tenureLimit: 120,
        noticeDays: 90,
        description: '5-10 έτη υπηρεσίας',
      },
      {
        tenureMonths: 120,
        tenureLimit: 180,
        noticeDays: 120,
        description: '10-15 έτη υπηρεσίας',
      },
      {
        tenureMonths: 180,
        tenureLimit: 240,
        noticeDays: 150,
        description: '15-20 έτη υπηρεσίας',
      },
      {
        tenureMonths: 240,
        tenureLimit: null,
        noticeDays: 180,
        description: '20+ έτη υπηρεσίας',
      },
    ],
    paymentInLieu: true, // Can pay instead of notice
    severancePayRequired: true,
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
        description: 'Μικρές επιχειρήσεις (20-99 εργαζόμενοι)',
      },
      {
        companySize: '100-299',
        layoffThreshold: 10,
        noticePeriod: 45,
        description: 'Μεσαίες επιχειρήσεις (100-299 εργαζόμενοι)',
      },
      {
        companySize: '300+',
        layoffThreshold: 30,
        noticePeriod: 45,
        description: 'Μεγάλες επιχειρήσεις (300+ εργαζόμενοι)',
      },
    ],
    consultationRequired: true,
    laborInspectorateNotification: true,
    unionConsultation: true,
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
        exceptions: ['serious_misconduct', 'company_closure'],
      },
      {
        category: 'union_representatives',
        name: 'Συνδικαλιστικοί Εκπρόσωποι',
        protection: 'enhanced_protection',
        noticePeriod: 'double_standard',
        approvalRequired: 'labor_inspectorate',
      },
      {
        category: 'disabled_workers',
        name: 'Άτομα με Αναπηρία',
        protection: 'enhanced_protection',
        justificationRequired: true,
        accommodationFirst: true,
      },
    ],
  },
};

// EU Directive 2019/1152 Compliance (Law 5053/2023)
export const EU_PREDICTABLE_CONDITIONS_DIRECTIVE = {
  directive: 'EU-2019-1152',
  greekLaw: 'Law 5053/2023',
  implementationDate: '2023-12-15',
  name: 'Διαφανείς και Προβλέψιμες Συνθήκες Εργασίας',
  description:
    'Ευρωπαϊκή Οδηγία για διαφανείς και προβλέψιμες συνθήκες εργασίας',

  CORE_EMPLOYMENT_TERMS: {
    category: 'core-terms',
    name: 'Βασικοί Όροι Απασχόλησης',
    description: 'Υποχρεωτικές πληροφορίες που πρέπει να παρέχονται εγγράφως',

    IMMEDIATE_INFORMATION: {
      timeframe: 'first_day',
      name: 'Άμεση Παροχή Πληροφοριών',
      requiredInfo: [
        {
          item: 'employer_identity',
          description: 'Ταυτότητα εργοδότη και εργαζομένου',
          mandatory: true,
        },
        {
          item: 'workplace_location',
          description: 'Τόπος εργασίας ή βάση εργαζομένου',
          mandatory: true,
          flexibilityAllowed: true,
        },
        {
          item: 'job_title_duties',
          description: 'Τίτλος θέσης εργασίας και περιγραφή καθηκόντων',
          mandatory: true,
        },
        {
          item: 'employment_start',
          description: 'Ημερομηνία έναρξης εργασίας',
          mandatory: true,
        },
        {
          item: 'contract_duration',
          description: 'Διάρκεια σύμβασης (για ορισμένου χρόνου)',
          mandatory: true,
          applicableTo: 'fixed_term_contracts',
        },
        {
          item: 'probation_period',
          description: 'Περίοδος δοκιμασίας και διάρκεια',
          mandatory: true,
          maxDuration: '6_months',
          note: 'Μέγιστη διάρκεια 6 μήνες σύμφωνα με την Οδηγία',
        },
      ],
    },

    WRITTEN_STATEMENT_DEADLINE: {
      timeframe: 'within_7_days',
      name: 'Έγγραφη Δήλωση Όρων',
      description: 'Υποχρεωτική έγγραφη δήλωση όρων εντός 7 ημερών',
      requiredInfo: [
        {
          item: 'remuneration_details',
          description: 'Αμοιβή, συχνότητα πληρωμής, και συνθέσεις',
          mandatory: true,
          includes: ['basic_salary', 'allowances', 'bonuses', 'overtime_rates'],
        },
        {
          item: 'working_time',
          description: 'Ωράριο εργασίας και κατανομή',
          mandatory: true,
          includes: [
            'daily_hours',
            'weekly_hours',
            'rest_breaks',
            'flexible_arrangements',
          ],
        },
        {
          item: 'paid_leave',
          description: 'Δικαίωμα άδειας με αποδοχές',
          mandatory: true,
          includes: ['annual_leave', 'sick_leave', 'special_leave'],
        },
        {
          item: 'notice_periods',
          description: 'Περίοδοι προειδοποίησης για καταγγελία',
          mandatory: true,
          applies: 'both_parties',
        },
        {
          item: 'training_entitlement',
          description: 'Δικαίωμα επαγγελματικής εκπαίδευσης',
          mandatory: true,
          note: 'Νέα απαίτηση της Οδηγίας',
        },
        {
          item: 'social_security',
          description: 'Κοινωνική ασφάλιση και παροχές',
          mandatory: true,
          includes: ['insurance_fund', 'contributions', 'benefits'],
        },
        {
          item: 'collective_agreements',
          description: 'Εφαρμοστέες συλλογικές συμβάσεις',
          mandatory: true,
          condition: 'if_applicable',
        },
      ],
    },
  },

  PROBATION_PERIOD_LIMITS: {
    category: 'probation-limits',
    name: 'Όρια Περιόδου Δοκιμασίας',
    description: 'Μέγιστη διάρκεια δοκιμαστικής περιόδου 6 μήνες',
    rules: [
      {
        contractType: 'permanent',
        maxProbation: 6, // months
        renewalAllowed: false,
        justificationRequired: true,
      },
      {
        contractType: 'fixed_term',
        maxProbation: 3, // months for contracts under 2 years
        condition: 'contract_under_24_months',
        renewalAllowed: false,
      },
      {
        contractType: 'part_time',
        maxProbation: 6, // months
        proRated: false,
        sameAsFullTime: true,
      },
    ],
    violations: {
      excessiveProbation: 'Automatic conversion to permanent employment',
      renewalAttempt: 'Prohibited - considered permanent from first day',
      discriminatoryUse: 'Legal action and compensation',
    },
  },

  TRANSPARENCY_OBLIGATIONS: {
    category: 'transparency',
    name: 'Υποχρεώσεις Διαφάνειας',
    description: 'Νέες υποχρεώσεις διαφάνειας για εργοδότες',
    obligations: [
      {
        requirement: 'written_information_update',
        description: 'Ενημέρωση εγγράφων όρων εντός 30 ημερών από αλλαγή',
        timeframe: 30, // days
        triggers: [
          'salary_change',
          'role_change',
          'location_change',
          'hours_change',
        ],
      },
      {
        requirement: 'predictable_scheduling',
        description: 'Προβλέψιμος προγραμματισμός για μεταβλητές συμβάσεις',
        applies: 'variable_hour_contracts',
        minNotice: 4, // days for schedule changes
        compensationRequired: true,
      },
      {
        requirement: 'training_opportunities',
        description: 'Υποχρεωτική ενημέρωση για ευκαιρίες εκπαίδευσης',
        frequency: 'annual',
        documentation: 'training_register',
      },
    ],
  },
};

// Labor Relations and Strike Activity (2025)
export const LABOR_RELATIONS_2025 = {
  year: 2025,
  name: 'Εργασιακές Σχέσεις και Απεργιακή Δραστηριότητα 2025',
  description:
    'Εξελίξεις στις εργασιακές σχέσεις και συλλογικές διαπραγματεύσεις',

  APRIL_2025_STRIKE: {
    date: '2025-04-15',
    type: 'general_strike',
    name: 'Γενική Απεργία Απριλίου 2025',
    description:
      'Γενική απεργία για μισθολογικές αυξήσεις και συλλογικές διαπραγματεύσεις',

    DEMANDS: {
      category: 'union_demands',
      primaryDemands: [
        {
          demand: 'higher_minimum_wage',
          description: 'Περαιτέρω αύξηση κατώτατου μισθού πέραν των €880',
          justification: 'Αυξημένο κόστος ζωής και πληθωρισμός',
          status: 'pending_negotiation',
        },
        {
          demand: 'collective_bargaining_restoration',
          description: 'Αποκατάσταση δικαιωμάτων συλλογικών διαπραγματεύσεων',
          justification: 'Ενίσχυση συνδικαλιστικών δικαιωμάτων',
          status: 'under_discussion',
        },
        {
          demand: 'sectoral_agreements',
          description: 'Ενίσχυση κλαδικών συλλογικών συμβάσεων',
          justification: 'Βελτίωση όρων εργασίας ανά κλάδο',
          status: 'partial_progress',
        },
        {
          demand: 'working_conditions',
          description: 'Βελτίωση συνθηκών εργασίας και ωραρίων',
          justification: 'Εναρμόνιση με ευρωπαϊκά πρότυπα',
          status: 'ongoing_negotiations',
        },
      ],
    },

    IMPACT_ASSESSMENT: {
      economicImpact: 'high',
      sectorsAffected: [
        'public_sector',
        'transportation',
        'education',
        'healthcare',
        'manufacturing',
        'retail',
      ],
      participationRate: '75%',
      duration: '24_hours',
      followUpActions: 'continued_negotiations',
    },
  },

  WAGE_PRESSURE_CONTEXT: {
    category: 'economic_context',
    name: 'Πλαίσιο Μισθολογικών Πιέσεων',
    description:
      'Οικονομικό πλαίσιο που οδήγησε στις απεργιακές κινητοποιήσεις',

    factors: [
      {
        factor: 'cost_of_living_increase',
        description: 'Αύξηση κόστους ζωής',
        impact: 'high',
        percentage: '8.5%', // estimated inflation impact
        sectors: 'all',
      },
      {
        factor: 'housing_costs',
        description: 'Αύξηση κόστους στέγασης',
        impact: 'very_high',
        percentage: '15%',
        geographicImpact: 'urban_areas_primarily',
      },
      {
        factor: 'energy_prices',
        description: 'Αύξηση τιμών ενέργειας',
        impact: 'high',
        percentage: '12%',
        sectors: 'energy_intensive_industries',
      },
      {
        factor: 'minimum_wage_inadequacy',
        description: 'Ανεπάρκεια κατώτατου μισθού €880',
        impact: 'high',
        unionPosition: 'insufficient_for_living_standards',
        proposedIncrease: '€950-1000',
      },
    ],
  },

  COLLECTIVE_BARGAINING_STATUS: {
    category: 'bargaining_status',
    name: 'Κατάσταση Συλλογικών Διαπραγματεύσεων',
    description: 'Τρέχουσα κατάσταση συλλογικών διαπραγματεύσεων ανά κλάδο',

    SECTORAL_NEGOTIATIONS: [
      {
        sector: 'construction',
        status: 'active_negotiations',
        issues: [
          'safety_standards',
          'overtime_compensation',
          'seasonal_adjustments',
        ],
        deadline: '2025-06-30',
        progress: 'moderate',
      },
      {
        sector: 'tourism_hospitality',
        status: 'stalled',
        issues: [
          'seasonal_work_protection',
          'tip_allocation',
          'accommodation_standards',
        ],
        deadline: '2025-05-15',
        progress: 'limited',
      },
      {
        sector: 'healthcare',
        status: 'concluded',
        outcome: 'agreement_reached',
        improvements: [
          'shift_premiums',
          'continuing_education',
          'safety_equipment',
        ],
        effectiveDate: '2025-01-01',
      },
      {
        sector: 'education',
        status: 'pending',
        issues: [
          'workload_reduction',
          'professional_development',
          'classroom_conditions',
        ],
        expectedStart: '2025-09-01',
        progress: 'preliminary_discussions',
      },
    ],
  },
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
        documentRequired: true,
      },
      {
        step: 2,
        action: 'handover_duties',
        description: 'Παράδοση καθηκόντων και υλικού',
        timeframe: 'during_notice_period',
        checklistRequired: true,
      },
      {
        step: 3,
        action: 'final_settlement',
        description: 'Εκκαθάριση οφειλών και απαιτήσεων',
        timeframe: 'last_working_day',
        includesItems: ['final_salary', 'unused_leave', 'overtime_pay'],
      },
    ],
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
      'unauthorized_absence',
    ],
    procedures: [
      {
        step: 1,
        action: 'investigation',
        description: 'Διερεύνηση περιστατικού',
        timeframe: 'immediate',
        documentationRequired: true,
      },
      {
        step: 2,
        action: 'disciplinary_hearing',
        description: 'Πειθαρχική διαδικασία',
        timeframe: 'within_reasonable_time',
        employeeRights: ['representation', 'defense', 'evidence_review'],
      },
      {
        step: 3,
        action: 'decision_notification',
        description: 'Κοινοποίηση απόφασης',
        timeframe: 'written_notification',
        noNoticeRequired: true,
        noSeveranceRequired: true,
      },
    ],
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
        paymentInLieuOption: true,
      },
      {
        step: 2,
        action: 'severance_calculation',
        description: 'Υπολογισμός αποζημίωσης',
        calculation: 'statutory_formula',
        minimumPayment: true,
      },
      {
        step: 3,
        action: 'final_documentation',
        description: 'Έκδοση απαραίτητων εγγράφων',
        requiredDocuments: [
          'termination_certificate',
          'employment_reference',
          'efka_notification',
          'tax_certificate',
        ],
      },
    ],
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
        procedures: ['efka_application', 'final_settlement', 'handover'],
      },
      {
        type: 'early_retirement',
        name: 'Πρόωρη Συνταξιοδότηση',
        ageRequirement: 62,
        serviceYears: 40,
        penalties: 'reduced_pension',
        procedures: ['special_application', 'medical_evaluation'],
      },
    ],
  },
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
  const tenureMonths = Math.floor(
    (end.getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  );

  const noticePeriods = LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.noticePeriods;

  const applicablePeriod = noticePeriods.find(
    period =>
      tenureMonths >= period.tenureMonths &&
      (period.tenureLimit === null || tenureMonths < period.tenureLimit)
  );

  return {
    tenureMonths,
    noticeDays: applicablePeriod?.noticeDays || 0,
    description: applicablePeriod?.description || 'Άγνωστη περίοδος',
    paymentInLieuAllowed:
      LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.paymentInLieu,
    severanceRequired:
      LAYOFF_NOTICE_PERIODS.INDIVIDUAL_LAYOFFS.severancePayRequired,
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
      if (
        doc.applicableTo &&
        !doc.applicableTo.includes(getEmployeeCategory(employeeData))
      ) {
        continue;
      }

      const employeeDoc = documents.find(d => d.type === doc.code);

      if (doc.mandatory && (!employeeDoc || employeeDoc.status === 'missing')) {
        missingDocuments.push(doc.name);
      }

      if (employeeDoc && doc.expiryTracking && employeeDoc.expiryDate) {
        const expiryDate = new Date(employeeDoc.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysUntilExpiry <= (doc.renewalNotice || 30)) {
          expiringDocuments.push({
            type: doc.name,
            expiryDate: employeeDoc.expiryDate,
            daysUntilExpiry,
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
    violations,
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
  terminationType:
    | 'resignation'
    | 'dismissal-cause'
    | 'dismissal-no-cause'
    | 'retirement',
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
  const procedures =
    TERMINATION_PROCEDURES[
      terminationType
        .toUpperCase()
        .replace('-', '_') as keyof typeof TERMINATION_PROCEDURES
    ];

  if (procedures && 'procedures' in procedures) {
    for (const procedure of procedures.procedures as any[]) {
      checklist.push({
        category: 'legal',
        task: procedure.description,
        responsible: 'hr',
        deadline: procedure.timeframe,
        completed: false,
        priority: 'high' as const,
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
      priority: 'high' as const,
    },
    {
      category: 'access',
      task: 'Ανάκληση προσβάσεων συστημάτων',
      responsible: 'it',
      deadline: 'last_working_day',
      completed: false,
      priority: 'high' as const,
    },
    {
      category: 'documentation',
      task: 'Έκδοση πιστοποιητικού εργασίας',
      responsible: 'hr',
      deadline: 'within_5_days',
      completed: false,
      priority: 'medium' as const,
    }
  );

  if (employeeData.hasPendingProjects) {
    checklist.push({
      category: 'handover',
      task: 'Παράδοση εκκρεμών έργων',
      responsible: 'manager',
      deadline: 'during_notice',
      completed: false,
      priority: 'high' as const,
    });
    estimatedDays += 5;
  }

  return {
    checklist,
    estimatedDays,
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
    terminationProcedures: TERMINATION_PROCEDURES,
  };
}

/**
 * Check if health and safety coordinator is required for construction project
 */
export function checkHealthSafetyCoordinatorRequirement(projectData: {
  type: string;
  value: number;
  riskLevel: 'low' | 'medium' | 'high';
  duration: number; // months
}): {
  required: boolean;
  reason: string;
  qualificationRequirements: string[];
  compliance: string;
} {
  const isConstructionProject =
    projectData.type.toLowerCase().includes('construction') ||
    projectData.type.toLowerCase().includes('infrastructure');

  const isLargeProject = projectData.value >= 500000; // €500,000 threshold
  const isHighRisk = projectData.riskLevel === 'high';
  const isLongTerm = projectData.duration >= 6; // 6+ months

  const required =
    isConstructionProject && (isLargeProject || isHighRisk || isLongTerm);

  return {
    required,
    reason: required
      ? `Υποχρεωτικός διορισμός λόγω: ${isLargeProject ? 'μεγάλο έργο (>€500K), ' : ''}${isHighRisk ? 'υψηλός κίνδυνος, ' : ''}${isLongTerm ? 'μακροχρόνιο έργο (6+ μήνες)' : ''}`
          .trim()
          .replace(/,$/, '')
      : 'Δεν απαιτείται για αυτό το έργο',
    qualificationRequirements: required
      ? [
          'Πτυχίο μηχανικού ή συναφούς ειδικότητας',
          'Πιστοποίηση ασφάλειας εργασίας',
          'Εμπειρία σε κατασκευαστικά έργα (min 3 έτη)',
          'Εκπαίδευση σε νομοθεσία υγείας & ασφάλειας',
        ]
      : [],
    compliance: '2025_health_safety_expansion',
  };
}

/**
 * Generate first aid training requirements for employees
 */
export function generateFirstAidTrainingRequirements(employeeData: {
  totalEmployees: number;
  workplaceType: string;
  hasRemoteWorkers: boolean;
  hasHazardousWork: boolean;
}): {
  trainingRequired: boolean;
  exemptEmployees: number;
  trainingModules: string[];
  frequency: number; // days
  certificationRequired: boolean;
  estimatedCost: number;
} {
  const administrativeOnly =
    employeeData.workplaceType === 'administrative' &&
    !employeeData.hasHazardousWork;
  const remoteWorkers = employeeData.hasRemoteWorkers
    ? Math.floor(employeeData.totalEmployees * 0.3)
    : 0;
  const exemptEmployees = administrativeOnly
    ? Math.floor(employeeData.totalEmployees * 0.2)
    : remoteWorkers;

  const trainingModules = [
    'Καρδιοπνευμονική Αναζωογόνηση (CPR)',
    'Τεχνική Heimlich',
    'Βασική Φροντίδα Τραυμάτων',
    'Διαδικασίες Έκτακτης Ανάγκης',
    'Ειδικοί Κίνδυνοι Χώρου Εργασίας',
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
    estimatedCost: participatingEmployees * trainingCostPerEmployee,
  };
}

/**
 * Validate digital work card salary protection compliance
 */
export function validateDigitalWorkCardProtection(salaryData: {
  previousSalary: number;
  currentSalary: number;
  digitalCardImplementationDate: string;
  salaryChangeDate: string;
  salaryChangeReason: string;
}): {
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
  const reasonRelatedToDigitalCard =
    salaryData.salaryChangeReason.toLowerCase().includes('digital') ||
    salaryData.salaryChangeReason.toLowerCase().includes('ψηφιακ') ||
    salaryData.salaryChangeReason.toLowerCase().includes('κάρτα');

  const violation =
    salaryReduced && changedAfterImplementation && reasonRelatedToDigitalCard;
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
    legalActions,
  };
}

/**
 * Generate comprehensive health and safety compliance report
 */
export function generateHealthSafetyComplianceReport(companyData: {
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
}): {
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
  const coordinatorRequirements = companyData.currentProjects.map(
    (project, index) => {
      const check = checkHealthSafetyCoordinatorRequirement(project);
      return {
        projectId: index + 1,
        required: check.required,
        reason: check.reason,
      };
    }
  );

  const firstAidTraining = generateFirstAidTrainingRequirements({
    totalEmployees: companyData.employeeCount,
    workplaceType: companyData.industry,
    hasRemoteWorkers: true,
    hasHazardousWork: companyData.hasHazardousWork,
  });

  let complianceScore = 100;
  const recommendations = [];

  // Deduct points for missing requirements
  const requiredCoordinators = coordinatorRequirements.filter(
    req => req.required
  ).length;
  if (requiredCoordinators > 0) {
    complianceScore -= requiredCoordinators * 15;
    recommendations.push(
      `Διορισμός ${requiredCoordinators} συντονιστή/ών ασφάλειας για κατασκευαστικά έργα`
    );
  }

  if (firstAidTraining.trainingRequired) {
    complianceScore -= 20;
    recommendations.push('Οργάνωση προγράμματος εκπαίδευσης πρώτων βοηθειών');
  }

  if (companyData.digitalCardImplemented) {
    recommendations.push(
      'Ενεργοποίηση συστήματος παρακολούθησης προστασίας μισθών'
    );
  }

  return {
    coordinatorRequirements,
    firstAidTraining: {
      required: firstAidTraining.trainingRequired,
      participatingEmployees:
        companyData.employeeCount - firstAidTraining.exemptEmployees,
      estimatedCost: firstAidTraining.estimatedCost,
    },
    digitalCardProtection: {
      active: companyData.digitalCardImplemented,
      monitoringRequired: true,
    },
    complianceScore: Math.max(0, complianceScore),
    recommendations,
  };
}

/**
 * Check EU Directive 2019/1152 compliance for employment contracts
 */
export function checkEUDirectiveCompliance(contractData: {
  hasWrittenContract: boolean;
  contractProvidedOn: string; // Date when contract was provided
  employmentStartDate: string;
  probationPeriodMonths: number;
  hasAllRequiredTerms: boolean;
  missingTerms: string[];
  contractType: 'permanent' | 'fixed_term' | 'part_time' | 'temporary';
}): {
  isCompliant: boolean;
  violations: Array<{
    type: string;
    description: string;
    severity: 'critical' | 'major' | 'minor';
    remedy: string;
  }>;
  complianceScore: number;
  nextActions: string[];
} {
  const violations = [];
  let complianceScore = 100;

  // Check if written contract provided within 7 days
  const contractDate = new Date(contractData.contractProvidedOn);
  const startDate = new Date(contractData.employmentStartDate);
  const daysDifference = Math.ceil(
    (contractDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)
  );

  if (!contractData.hasWrittenContract) {
    violations.push({
      type: 'missing_written_contract',
      description: 'Δεν έχει παρασχεθεί έγγραφη σύμβαση εργασίας',
      severity: 'critical' as const,
      remedy:
        'Άμεση παροχή εγγράφου σύμβασης με όλους τους απαιτούμενους όρους',
    });
    complianceScore -= 40;
  } else if (daysDifference > 7) {
    violations.push({
      type: 'late_contract_provision',
      description: `Έγγραφη σύμβαση παρασχέθηκε ${daysDifference} ημέρες μετά την έναρξη (όριο: 7 ημέρες)`,
      severity: 'major' as const,
      remedy: 'Βελτίωση διαδικασιών για παροχή συμβάσεων εντός προθεσμίας',
    });
    complianceScore -= 25;
  }

  // Check probation period limits
  const maxProbation = contractData.contractType === 'fixed_term' ? 3 : 6;
  if (contractData.probationPeriodMonths > maxProbation) {
    violations.push({
      type: 'excessive_probation',
      description: `Περίοδος δοκιμασίας ${contractData.probationPeriodMonths} μήνες υπερβαίνει το όριο των ${maxProbation} μηνών`,
      severity: 'critical' as const,
      remedy:
        'Μείωση περιόδου δοκιμασίας εντός νόμιμων ορίων - αυτόματη μετατροπή σε μόνιμη',
    });
    complianceScore -= 35;
  }

  // Check required terms
  if (!contractData.hasAllRequiredTerms) {
    violations.push({
      type: 'missing_contract_terms',
      description: `Λείπουν απαιτούμενοι όροι: ${contractData.missingTerms.join(', ')}`,
      severity: 'major' as const,
      remedy: 'Συμπλήρωση όλων των απαιτούμενων όρων σύμφωνα με την Οδηγία',
    });
    complianceScore -= Math.min(30, contractData.missingTerms.length * 5);
  }

  const nextActions = [];
  if (violations.length > 0) {
    nextActions.push('Άμεση επίλυση παραβάσεων Ευρωπαϊκής Οδηγίας');
    nextActions.push('Ενημέρωση εργαζομένων για τα δικαιώματά τους');
    nextActions.push('Εκπαίδευση HR προσωπικού στις νέες απαιτήσεις');
  } else {
    nextActions.push('Συνέχιση παρακολούθησης συμμόρφωσης');
    nextActions.push('Ετήσια αξιολόγηση διαδικασιών');
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    complianceScore: Math.max(0, complianceScore),
    nextActions,
  };
}

/**
 * Assess impact of labor strikes on business operations
 */
export function assessStrikeImpact(
  companyData: {
    industry: string;
    employeeCount: number;
    unionizedEmployees: number;
    criticalOperations: string[];
    hasContingencyPlans: boolean;
    previousStrikeHistory: Array<{
      date: string;
      duration: number;
      participationRate: number;
      impact: 'low' | 'medium' | 'high';
    }>;
  },
  strikeData: {
    type: 'general_strike' | 'sectoral_strike' | 'company_strike';
    expectedDuration: number; // hours
    expectedParticipation: number; // percentage
    affectedSectors: string[];
    demands: string[];
  }
): {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  expectedImpact: {
    operationalImpact: number; // percentage
    financialImpact: number; // estimated daily loss
    employeeParticipation: number; // expected percentage
  };
  contingencyMeasures: string[];
  negotiationRecommendations: string[];
  complianceChecklist: string[];
} {
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Calculate base risk factors
  const unionizationRate =
    (companyData.unionizedEmployees / companyData.employeeCount) * 100;
  const sectorAffected = strikeData.affectedSectors.includes(
    companyData.industry
  );

  // Determine risk level
  if (strikeData.type === 'general_strike' && sectorAffected) {
    riskLevel = unionizationRate > 60 ? 'critical' : 'high';
  } else if (strikeData.type === 'sectoral_strike' && sectorAffected) {
    riskLevel = unionizationRate > 40 ? 'high' : 'medium';
  } else if (strikeData.type === 'company_strike') {
    riskLevel = 'critical';
  } else if (strikeData.expectedParticipation > 50) {
    riskLevel = 'medium';
  }

  // Calculate expected impact
  const baseParticipation = Math.min(
    unionizationRate,
    strikeData.expectedParticipation
  );
  const operationalImpact = sectorAffected
    ? baseParticipation * 0.8
    : baseParticipation * 0.3;

  // Estimate financial impact (daily revenue loss)
  const avgDailyRevenue = companyData.employeeCount * 300; // Rough estimate
  const financialImpact =
    ((avgDailyRevenue * operationalImpact) / 100) *
    (strikeData.expectedDuration / 8);

  // Generate contingency measures
  const contingencyMeasures = [];
  if (riskLevel === 'high' || riskLevel === 'critical') {
    contingencyMeasures.push('Ενεργοποίηση σχεδίου έκτακτης ανάγκης');
    contingencyMeasures.push(
      'Επικοινωνία με πελάτες για πιθανές καθυστερήσεις'
    );
    contingencyMeasures.push('Αξιολόγηση εναλλακτικών προμηθευτών/υπεργολάβων');
  }

  if (companyData.criticalOperations.length > 0) {
    contingencyMeasures.push(
      'Εξασφάλιση ελάχιστου προσωπικού για κρίσιμες λειτουργίες'
    );
    contingencyMeasures.push('Ενεργοποίηση εφεδρικών συστημάτων');
  }

  // Negotiation recommendations based on 2025 context
  const negotiationRecommendations = [];
  if (strikeData.demands.includes('higher_minimum_wage')) {
    negotiationRecommendations.push(
      'Εξέταση προσφοράς μισθολογικών αυξήσεων πέραν του νόμιμου κατώτατου'
    );
    negotiationRecommendations.push(
      'Προσφορά εναλλακτικών παροχών (vouchers, ασφάλεια, εκπαίδευση)'
    );
  }

  if (strikeData.demands.includes('collective_bargaining_restoration')) {
    negotiationRecommendations.push(
      'Διερεύνηση συμμετοχής σε κλαδικές διαπραγματεύσεις'
    );
    negotiationRecommendations.push(
      'Ενίσχυση διαλόγου με συνδικαλιστικές οργανώσεις'
    );
  }

  // Compliance checklist during strikes
  const complianceChecklist = [
    'Σεβασμός δικαιώματος απεργίας των εργαζομένων',
    'Μη επιβολή κυρώσεων για συμμετοχή σε νόμιμη απεργία',
    'Εξασφάλιση ελάχιστων υπηρεσιών όπου απαιτείται',
    'Τήρηση διαδικασιών επικοινωνίας με αρχές',
    'Προστασία μη απεργών εργαζομένων',
    'Τεκμηρίωση οικονομικών επιπτώσεων για ασφαλιστικούς σκοπούς',
  ];

  return {
    riskLevel,
    expectedImpact: {
      operationalImpact: Math.round(operationalImpact),
      financialImpact: Math.round(financialImpact),
      employeeParticipation: Math.round(baseParticipation),
    },
    contingencyMeasures,
    negotiationRecommendations,
    complianceChecklist,
  };
}
