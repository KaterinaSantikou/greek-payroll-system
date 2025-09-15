import { db } from "./db";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import {
  esrsTaxonomy,
  s1XbrlInstances,
  s1ReportSections,
  s1DataLineage,
  csrdReportingPeriods,
  type EsrsTaxonomy,
  type InsertEsrsTaxonomy,
  type S1XbrlInstances,
  type InsertS1XbrlInstances,
  type S1ReportSections,
  type InsertS1ReportSections,
} from "@shared/schema";

/**
 * XBRL Tagging Service for ESRS Set 1 Taxonomy
 * Handles XBRL instance generation, taxonomy management, and human-readable reporting
 * Supports taxonomy updates and versioning
 */
export class XBRLTaggingService {
  /**
   * Load ESRS Set 1 Taxonomy elements
   * Initialize with current ESRS taxonomy definitions
   */
  async loadESRSSet1Taxonomy(taxonomyVersion: string = "ESRS_Set1_2025"): Promise<EsrsTaxonomy[]> {
    const taxonomyElements: InsertEsrsTaxonomy[] = [
      // ESRS S1-6: Workforce characteristics
      {
        taxonomyVersion,
        effectiveDate: "2024-01-01",
        isActive: true,
        elementId: "esrs-s1:TotalNumberOfEmployees",
        elementName: "Total number of employees",
        elementType: "count",
        esrsStandard: "ESRS S1",
        esrsSection: "S1-6",
        metricCode: "S1-6-EMPLOYEES",
        namespace: "http://esrs-s1.eu/taxonomy/2025",
        dataType: "xbrli:nonNegativeInteger",
        periodType: "instant",
        label: "Total number of employees at the end of the reporting period",
        documentation: "The total number of employees in the undertaking at the end of the reporting period, disaggregated by head office/headquarters and significant countries of operation.",
        calculationFormula: "Sum of all active employees at period end",
      },
      {
        taxonomyVersion,
        effectiveDate: "2024-01-01",
        isActive: true,
        elementId: "esrs-s1:TotalNumberOfEmployeesFTE",
        elementName: "Total number of employees (FTE)",
        elementType: "count",
        esrsStandard: "ESRS S1",
        esrsSection: "S1-6",
        metricCode: "S1-6-FTE",
        namespace: "http://esrs-s1.eu/taxonomy/2025",
        dataType: "xbrli:decimal",
        periodType: "instant",
        label: "Total number of employees expressed in full-time equivalents",
        documentation: "Total number of employees expressed in full-time equivalents (FTE), disaggregated by head office/headquarters and significant countries of operation.",
        calculationFormula: "Sum of (employee_count * fte_percentage) / 100",
      },
      
      // ESRS S1-16: Gender pay gap
      {
        taxonomyVersion,
        effectiveDate: "2024-01-01",
        isActive: true,
        elementId: "esrs-s1:GenderPayGapPercentage",
        elementName: "Gender pay gap",
        elementType: "percent",
        esrsStandard: "ESRS S1",
        esrsSection: "S1-16",
        metricCode: "S1-16-GPG",
        namespace: "http://esrs-s1.eu/taxonomy/2025",
        dataType: "num:percentItemType",
        periodType: "duration",
        label: "Gender pay gap expressed as percentage",
        documentation: "The gender pay gap defined as the difference between the average gross hourly earnings of male and female employees expressed as a percentage of the average gross hourly earnings of male employees.",
        calculationFormula: "GPG = (Avg male gross hourly – Avg female gross hourly) ÷ Avg male gross hourly * 100",
      },
      
      // ESRS S1-16: Annual total compensation ratio (CEO pay ratio)
      {
        taxonomyVersion,
        effectiveDate: "2024-01-01",
        isActive: true,
        elementId: "esrs-s1:AnnualTotalCompensationRatio",
        elementName: "Annual total compensation ratio",
        elementType: "count",
        esrsStandard: "ESRS S1",
        esrsSection: "S1-16",
        metricCode: "S1-16-CEO-RATIO",
        namespace: "http://esrs-s1.eu/taxonomy/2025",
        dataType: "xbrli:decimal",
        periodType: "duration",
        label: "Ratio of annual total compensation of highest-paid individual to median compensation",
        documentation: "The ratio between the annual total compensation of the highest-paid individual and the median annual total compensation of all employees (excluding the highest-paid individual).",
        calculationFormula: "Highest paid total compensation ÷ median employee compensation",
      },
      
      // ESRS S1-16: Work-related injuries rate
      {
        taxonomyVersion,
        effectiveDate: "2024-01-01",
        isActive: true,
        elementId: "esrs-s1:WorkRelatedInjuriesRate",
        elementName: "Work-related injuries rate",
        elementType: "count",
        esrsStandard: "ESRS S1",
        esrsSection: "S1-16",
        metricCode: "S1-16-INJURY-RATE",
        namespace: "http://esrs-s1.eu/taxonomy/2025",
        dataType: "xbrli:decimal",
        periodType: "duration",
        label: "Number of work-related injuries per 100 full-time equivalent employees",
        documentation: "The number of work-related injuries per 100 full-time equivalent employees, disaggregated by own workforce and other workers working on the undertaking's sites.",
        calculationFormula: "(Total work-related injuries / Total FTE) * 100",
      },
      
      // ESRS S1-16: Work-related fatalities
      {
        taxonomyVersion,
        effectiveDate: "2024-01-01",
        isActive: true,
        elementId: "esrs-s1:WorkRelatedFatalities",
        elementName: "Work-related fatalities",
        elementType: "count",
        esrsStandard: "ESRS S1",
        esrsSection: "S1-16",
        metricCode: "S1-16-FATALITIES",
        namespace: "http://esrs-s1.eu/taxonomy/2025",
        dataType: "xbrli:nonNegativeInteger",
        periodType: "duration",
        label: "Number of work-related fatalities",
        documentation: "The number of work-related fatalities, disaggregated by own workforce and other workers working on the undertaking's sites.",
        calculationFormula: "Count of fatality incidents by worker type",
      },
    ];

    // Insert taxonomy elements
    const insertedElements = [];
    for (const element of taxonomyElements) {
      try {
        const [inserted] = await db
          .insert(esrsTaxonomy)
          .values(element)
          .onConflictDoUpdate({
            target: [esrsTaxonomy.elementId, esrsTaxonomy.taxonomyVersion],
            set: {
              label: element.label,
              documentation: element.documentation,
              calculationFormula: element.calculationFormula,
              updatedAt: sql`now()`,
            },
          })
          .returning();
        
        insertedElements.push(inserted);
      } catch (error) {
        console.error(`Error inserting taxonomy element ${element.elementId}:`, error);
      }
    }

    return insertedElements;
  }

  /**
   * Generate XBRL instance document for S1 metrics
   */
  async generateXBRLInstance(
    reportingPeriodId: string,
    metricsData: Record<string, any>
  ): Promise<S1XbrlInstances[]> {
    // Get reporting period for context
    const [period] = await db
      .select()
      .from(csrdReportingPeriods)
      .where(eq(csrdReportingPeriods.id, reportingPeriodId));

    if (!period) {
      throw new Error('Reporting period not found');
    }

    // Get active taxonomy elements
    const taxonomyElements = await db
      .select()
      .from(esrsTaxonomy)
      .where(
        and(
          eq(esrsTaxonomy.isActive, true),
          eq(esrsTaxonomy.esrsStandard, "ESRS S1")
        )
      );

    const xbrlInstances: InsertS1XbrlInstances[] = [];

    for (const taxonomy of taxonomyElements) {
      const metricValue = metricsData[taxonomy.metricCode];
      if (metricValue !== undefined && metricValue !== null) {
        
        // Generate context reference
        const contextRef = this.generateContextRef(period, taxonomy.periodType);
        const unitRef = this.generateUnitRef(taxonomy.elementType);

        // Find corresponding data lineage
        const [lineage] = await db
          .select()
          .from(s1DataLineage)
          .where(
            and(
              eq(s1DataLineage.reportingPeriodId, reportingPeriodId),
              eq(s1DataLineage.metricCode, taxonomy.esrsSection || taxonomy.metricCode)
            )
          )
          .orderBy(desc(s1DataLineage.calculationDate))
          .limit(1);

        xbrlInstances.push({
          reportingPeriodId,
          taxonomyId: taxonomy.id,
          elementId: taxonomy.elementId,
          contextRef,
          unitRef,
          xbrlValue: this.formatXBRLValue(metricValue, taxonomy.dataType),
          originalValue: { value: metricValue, source: taxonomy.metricCode },
          valueType: taxonomy.elementType === 'monetary' ? 'numeric' : taxonomy.elementType === 'percent' ? 'numeric' : 'text',
          lineageId: lineage?.id,
          isValid: true,
        });
      }
    }

    // Bulk insert XBRL instances
    const insertedInstances = await db
      .insert(s1XbrlInstances)
      .values(xbrlInstances)
      .returning();

    return insertedInstances;
  }

  /**
   * Generate human-readable S1 report sections
   */
  async generateHumanReadableReport(
    reportingPeriodId: string,
    metricsData: Record<string, any>,
    language: 'en' | 'el' = 'en'
  ): Promise<S1ReportSections[]> {
    const reportSections: InsertS1ReportSections[] = [];

    // S1-6: Workforce characteristics section
    if (metricsData['S1-6-EMPLOYEES'] || metricsData['S1-6-FTE']) {
      const workforceText = language === 'en' 
        ? this.generateWorkforceTextEN(metricsData)
        : this.generateWorkforceTextEL(metricsData);

      reportSections.push({
        reportingPeriodId,
        sectionCode: 'S1-6',
        sectionTitle: language === 'en' ? 'Characteristics of the undertaking employees' : 'Χαρακτηριστικά των εργαζομένων της επιχείρησης',
        sectionType: 'metrics',
        sortOrder: 1,
        humanReadableText: workforceText,
        metricsIncluded: ['S1-6-EMPLOYEES', 'S1-6-FTE'],
        language,
        generationMethod: 'template',
        contentStatus: 'draft',
      });
    }

    // S1-16: Gender pay gap section
    if (metricsData['S1-16-GPG']) {
      const payGapText = language === 'en'
        ? this.generatePayGapTextEN(metricsData)
        : this.generatePayGapTextEL(metricsData);

      reportSections.push({
        reportingPeriodId,
        sectionCode: 'S1-16',
        sectionTitle: language === 'en' ? 'Remuneration metrics (pay gap and total compensation)' : 'Μετρήσεις αμοιβών (μισθολογικό χάσμα και συνολικές αποδοχές)',
        sectionType: 'metrics',
        sortOrder: 2,
        humanReadableText: payGapText,
        metricsIncluded: ['S1-16-GPG', 'S1-16-CEO-RATIO'],
        language,
        generationMethod: 'template',
        contentStatus: 'draft',
      });
    }

    // S1-16: Health & safety section
    if (metricsData['S1-16-INJURY-RATE'] || metricsData['S1-16-FATALITIES']) {
      const healthSafetyText = language === 'en'
        ? this.generateHealthSafetyTextEN(metricsData)
        : this.generateHealthSafetyTextEL(metricsData);

      reportSections.push({
        reportingPeriodId,
        sectionCode: 'S1-16-HEALTH',
        sectionTitle: language === 'en' ? 'Health and safety metrics' : 'Μετρήσεις υγείας και ασφάλειας',
        sectionType: 'metrics',
        sortOrder: 3,
        humanReadableText: healthSafetyText,
        metricsIncluded: ['S1-16-INJURY-RATE', 'S1-16-FATALITIES'],
        language,
        generationMethod: 'template',
        contentStatus: 'draft',
      });
    }

    // Insert report sections
    const insertedSections = await db
      .insert(s1ReportSections)
      .values(reportSections)
      .returning();

    return insertedSections;
  }

  /**
   * Generate workforce characteristics text (English)
   */
  private generateWorkforceTextEN(metricsData: Record<string, any>): string {
    const totalEmployees = metricsData['S1-6-EMPLOYEES'] || 0;
    const totalFTE = metricsData['S1-6-FTE'] || 0;

    return `**Workforce Characteristics**

As of the end of the reporting period, our organization employed ${totalEmployees} individuals, representing ${totalFTE.toFixed(1)} full-time equivalent (FTE) positions.

**Key Metrics:**
- Total headcount: ${totalEmployees} employees
- Total FTE: ${totalFTE.toFixed(1)}
- Average FTE per employee: ${totalEmployees > 0 ? (totalFTE / totalEmployees * 100).toFixed(1) : 0}%

**Segmentation:**
Our workforce composition reflects our commitment to diversity and inclusion across all geographical regions and employment categories. The workforce data includes all employees covered by our health and safety management system.

**Data Source:**
These metrics are derived from our employee master data system, incorporating real-time employment status tracking and FTE percentage calculations based on contractual arrangements.`.trim();
  }

  /**
   * Generate workforce characteristics text (Greek)
   */
  private generateWorkforceTextEL(metricsData: Record<string, any>): string {
    const totalEmployees = metricsData['S1-6-EMPLOYEES'] || 0;
    const totalFTE = metricsData['S1-6-FTE'] || 0;

    return `**Χαρακτηριστικά Εργατικού Δυναμικού**

Κατά το τέλος της περιόδου αναφοράς, η οργάνωσή μας απασχολούσε ${totalEmployees} άτομα, που αντιπροσωπεύουν ${totalFTE.toFixed(1)} θέσεις πλήρους απασχόλησης (FTE).

**Βασικές Μετρήσεις:**
- Συνολικός αριθμός εργαζομένων: ${totalEmployees} άτομα
- Συνολικό FTE: ${totalFTE.toFixed(1)}
- Μέσος όρος FTE ανά εργαζόμενο: ${totalEmployees > 0 ? (totalFTE / totalEmployees * 100).toFixed(1) : 0}%

**Κατάτμηση:**
Η σύνθεση του εργατικού δυναμικού μας αντικατοπτρίζει τη δέσμευσή μας για διαφορετικότητα και ένταξη σε όλες τις γεωγραφικές περιοχές και κατηγορίες απασχόλησης.

**Πηγή Δεδομένων:**
Αυτές οι μετρήσεις προκύπτουν από το σύστημα κεντρικών δεδομένων εργαζομένων, ενσωματώνοντας παρακολούθηση κατάστασης απασχόλησης σε πραγματικό χρόνο.`.trim();
  }

  /**
   * Generate pay gap text (English)
   */
  private generatePayGapTextEN(metricsData: Record<string, any>): string {
    const genderPayGap = metricsData['S1-16-GPG'] || 0;
    const ceoRatio = metricsData['S1-16-CEO-RATIO'] || 0;

    return `**Remuneration Metrics**

**Gender Pay Gap:**
The gender pay gap in our organization is ${genderPayGap.toFixed(1)}%, calculated as the difference between average gross hourly earnings of male and female employees, expressed as a percentage of average gross hourly earnings of male employees.

**CEO Pay Ratio:**
The ratio of annual total compensation of our highest-paid individual to the median annual total compensation of all other employees is ${ceoRatio.toFixed(1)}:1.

**Calculation Methodology:**
- Gender pay gap calculated using actual payroll data and worked hours from our Digital Work Card system
- Pay ratio includes all forms of compensation including base salary, bonuses, and benefits
- Calculations performed with country and entity-level segmentation for accurate reporting

**Commitment to Pay Equity:**
These metrics support our ongoing commitment to fair and equitable compensation practices across our organization.`.trim();
  }

  /**
   * Generate pay gap text (Greek)
   */
  private generatePayGapTextEL(metricsData: Record<string, any>): string {
    const genderPayGap = metricsData['S1-16-GPG'] || 0;
    const ceoRatio = metricsData['S1-16-CEO-RATIO'] || 0;

    return `**Μετρήσεις Αμοιβών**

**Μισθολογικό Χάσμα Φύλων:**
Το μισθολογικό χάσμα φύλων στον οργανισμό μας είναι ${genderPayGap.toFixed(1)}%, υπολογισμένο ως η διαφορά μεταξύ των μέσων μικτών ωριαίων αποδοχών ανδρών και γυναικών εργαζομένων.

**Αναλογία Αμοιβής Διευθύνοντος Συμβούλου:**
Η αναλογία των ετήσιων συνολικών αποδοχών του πιο υψηλά αμειβόμενου ατόμου προς τις μέσες ετήσιες συνολικές αποδοχές όλων των άλλων εργαζομένων είναι ${ceoRatio.toFixed(1)}:1.

**Μεθοδολογία Υπολογισμού:**
- Το μισθολογικό χάσμα φύλων υπολογίζεται χρησιμοποιώντας πραγματικά δεδομένα μισθοδοσίας και ώρες εργασίας
- Η αναλογία μισθών περιλαμβάνει όλες τις μορφές αποζημίωσης
- Οι υπολογισμοί εκτελούνται με κατάτμηση σε επίπεδο χώρας και οντότητας

**Δέσμευση για Ισότητα Αμοιβών:**
Αυτές οι μετρήσεις υποστηρίζουν τη συνεχή δέσμευσή μας για δίκαιες και ισότιμες πρακτικές αποζημίωσης.`.trim();
  }

  /**
   * Generate health & safety text (English)
   */
  private generateHealthSafetyTextEN(metricsData: Record<string, any>): string {
    const injuryRate = metricsData['S1-16-INJURY-RATE'] || 0;
    const fatalities = metricsData['S1-16-FATALITIES'] || 0;

    return `**Health and Safety Metrics**

**Work-Related Injury Rate:**
Our organization reported ${injuryRate.toFixed(2)} work-related injuries per 100 full-time equivalent employees during the reporting period.

**Work-Related Fatalities:**
We recorded ${fatalities} work-related fatalities during the reporting period, covering both our own workforce and other workers operating on our sites.

**Health and Safety Coverage:**
100% of our workforce is covered by our occupational health and safety management system, ensuring comprehensive protection and incident tracking.

**Calculation Methodology:**
- Injury rates calculated per 100 FTE to enable benchmarking
- Fatality tracking includes all workers on our sites regardless of employment relationship
- Data sourced from our incident reporting and workforce management systems

**Our Commitment:**
These metrics reflect our unwavering commitment to maintaining the highest standards of workplace health and safety across all operations.`.trim();
  }

  /**
   * Generate health & safety text (Greek)
   */
  private generateHealthSafetyTextEL(metricsData: Record<string, any>): string {
    const injuryRate = metricsData['S1-16-INJURY-RATE'] || 0;
    const fatalities = metricsData['S1-16-FATALITIES'] || 0;

    return `**Μετρήσεις Υγείας και Ασφάλειας**

**Δείκτης Τραυματισμών από Εργασία:**
Ο οργανισμός μας κατέγραψε ${injuryRate.toFixed(2)} τραυματισμούς σχετικούς με την εργασία ανά 100 εργαζομένους πλήρους απασχόλησης κατά την περίοδο αναφοράς.

**Θάνατοι από Εργασία:**
Καταγράψαμε ${fatalities} θανάτους σχετικούς με την εργασία κατά την περίοδο αναφοράς, καλύπτοντας τόσο το δικό μας εργατικό δυναμικό όσο και άλλους εργαζομένους στις εγκαταστάσεις μας.

**Κάλυψη Υγείας και Ασφάλειας:**
Το 100% του εργατικού δυναμικού μας καλύπτεται από το σύστημα διαχείρισης επαγγελματικής υγείας και ασφάλειας.

**Μεθοδολογία Υπολογισμού:**
- Οι δείκτες τραυματισμών υπολογίζονται ανά 100 FTE για σύγκριση
- Η παρακολούθηση θανάτων περιλαμβάνει όλους τους εργαζομένους στις εγκαταστάσεις μας

**Η Δέσμευσή μας:**
Αυτές οι μετρήσεις αντικατοπτρίζουν την αφοσιωμένη δέσμευσή μας στη διατήρηση των υψηλότερων προτύπων υγείας και ασφάλειας στον χώρο εργασίας.`.trim();
  }

  /**
   * Generate XBRL context reference
   */
  private generateContextRef(period: any, periodType: string): string {
    const startDate = period.periodStart.replace(/\D/g, '');
    const endDate = period.periodEnd.replace(/\D/g, '');
    
    if (periodType === 'instant') {
      return `ctx_${period.propertyId}_${endDate}`;
    } else {
      return `ctx_${period.propertyId}_${startDate}_${endDate}`;
    }
  }

  /**
   * Generate XBRL unit reference
   */
  private generateUnitRef(elementType: string): string {
    switch (elementType) {
      case 'monetary': return 'EUR';
      case 'percent': return 'percent';
      case 'count': return 'pure';
      default: return 'pure';
    }
  }

  /**
   * Format value according to XBRL data type
   */
  private formatXBRLValue(value: any, dataType: string): string {
    switch (dataType) {
      case 'xbrli:nonNegativeInteger':
        return Math.max(0, Math.floor(Number(value))).toString();
      case 'xbrli:decimal':
        return Number(value).toFixed(2);
      case 'num:percentItemType':
        return (Number(value) / 100).toFixed(4); // XBRL percentages are decimals
      default:
        return String(value);
    }
  }

  /**
   * Update taxonomy for new ESRS versions
   */
  async updateTaxonomy(newTaxonomyVersion: string): Promise<EsrsTaxonomy[]> {
    // Deactivate old taxonomy
    await db
      .update(esrsTaxonomy)
      .set({ isActive: false, expiryDate: new Date().toISOString().split('T')[0] })
      .where(eq(esrsTaxonomy.isActive, true));

    // Load new taxonomy
    return await this.loadESRSSet1Taxonomy(newTaxonomyVersion);
  }

  /**
   * Get XBRL instances for reporting period
   */
  async getXBRLInstances(reportingPeriodId: string): Promise<S1XbrlInstances[]> {
    return await db
      .select()
      .from(s1XbrlInstances)
      .where(eq(s1XbrlInstances.reportingPeriodId, reportingPeriodId))
      .orderBy(s1XbrlInstances.elementId);
  }

  /**
   * Get report sections
   */
  async getReportSections(
    reportingPeriodId: string, 
    language: 'en' | 'el' = 'en'
  ): Promise<S1ReportSections[]> {
    return await db
      .select()
      .from(s1ReportSections)
      .where(
        and(
          eq(s1ReportSections.reportingPeriodId, reportingPeriodId),
          eq(s1ReportSections.language, language)
        )
      )
      .orderBy(s1ReportSections.sortOrder);
  }
}

export const xbrlTaggingService = new XBRLTaggingService();