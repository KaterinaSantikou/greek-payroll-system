import { db } from "./db";
import { employees, type Employee } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface ComplianceRecommendation {
  id: string;
  type: "WARNING" | "ERROR" | "INFO" | "SUCCESS";
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: "IDENTIFICATION" | "EFKA" | "WORKER_CLASSIFICATION" | "FOREIGN_WORKER" | "DISABILITY" | "GENERAL";
  title: string;
  description: string;
  actionRequired: string;
  deadline?: Date;
  affectedEmployees?: string[];
  autoFixAvailable?: boolean;
}

export class ComplianceRecommendationEngine {
  private currentDate: Date;

  constructor() {
    this.currentDate = new Date();
  }

  /**
   * Generate comprehensive compliance recommendations for an employee
   */
  async generateRecommendations(employeeId: string): Promise<ComplianceRecommendation[]> {
    const employee = await db.select().from(employees).where(eq(employees.id, employeeId)).then(result => result[0]);
    
    if (!employee) {
      return [];
    }

    const recommendations: ComplianceRecommendation[] = [];

    // Check identification compliance
    recommendations.push(...this.checkIdentificationCompliance(employee));
    
    // Check EFKA insurance compliance
    recommendations.push(...this.checkEfkaCompliance(employee));
    
    // Check worker classification compliance
    recommendations.push(...this.checkWorkerClassificationCompliance(employee));
    
    // Check foreign worker compliance
    recommendations.push(...this.checkForeignWorkerCompliance(employee));
    
    // Check disability compliance
    recommendations.push(...this.checkDisabilityCompliance(employee));
    
    // Check general compliance
    recommendations.push(...this.checkGeneralCompliance(employee));

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate organization-wide compliance recommendations
   */
  async generateOrganizationRecommendations(): Promise<ComplianceRecommendation[]> {
    const allEmployees = await db.select().from(employees);
    const recommendations: ComplianceRecommendation[] = [];

    // Check disability quota compliance (8% for companies with 50+ employees)
    if (allEmployees.length >= 50) {
      const disabledEmployees = allEmployees.filter(emp => emp.disabilityPercentage > 0);
      const requiredQuota = Math.ceil(allEmployees.length * 0.08);
      
      if (disabledEmployees.length < requiredQuota) {
        recommendations.push({
          id: `disability-quota-${Date.now()}`,
          type: "WARNING",
          priority: "HIGH",
          category: "DISABILITY",
          title: "Ποσόστωση Ατόμων με Αναπηρία",
          description: `Η επιχείρηση απαιτεί ${requiredQuota} άτομα με αναπηρία (8% του συνόλου). Έχετε ${disabledEmployees.length} από ${requiredQuota}.`,
          actionRequired: "Προσλάβετε άτομα με αναπηρία ή πληρώστε το ισοδύναμο πρόστιμο",
          deadline: new Date(this.currentDate.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
          affectedEmployees: allEmployees.map(emp => emp.id)
        });
      }
    }

    // Check young worker subsidies
    const youngWorkers = allEmployees.filter(emp => emp.youngWorkerStatus);
    if (youngWorkers.length > 0) {
      recommendations.push({
        id: `young-worker-subsidies-${Date.now()}`,
        type: "INFO",
        priority: "MEDIUM",
        category: "WORKER_CLASSIFICATION",
        title: "Επιδοτήσεις Νέων Εργαζομένων",
        description: `Έχετε ${youngWorkers.length} νέους εργαζομένους που δικαιούνται επιδοτήσεις.`,
        actionRequired: "Υποβάλετε αίτηση για επιδοτήσεις στον ΟΑΕΔ",
        affectedEmployees: youngWorkers.map(emp => emp.id),
        autoFixAvailable: true
      });
    }

    // Check expiring documents
    const expiringDocuments = this.checkExpiringDocuments(allEmployees);
    recommendations.push(...expiringDocuments);

    return recommendations;
  }

  private checkIdentificationCompliance(employee: Employee): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    // Check AFM validation
    if (!employee.afm || !this.validateAfm(employee.afm)) {
      recommendations.push({
        id: `afm-invalid-${employee.id}`,
        type: "ERROR",
        priority: "HIGH",
        category: "IDENTIFICATION",
        title: "Μη έγκυρος ΑΦΜ",
        description: "Ο ΑΦΜ του εργαζομένου δεν είναι έγκυρος ή λείπει",
        actionRequired: "Ενημερώστε τον ΑΦΜ με έγκυρο 9-ψήφιο αριθμό",
        affectedEmployees: [employee.id]
      });
    }

    // Check AMKA validation
    if (!employee.amka || !this.validateAmka(employee.amka)) {
      recommendations.push({
        id: `amka-invalid-${employee.id}`,
        type: "ERROR",
        priority: "HIGH",
        category: "IDENTIFICATION",
        title: "Μη έγκυρος ΑΜΚΑ",
        description: "Ο ΑΜΚΑ του εργαζομένου δεν είναι έγκυρος ή λείπει",
        actionRequired: "Ενημερώστε τον ΑΜΚΑ με έγκυρο 11-ψήφιο αριθμό",
        affectedEmployees: [employee.id]
      });
    }

    return recommendations;
  }

  private checkEfkaCompliance(employee: Employee): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    if (!employee.efkaRegistry) {
      recommendations.push({
        id: `efka-missing-${employee.id}`,
        type: "ERROR",
        priority: "HIGH",
        category: "EFKA",
        title: "Λείπει Αριθμός Μητρώου ΕΦΚΑ",
        description: "Ο εργαζόμενος δεν έχει αριθμό μητρώου ΕΦΚΑ",
        actionRequired: "Καταχωρίστε τον εργαζόμενο στο ΕΦΚΑ",
        affectedEmployees: [employee.id]
      });
    }

    if (!employee.efkaInsuranceCategory) {
      recommendations.push({
        id: `efka-category-missing-${employee.id}`,
        type: "WARNING",
        priority: "MEDIUM",
        category: "EFKA",
        title: "Λείπει Κατηγορία Ασφάλισης ΕΦΚΑ",
        description: "Δεν έχει οριστεί κατηγορία ασφάλισης για τον εργαζόμενο",
        actionRequired: "Ορίστε την κατηγορία ασφάλισης (ΙΚΑ, ΟΑΕΕ, ΕΤΑΑ)",
        affectedEmployees: [employee.id]
      });
    }

    return recommendations;
  }

  private checkWorkerClassificationCompliance(employee: Employee): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    if (!employee.workerClassification) {
      recommendations.push({
        id: `worker-class-missing-${employee.id}`,
        type: "ERROR",
        priority: "HIGH",
        category: "WORKER_CLASSIFICATION",
        title: "Λείπει Κατηγοριοποίηση Εργαζομένου",
        description: "Δεν έχει οριστεί η κατηγορία του εργαζομένου",
        actionRequired: "Ορίστε την κατηγορία (Μισθωτός, Ανεξάρτητος Συνεργάτης, κ.λπ.)",
        affectedEmployees: [employee.id]
      });
    }

    // Check if young worker status is correctly set
    if (employee.dateOfBirth) {
      const age = this.calculateAge(new Date(employee.dateOfBirth));
      if (age < 25 && !employee.youngWorkerStatus) {
        recommendations.push({
          id: `young-worker-status-${employee.id}`,
          type: "INFO",
          priority: "MEDIUM",
          category: "WORKER_CLASSIFICATION",
          title: "Δικαιούται Προστασία Νέου Εργαζομένου",
          description: `Ο εργαζόμενος είναι ${age} ετών και δικαιούται ειδικές προστασίες`,
          actionRequired: "Ενεργοποιήστε την προστασία νέου εργαζομένου για επιδοτήσεις",
          affectedEmployees: [employee.id],
          autoFixAvailable: true
        });
      }
    }

    return recommendations;
  }

  private checkForeignWorkerCompliance(employee: Employee): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    // Check if foreign worker (non-Greek nationality)
    if (employee.nationality && employee.nationality !== "GR") {
      if (!employee.residencyStatus) {
        recommendations.push({
          id: `residency-status-missing-${employee.id}`,
          type: "ERROR",
          priority: "HIGH",
          category: "FOREIGN_WORKER",
          title: "Λείπει Κατάσταση Διαμονής",
          description: "Δεν έχει οριστεί η κατάσταση διαμονής για αλλοδαπό εργαζόμενο",
          actionRequired: "Ορίστε την κατάσταση διαμονής (Πολίτης ΕΕ, Μόνιμος Κάτοικος, κ.λπ.)",
          affectedEmployees: [employee.id]
        });
      }

      if (!employee.passportNumber) {
        recommendations.push({
          id: `passport-missing-${employee.id}`,
          type: "ERROR",
          priority: "HIGH",
          category: "FOREIGN_WORKER",
          title: "Λείπει Αριθμός Διαβατηρίου",
          description: "Απαιτείται αριθμός διαβατηρίου για αλλοδαπό εργαζόμενο",
          actionRequired: "Εισάγετε τον αριθμό διαβατηρίου",
          affectedEmployees: [employee.id]
        });
      }

      // Check work permit for non-EU citizens
      if (employee.residencyStatus === "NON_EU_TEMPORARY" || employee.residencyStatus === "NON_EU_PERMANENT") {
        if (!employee.workPermitNumber) {
          recommendations.push({
            id: `work-permit-missing-${employee.id}`,
            type: "ERROR",
            priority: "HIGH",
            category: "FOREIGN_WORKER",
            title: "Λείπει Άδεια Εργασίας",
            description: "Απαιτείται άδεια εργασίας για εργαζόμενο από τρίτη χώρα",
            actionRequired: "Εισάγετε τον αριθμό άδειας εργασίας",
            affectedEmployees: [employee.id]
          });
        }
      }
    }

    return recommendations;
  }

  private checkDisabilityCompliance(employee: Employee): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    if (employee.disabilityPercentage > 0) {
      if (!employee.disabilityCertificateNumber) {
        recommendations.push({
          id: `disability-cert-missing-${employee.id}`,
          type: "WARNING",
          priority: "MEDIUM",
          category: "DISABILITY",
          title: "Λείπει Πιστοποιητικό Αναπηρίας",
          description: "Δεν έχει εισαχθεί αριθμός πιστοποιητικού αναπηρίας",
          actionRequired: "Εισάγετε τον αριθμό πιστοποιητικού από ΚΕΠΑ",
          affectedEmployees: [employee.id]
        });
      }

      if (!employee.disabilityType) {
        recommendations.push({
          id: `disability-type-missing-${employee.id}`,
          type: "INFO",
          priority: "LOW",
          category: "DISABILITY",
          title: "Λείπει Τύπος Αναπηρίας",
          description: "Δεν έχει οριστεί ο τύπος αναπηρίας για καλύτερη διαχείριση",
          actionRequired: "Ορίστε τον τύπο αναπηρίας (Σωματική, Διανοητική, κ.λπ.)",
          affectedEmployees: [employee.id]
        });
      }
    }

    return recommendations;
  }

  private checkGeneralCompliance(employee: Employee): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    if (!employee.taxOffice) {
      recommendations.push({
        id: `tax-office-missing-${employee.id}`,
        type: "WARNING",
        priority: "MEDIUM",
        category: "GENERAL",
        title: "Λείπει ΔΟΥ",
        description: "Δεν έχει οριστεί η Δημόσια Οικονομική Υπηρεσία",
        actionRequired: "Ορίστε το ΔΟΥ του εργαζομένου",
        affectedEmployees: [employee.id]
      });
    }

    if (!employee.collectiveAgreementId) {
      recommendations.push({
        id: `collective-agreement-missing-${employee.id}`,
        type: "INFO",
        priority: "LOW",
        category: "GENERAL",
        title: "Λείπει Συλλογική Σύμβαση",
        description: "Δεν έχει εκχωρηθεί συλλογική σύμβαση",
        actionRequired: "Εκχωρήστε την κατάλληλη συλλογική σύμβαση",
        affectedEmployees: [employee.id]
      });
    }

    return recommendations;
  }

  private checkExpiringDocuments(employees: Employee[]): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];
    const threeMonthsFromNow = new Date(this.currentDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    employees.forEach(employee => {
      // Check work permit expiry
      if (employee.workPermitExpiryDate) {
        const expiryDate = new Date(employee.workPermitExpiryDate);
        if (expiryDate <= threeMonthsFromNow) {
          recommendations.push({
            id: `work-permit-expiring-${employee.id}`,
            type: expiryDate <= this.currentDate ? "ERROR" : "WARNING",
            priority: "HIGH",
            category: "FOREIGN_WORKER",
            title: "Άδεια Εργασίας Λήγει",
            description: `Η άδεια εργασίας του ${employee.firstName} ${employee.lastName} λήγει στις ${expiryDate.toLocaleDateString('el-GR')}`,
            actionRequired: "Ανανεώστε την άδεια εργασίας άμεσα",
            deadline: expiryDate,
            affectedEmployees: [employee.id]
          });
        }
      }

      // Check residence permit expiry
      if (employee.residencePermitExpiryDate) {
        const expiryDate = new Date(employee.residencePermitExpiryDate);
        if (expiryDate <= threeMonthsFromNow) {
          recommendations.push({
            id: `residence-permit-expiring-${employee.id}`,
            type: expiryDate <= this.currentDate ? "ERROR" : "WARNING",
            priority: "HIGH",
            category: "FOREIGN_WORKER",
            title: "Άδεια Διαμονής Λήγει",
            description: `Η άδεια διαμονής του ${employee.firstName} ${employee.lastName} λήγει στις ${expiryDate.toLocaleDateString('el-GR')}`,
            actionRequired: "Ανανεώστε την άδεια διαμονής άμεσα",
            deadline: expiryDate,
            affectedEmployees: [employee.id]
          });
        }
      }

      // Check passport expiry
      if (employee.passportExpiryDate) {
        const expiryDate = new Date(employee.passportExpiryDate);
        if (expiryDate <= threeMonthsFromNow) {
          recommendations.push({
            id: `passport-expiring-${employee.id}`,
            type: expiryDate <= this.currentDate ? "WARNING" : "INFO",
            priority: "MEDIUM",
            category: "FOREIGN_WORKER",
            title: "Διαβατήριο Λήγει",
            description: `Το διαβατήριο του ${employee.firstName} ${employee.lastName} λήγει στις ${expiryDate.toLocaleDateString('el-GR')}`,
            actionRequired: "Ενημερώστε τον εργαζόμενο για ανανέωση διαβατηρίου",
            deadline: expiryDate,
            affectedEmployees: [employee.id]
          });
        }
      }
    });

    return recommendations;
  }

  private validateAfm(afm: string): boolean {
    if (afm.length !== 9 || !/^\d+$/.test(afm)) {
      return false;
    }

    const digits = afm.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      sum += digits[i] * Math.pow(2, 8 - i);
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 10 ? remainder : 0;

    return digits[8] === checkDigit;
  }

  private validateAmka(amka: string): boolean {
    if (amka.length !== 11 || !/^\d+$/.test(amka)) {
      return false;
    }

    const digits = amka.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 2);
      if (digits[i] * (i % 2 === 0 ? 1 : 2) > 9) {
        sum -= 9;
      }
    }

    return (10 - (sum % 10)) % 10 === digits[10];
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}