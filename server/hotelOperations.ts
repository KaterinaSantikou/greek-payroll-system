/**
 * Hotel-Specific Operations System
 * 
 * Features:
 * - Multi-property employee management
 * - Department kiosks with role-based actions
 * - Seasonal onboarding wizard
 * - Split shifts & cost centers
 * - Greek/English language support
 */

import { nanoid } from "nanoid";
import { storage } from "./storage";

export interface Property {
  propertyId: string;
  name: string;
  nameGr: string;
  location: string;
  timezone: string;
  geofence: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
  departments: Department[];
  seasonalPeriods: SeasonalPeriod[];
  isActive: boolean;
}

export interface Department {
  departmentId: string;
  name: string;
  nameGr: string;
  code: string; // HK, FB, FO, MAINT, etc.
  propertyId: string;
  kioskConfig: KioskConfig;
  costCenterId: string;
  managerIds: string[];
  defaultShiftPatterns: ShiftPattern[];
}

export interface KioskConfig {
  departmentId: string;
  language: 'GR' | 'EN' | 'BOTH';
  quickActions: QuickAction[];
  allowedRoles: string[];
  deviceBinding: boolean;
  biometricRequired: boolean;
  theme: {
    primaryColor: string;
    logoUrl?: string;
    backgroundUrl?: string;
  };
}

export interface QuickAction {
  actionId: string;
  icon: string;
  labelEn: string;
  labelGr: string;
  type: 'PUNCH' | 'BREAK' | 'MEAL' | 'SHIFT_CHANGE' | 'MAINTENANCE' | 'CLEANING';
  requiredRole?: string;
  targetCostCenter?: string;
  autoSubmitErgani: boolean;
}

export interface SeasonalPeriod {
  periodId: string;
  propertyId: string;
  name: string;
  nameGr: string;
  startDate: string;
  endDate: string;
  type: 'HIGH' | 'MEDIUM' | 'LOW' | 'CLOSED';
  expectedStaffCount: number;
  onboardingTemplate: OnboardingTemplate;
}

export interface OnboardingTemplate {
  templateId: string;
  name: string;
  nameGr: string;
  steps: OnboardingStep[];
  deviceProvisioningRequired: boolean;
  geofenceTemplateId?: string;
  batchImportMapping: Record<string, string>;
}

export interface OnboardingStep {
  stepId: string;
  order: number;
  titleEn: string;
  titleGr: string;
  type: 'DOCUMENT_UPLOAD' | 'TRAINING_VIDEO' | 'DIGITAL_SIGNATURE' | 'DEVICE_SETUP' | 'GEOFENCE_TEST';
  required: boolean;
  estimatedMinutes: number;
  instructions: {
    en: string;
    gr: string;
  };
}

export interface MultiPropertyEmployeeAssignment {
  assignmentId: string;
  employeeId: string;
  primaryPropertyId: string;
  secondaryProperties: {
    propertyId: string;
    departments: string[];
    maxHoursPerWeek: number;
    effectiveFrom: string;
    effectiveTo?: string;
  }[];
  rotationSchedule?: {
    pattern: 'WEEKLY' | 'MONTHLY' | 'SEASONAL';
    sequence: string[]; // property IDs in rotation order
    currentPosition: number;
  };
}

export interface SplitShift {
  shiftId: string;
  employeeId: string;
  date: string;
  segments: ShiftSegment[];
  totalHours: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ShiftSegment {
  segmentId: string;
  propertyId: string;
  departmentId: string;
  costCenterId: string;
  startTime: string;
  endTime: string;
  hours: number;
  breakMinutes: number;
  earningsCode: string;
  supervisorId?: string;
}

export interface ShiftPattern {
  patternId: string;
  name: string;
  nameGr: string;
  departmentId: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  isDefault: boolean;
}

export interface GeofenceTemplate {
  templateId: string;
  name: string;
  nameGr: string;
  zones: GeofenceZone[];
  propertyType: 'HOTEL' | 'RESORT' | 'RESTAURANT' | 'SPA';
}

export interface GeofenceZone {
  zoneId: string;
  name: string;
  nameGr: string;
  type: 'MAIN_BUILDING' | 'RESTAURANT' | 'POOL' | 'SPA' | 'PARKING' | 'BEACH' | 'GARDEN';
  coordinates: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  allowedActions: string[];
  restrictedTimes?: {
    start: string;
    end: string;
  };
}

export class HotelOperationsManager {
  private properties: Map<string, Property> = new Map();
  private multiPropertyAssignments: Map<string, MultiPropertyEmployeeAssignment> = new Map();
  private splitShifts: Map<string, SplitShift> = new Map();
  private onboardingTemplates: Map<string, OnboardingTemplate> = new Map();
  private geofenceTemplates: Map<string, GeofenceTemplate> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize sample hotel properties
    const princessHotel: Property = {
      propertyId: 'PRINCESS',
      name: 'Princess Hotel Mykonos',
      nameGr: 'Ξενοδοχείο Princess Μύκονος',
      location: 'Mykonos, Greece',
      timezone: 'Europe/Athens',
      geofence: {
        latitude: 37.4467,
        longitude: 25.3289,
        radius: 200
      },
      departments: [
        {
          departmentId: 'PRINCESS-FO',
          name: 'Front Office',
          nameGr: 'Υποδοχή',
          code: 'FO',
          propertyId: 'PRINCESS',
          costCenterId: 'PRINCESS-FO',
          managerIds: ['MGR_101'],
          defaultShiftPatterns: [
            {
              patternId: 'FO_MORNING',
              name: 'Morning Shift',
              nameGr: 'Πρωινή Βάρδια',
              departmentId: 'PRINCESS-FO',
              startTime: '07:00',
              endTime: '15:00',
              breakMinutes: 30,
              daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
              isDefault: true
            }
          ],
          kioskConfig: {
            departmentId: 'PRINCESS-FO',
            language: 'BOTH',
            allowedRoles: ['RECEPTIONIST', 'FRONT_OFFICE_MANAGER', 'GUEST_RELATIONS'],
            deviceBinding: true,
            biometricRequired: false,
            theme: {
              primaryColor: '#1e40af',
              logoUrl: '/public-objects/logos/princess-logo.png'
            },
            quickActions: [
              {
                actionId: 'fo_check_in',
                icon: '🏨',
                labelEn: 'Check In',
                labelGr: 'Check In',
                type: 'PUNCH',
                autoSubmitErgani: true
              },
              {
                actionId: 'fo_check_out',
                icon: '🚪',
                labelEn: 'Check Out',
                labelGr: 'Check Out',
                type: 'PUNCH',
                autoSubmitErgani: true
              },
              {
                actionId: 'fo_break',
                icon: '☕',
                labelEn: 'Break',
                labelGr: 'Διάλειμμα',
                type: 'BREAK',
                autoSubmitErgani: false
              }
            ]
          }
        },
        {
          departmentId: 'PRINCESS-HK',
          name: 'Housekeeping',
          nameGr: 'Καθαριότητα',
          code: 'HK',
          propertyId: 'PRINCESS',
          costCenterId: 'PRINCESS-HK',
          managerIds: ['MGR_102'],
          defaultShiftPatterns: [
            {
              patternId: 'HK_STANDARD',
              name: 'Standard Cleaning',
              nameGr: 'Κανονικός Καθαρισμός',
              departmentId: 'PRINCESS-HK',
              startTime: '09:00',
              endTime: '17:00',
              breakMinutes: 45,
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              isDefault: true
            }
          ],
          kioskConfig: {
            departmentId: 'PRINCESS-HK',
            language: 'BOTH',
            allowedRoles: ['HOUSEKEEPER', 'HOUSEKEEPING_SUPERVISOR', 'ROOM_ATTENDANT'],
            deviceBinding: true,
            biometricRequired: true,
            theme: {
              primaryColor: '#059669',
              logoUrl: '/public-objects/logos/princess-logo.png'
            },
            quickActions: [
              {
                actionId: 'hk_start_shift',
                icon: '🧹',
                labelEn: 'Start Cleaning',
                labelGr: 'Έναρξη Καθαρισμού',
                type: 'PUNCH',
                autoSubmitErgani: true
              },
              {
                actionId: 'hk_room_complete',
                icon: '✅',
                labelEn: 'Room Complete',
                labelGr: 'Ολοκλήρωση Δωματίου',
                type: 'CLEANING',
                autoSubmitErgani: false
              },
              {
                actionId: 'hk_maintenance',
                icon: '🔧',
                labelEn: 'Maintenance Request',
                labelGr: 'Αίτημα Συντήρησης',
                type: 'MAINTENANCE',
                autoSubmitErgani: false
              }
            ]
          }
        },
        {
          departmentId: 'PRINCESS-FB',
          name: 'Food & Beverage',
          nameGr: 'Εστίαση',
          code: 'FB',
          propertyId: 'PRINCESS',
          costCenterId: 'PRINCESS-FB',
          managerIds: ['MGR_103'],
          defaultShiftPatterns: [
            {
              patternId: 'FB_BREAKFAST',
              name: 'Breakfast Service',
              nameGr: 'Υπηρεσία Πρωινού',
              departmentId: 'PRINCESS-FB',
              startTime: '06:00',
              endTime: '11:00',
              breakMinutes: 15,
              daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
              isDefault: false
            },
            {
              patternId: 'FB_DINNER',
              name: 'Dinner Service',
              nameGr: 'Υπηρεσία Δείπνου',
              departmentId: 'PRINCESS-FB',
              startTime: '18:00',
              endTime: '24:00',
              breakMinutes: 30,
              daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
              isDefault: true
            }
          ],
          kioskConfig: {
            departmentId: 'PRINCESS-FB',
            language: 'BOTH',
            allowedRoles: ['WAITER', 'BARTENDER', 'CHEF', 'KITCHEN_ASSISTANT', 'FB_MANAGER'],
            deviceBinding: false,
            biometricRequired: false,
            theme: {
              primaryColor: '#dc2626',
              logoUrl: '/public-objects/logos/princess-logo.png'
            },
            quickActions: [
              {
                actionId: 'fb_service_start',
                icon: '🍽️',
                labelEn: 'Start Service',
                labelGr: 'Έναρξη Υπηρεσίας',
                type: 'PUNCH',
                autoSubmitErgani: true
              },
              {
                actionId: 'fb_meal_break',
                icon: '🥘',
                labelEn: 'Meal Break',
                labelGr: 'Διάλειμμα Φαγητού',
                type: 'MEAL',
                autoSubmitErgani: false
              },
              {
                actionId: 'fb_shift_change',
                icon: '🔄',
                labelEn: 'Shift Change',
                labelGr: 'Αλλαγή Βάρδιας',
                type: 'SHIFT_CHANGE',
                targetCostCenter: 'PRINCESS-FB-NIGHT',
                autoSubmitErgani: true
              }
            ]
          }
        }
      ],
      seasonalPeriods: [
        {
          periodId: 'SUMMER_2025',
          propertyId: 'PRINCESS',
          name: 'Summer Season 2025',
          nameGr: 'Καλοκαιρινή Περίοδος 2025',
          startDate: '2025-05-01',
          endDate: '2025-10-31',
          type: 'HIGH',
          expectedStaffCount: 150,
          onboardingTemplate: {
            templateId: 'HOTEL_SUMMER_ONBOARDING',
            name: 'Summer Staff Onboarding',
            nameGr: 'Εισαγωγή Καλοκαιρινού Προσωπικού',
            deviceProvisioningRequired: true,
            geofenceTemplateId: 'MYKONOS_HOTEL',
            batchImportMapping: {
              'AFM': 'taxNumber',
              'AMKA': 'socialSecurityNumber',
              'Name': 'firstName',
              'Surname': 'lastName',
              'Department': 'department',
              'Position': 'position',
              'Phone': 'phoneNumber',
              'Email': 'email'
            },
            steps: [
              {
                stepId: 'docs_upload',
                order: 1,
                titleEn: 'Upload Documents',
                titleGr: 'Ανέβασμα Εγγράφων',
                type: 'DOCUMENT_UPLOAD',
                required: true,
                estimatedMinutes: 10,
                instructions: {
                  en: 'Please upload your ID, tax number (AFM), and social security (AMKA) documents',
                  gr: 'Παρακαλώ ανεβάστε την ταυτότητά σας, τον ΑΦΜ και το ΑΜΚΑ'
                }
              },
              {
                stepId: 'safety_training',
                order: 2,
                titleEn: 'Safety Training Video',
                titleGr: 'Βίντεο Εκπαίδευσης Ασφάλειας',
                type: 'TRAINING_VIDEO',
                required: true,
                estimatedMinutes: 15,
                instructions: {
                  en: 'Watch the hotel safety and emergency procedures video',
                  gr: 'Παρακολουθήστε το βίντεο για την ασφάλεια και τις διαδικασίες έκτακτης ανάγκης'
                }
              },
              {
                stepId: 'device_setup',
                order: 3,
                titleEn: 'Device Setup',
                titleGr: 'Ρύθμιση Συσκευής',
                type: 'DEVICE_SETUP',
                required: true,
                estimatedMinutes: 5,
                instructions: {
                  en: 'Set up your mobile device for time tracking and digital work card',
                  gr: 'Ρυθμίστε την κινητή σας συσκευή για την καταγραφή ωρών και την ψηφιακή κάρτα εργασίας'
                }
              },
              {
                stepId: 'contract_signature',
                order: 4,
                titleEn: 'Sign Employment Contract',
                titleGr: 'Υπογραφή Συμβολαίου Εργασίας',
                type: 'DIGITAL_SIGNATURE',
                required: true,
                estimatedMinutes: 5,
                instructions: {
                  en: 'Review and digitally sign your employment contract',
                  gr: 'Εξετάστε και υπογράψτε ψηφιακά το συμβόλαιο εργασίας σας'
                }
              },
              {
                stepId: 'geofence_test',
                order: 5,
                titleEn: 'Location Test',
                titleGr: 'Δοκιμή Τοποθεσίας',
                type: 'GEOFENCE_TEST',
                required: true,
                estimatedMinutes: 3,
                instructions: {
                  en: 'Test location services by punching in at your assigned department',
                  gr: 'Δοκιμάστε τις υπηρεσίες τοποθεσίας κάνοντας check-in στο τμήμα σας'
                }
              }
            ]
          }
        }
      ],
      isActive: true
    };

    this.properties.set('PRINCESS', princessHotel);

    // Initialize geofence templates
    const mykonosHotelTemplate: GeofenceTemplate = {
      templateId: 'MYKONOS_HOTEL',
      name: 'Mykonos Hotel Template',
      nameGr: 'Πρότυπο Ξενοδοχείου Μυκόνου',
      propertyType: 'HOTEL',
      zones: [
        {
          zoneId: 'MAIN_BUILDING',
          name: 'Main Building',
          nameGr: 'Κυρίως Κτίριο',
          type: 'MAIN_BUILDING',
          coordinates: {
            latitude: 37.4467,
            longitude: 25.3289,
            radius: 50
          },
          allowedActions: ['PUNCH_IN', 'PUNCH_OUT', 'BREAK_START', 'BREAK_END']
        },
        {
          zoneId: 'RESTAURANT',
          name: 'Restaurant Area',
          nameGr: 'Χώρος Εστιατορίου',
          type: 'RESTAURANT',
          coordinates: {
            latitude: 37.4465,
            longitude: 25.3291,
            radius: 30
          },
          allowedActions: ['PUNCH_IN', 'PUNCH_OUT', 'MEAL_BREAK'],
          restrictedTimes: {
            start: '23:00',
            end: '06:00'
          }
        },
        {
          zoneId: 'POOL_AREA',
          name: 'Pool & Beach',
          nameGr: 'Πισίνα & Παραλία',
          type: 'POOL',
          coordinates: {
            latitude: 37.4463,
            longitude: 25.3287,
            radius: 40
          },
          allowedActions: ['PUNCH_IN', 'PUNCH_OUT']
        }
      ]
    };

    this.geofenceTemplates.set('MYKONOS_HOTEL', mykonosHotelTemplate);
  }

  /**
   * Multi-Property Employee Management
   */
  async assignEmployeeToMultipleProperties(
    employeeId: string,
    primaryPropertyId: string,
    secondaryAssignments: MultiPropertyEmployeeAssignment['secondaryProperties']
  ): Promise<MultiPropertyEmployeeAssignment> {
    const assignment: MultiPropertyEmployeeAssignment = {
      assignmentId: nanoid(12),
      employeeId,
      primaryPropertyId,
      secondaryProperties: secondaryAssignments
    };

    this.multiPropertyAssignments.set(assignment.assignmentId, assignment);
    console.log(`[HOTEL OPS] Employee ${employeeId} assigned to multiple properties`);
    return assignment;
  }

  async createRotationSchedule(
    employeeId: string,
    propertySequence: string[],
    pattern: 'WEEKLY' | 'MONTHLY' | 'SEASONAL'
  ): Promise<void> {
    // Find existing assignment
    const assignment = Array.from(this.multiPropertyAssignments.values())
      .find(a => a.employeeId === employeeId);

    if (assignment) {
      assignment.rotationSchedule = {
        pattern,
        sequence: propertySequence,
        currentPosition: 0
      };
      this.multiPropertyAssignments.set(assignment.assignmentId, assignment);
      console.log(`[HOTEL OPS] Rotation schedule created for employee ${employeeId}`);
    }
  }

  /**
   * Department Kiosk Operations
   */
  getKioskConfig(departmentId: string, language: 'GR' | 'EN' = 'EN'): KioskConfig | null {
    for (const property of this.properties.values()) {
      const department = property.departments.find(d => d.departmentId === departmentId);
      if (department) {
        return department.kioskConfig;
      }
    }
    return null;
  }

  async executeKioskAction(
    departmentId: string,
    actionId: string,
    employeeId: string,
    metadata?: any
  ): Promise<{ success: boolean; message: string; messageGr: string }> {
    const kioskConfig = this.getKioskConfig(departmentId);
    if (!kioskConfig) {
      return {
        success: false,
        message: 'Department kiosk not found',
        messageGr: 'Το kiosk του τμήματος δεν βρέθηκε'
      };
    }

    const action = kioskConfig.quickActions.find(a => a.actionId === actionId);
    if (!action) {
      return {
        success: false,
        message: 'Action not available',
        messageGr: 'Η ενέργεια δεν είναι διαθέσιμη'
      };
    }

    // Execute action based on type
    switch (action.type) {
      case 'PUNCH':
        await this.processPunchAction(employeeId, departmentId, action, metadata);
        break;
      case 'BREAK':
        await this.processBreakAction(employeeId, departmentId, action, metadata);
        break;
      case 'MEAL':
        await this.processMealAction(employeeId, departmentId, action, metadata);
        break;
      case 'SHIFT_CHANGE':
        await this.processShiftChangeAction(employeeId, departmentId, action, metadata);
        break;
      case 'MAINTENANCE':
        await this.processMaintenanceAction(employeeId, departmentId, action, metadata);
        break;
      case 'CLEANING':
        await this.processCleaningAction(employeeId, departmentId, action, metadata);
        break;
    }

    console.log(`[HOTEL OPS] Kiosk action ${actionId} executed for employee ${employeeId}`);
    
    return {
      success: true,
      message: `${action.labelEn} completed successfully`,
      messageGr: `${action.labelGr} ολοκληρώθηκε επιτυχώς`
    };
  }

  /**
   * Seasonal Onboarding Wizard
   */
  async startSeasonalOnboarding(
    seasonalPeriodId: string,
    batchEmployees: any[]
  ): Promise<{
    onboardingSessionId: string;
    totalEmployees: number;
    estimatedCompletionMinutes: number;
    nextStep: string;
  }> {
    const property = Array.from(this.properties.values())
      .find(p => p.seasonalPeriods.some(sp => sp.periodId === seasonalPeriodId));

    if (!property) {
      throw new Error('Seasonal period not found');
    }

    const seasonalPeriod = property.seasonalPeriods
      .find(sp => sp.periodId === seasonalPeriodId)!;

    const onboardingSessionId = nanoid(12);
    const template = seasonalPeriod.onboardingTemplate;
    const estimatedMinutes = template.steps.reduce((sum, step) => sum + step.estimatedMinutes, 0);

    // Process batch import
    await this.processBatchImport(batchEmployees, template.batchImportMapping);

    console.log(`[HOTEL OPS] Seasonal onboarding started: ${onboardingSessionId} for ${batchEmployees.length} employees`);

    return {
      onboardingSessionId,
      totalEmployees: batchEmployees.length,
      estimatedCompletionMinutes: estimatedMinutes,
      nextStep: template.steps[0].titleEn
    };
  }

  async processBatchImport(
    employees: any[],
    mapping: Record<string, string>
  ): Promise<void> {
    for (const emp of employees) {
      const mappedEmployee: any = {};
      
      // Map fields according to template
      for (const [sourceField, targetField] of Object.entries(mapping)) {
        if (emp[sourceField]) {
          mappedEmployee[targetField] = emp[sourceField];
        }
      }

      // Create employee record (in a real system)
      console.log(`[HOTEL OPS] Batch importing employee: ${mappedEmployee.firstName} ${mappedEmployee.lastName}`);
    }
  }

  /**
   * Split Shifts & Cost Centers
   */
  async createSplitShift(
    employeeId: string,
    date: string,
    segments: Omit<ShiftSegment, 'segmentId'>[]
  ): Promise<SplitShift> {
    const shiftSegments: ShiftSegment[] = segments.map(segment => ({
      ...segment,
      segmentId: nanoid(8)
    }));

    const totalHours = shiftSegments.reduce((sum, segment) => sum + segment.hours, 0);

    const splitShift: SplitShift = {
      shiftId: nanoid(12),
      employeeId,
      date,
      segments: shiftSegments,
      totalHours,
      status: 'SCHEDULED'
    };

    this.splitShifts.set(splitShift.shiftId, splitShift);
    console.log(`[HOTEL OPS] Split shift created: ${splitShift.shiftId} with ${segments.length} segments`);
    
    return splitShift;
  }

  async validateCrossDepartmentCoverage(
    employeeId: string,
    fromDepartment: string,
    toDepartment: string,
    date: string
  ): Promise<{ allowed: boolean; reason: string; reasonGr: string }> {
    // Check if employee is qualified for cross-department work
    const assignment = Array.from(this.multiPropertyAssignments.values())
      .find(a => a.employeeId === employeeId);

    if (!assignment) {
      return {
        allowed: false,
        reason: 'Employee not assigned to multiple departments',
        reasonGr: 'Ο εργαζόμενος δεν έχει ανατεθεί σε πολλαπλά τμήματα'
      };
    }

    // Check if target department is in allowed list
    const hasAccess = assignment.secondaryProperties.some(prop => 
      prop.departments.includes(toDepartment)
    );

    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'Employee not authorized for target department',
        reasonGr: 'Ο εργαζόμενος δεν έχει εξουσιοδότηση για το στοχευμένο τμήμα'
      };
    }

    return {
      allowed: true,
      reason: 'Cross-department coverage approved',
      reasonGr: 'Η κάλυψη μεταξύ τμημάτων εγκρίθηκε'
    };
  }

  /**
   * Helper methods for kiosk actions
   */
  private async processPunchAction(
    employeeId: string,
    departmentId: string,
    action: QuickAction,
    metadata: any
  ): Promise<void> {
    // Create punch event with department context
    await storage.createPunchEvent({
      employeeId,
      propertyId: departmentId.split('-')[0],
      timestamp: new Date(),
      type: metadata?.type || 'IN',
      method: 'KIOSK',
      sourceDeviceId: metadata?.deviceId,
      metadata: JSON.stringify({
        departmentId,
        actionId: action.actionId,
        kioskAction: true
      })
    });

    // Submit to ERGANI if required
    if (action.autoSubmitErgani) {
      console.log(`[HOTEL OPS] Auto-submitting to ERGANI for action ${action.actionId}`);
    }
  }

  private async processBreakAction(
    employeeId: string,
    departmentId: string,
    action: QuickAction,
    metadata: any
  ): Promise<void> {
    console.log(`[HOTEL OPS] Processing break action for ${employeeId} in ${departmentId}`);
  }

  private async processMealAction(
    employeeId: string,
    departmentId: string,
    action: QuickAction,
    metadata: any
  ): Promise<void> {
    console.log(`[HOTEL OPS] Processing meal action for ${employeeId} in ${departmentId}`);
  }

  private async processShiftChangeAction(
    employeeId: string,
    departmentId: string,
    action: QuickAction,
    metadata: any
  ): Promise<void> {
    if (action.targetCostCenter) {
      console.log(`[HOTEL OPS] Shift change from ${departmentId} to ${action.targetCostCenter}`);
    }
  }

  private async processMaintenanceAction(
    employeeId: string,
    departmentId: string,
    action: QuickAction,
    metadata: any
  ): Promise<void> {
    console.log(`[HOTEL OPS] Maintenance request from ${departmentId}: ${metadata?.description}`);
  }

  private async processCleaningAction(
    employeeId: string,
    departmentId: string,
    action: QuickAction,
    metadata: any
  ): Promise<void> {
    console.log(`[HOTEL OPS] Cleaning action completed in ${departmentId}: ${metadata?.roomNumber}`);
  }

  /**
   * Getters
   */
  getProperties(): Property[] {
    return Array.from(this.properties.values());
  }

  getProperty(propertyId: string): Property | undefined {
    return this.properties.get(propertyId);
  }

  getDepartments(propertyId: string): Department[] {
    const property = this.properties.get(propertyId);
    return property ? property.departments : [];
  }

  getMultiPropertyAssignments(): MultiPropertyEmployeeAssignment[] {
    return Array.from(this.multiPropertyAssignments.values());
  }

  getSplitShifts(employeeId?: string, date?: string): SplitShift[] {
    let shifts = Array.from(this.splitShifts.values());
    
    if (employeeId) {
      shifts = shifts.filter(shift => shift.employeeId === employeeId);
    }
    
    if (date) {
      shifts = shifts.filter(shift => shift.date === date);
    }
    
    return shifts;
  }

  getGeofenceTemplates(): GeofenceTemplate[] {
    return Array.from(this.geofenceTemplates.values());
  }

  getOnboardingTemplates(): OnboardingTemplate[] {
    return Array.from(this.onboardingTemplates.values());
  }
}

// Global instance
export const hotelOperationsManager = new HotelOperationsManager();