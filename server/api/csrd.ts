import { Router } from "express";
import { csrdService } from "../csrdService";
import { db } from "../db";
import { 
  csrdReportingPeriods,
  s1WorkforceCharacteristics,
  s1TurnoverMetrics,
  s1PayMetrics,
  s1HealthSafetyIncidents,
  s1TrainingMetrics,
  csrdAuditTrail,
  csrdExportLog,
  InsertCsrdReportingPeriod,
  InsertS1HealthSafetyIncidents,
  InsertS1TrainingMetrics,
} from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { z } from "zod";

export function registerCsrdRoutes(app: Router) {
  
  // CSRD Dashboard - Executive Summary
  app.get('/api/csrd/dashboard/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { year = new Date().getFullYear() } = req.query;
      
      // Get current reporting period
      const [currentPeriod] = await db
        .select()
        .from(csrdReportingPeriods)
        .where(
          and(
            eq(csrdReportingPeriods.propertyId, propertyId),
            eq(csrdReportingPeriods.reportingYear, Number(year))
          )
        )
        .limit(1);

      if (!currentPeriod) {
        return res.json({
          status: 'no_period',
          message: 'No CSRD reporting period found for this year',
          needsSetup: true,
        });
      }

      // Get latest workforce characteristics
      const [latestWorkforce] = await db
        .select()
        .from(s1WorkforceCharacteristics)
        .where(eq(s1WorkforceCharacteristics.reportingPeriodId, currentPeriod.id))
        .orderBy(desc(s1WorkforceCharacteristics.measurementDate))
        .limit(1);

      // Get latest pay metrics
      const [latestPayMetrics] = await db
        .select()
        .from(s1PayMetrics)
        .where(eq(s1PayMetrics.reportingPeriodId, currentPeriod.id))
        .orderBy(desc(s1PayMetrics.calculationDate))
        .limit(1);

      // Get incident counts
      const [incidentStats] = await db
        .select({
          totalIncidents: sql<number>`count(*)`,
          fatalIncidents: sql<number>`count(*) filter (where severity = 'fatal')`,
          majorIncidents: sql<number>`count(*) filter (where severity = 'major')`,
        })
        .from(s1HealthSafetyIncidents)
        .where(eq(s1HealthSafetyIncidents.reportingPeriodId, currentPeriod.id));

      // Get training stats
      const [trainingStats] = await db
        .select({
          totalTrainingHours: sql<number>`sum(training_hours)`,
          totalParticipants: sql<number>`count(distinct employee_id)`,
          completionRate: sql<number>`avg(case when completion_status = 'completed' then 100.0 else 0.0 end)`,
        })
        .from(s1TrainingMetrics)
        .where(eq(s1TrainingMetrics.reportingPeriodId, currentPeriod.id));

      // Calculate readiness score
      const readinessScore = calculateReadinessScore({
        hasWorkforceData: !!latestWorkforce,
        hasPayData: !!latestPayMetrics,
        hasIncidentData: incidentStats.totalIncidents > 0,
        hasTrainingData: (trainingStats.totalTrainingHours || 0) > 0,
        materialityAssessed: !!currentPeriod.materialityAssessmentDate,
      });

      const dashboardData = {
        reportingPeriod: currentPeriod,
        readinessScore,
        keyMetrics: {
          workforce: latestWorkforce ? {
            totalEmployees: latestWorkforce.totalEmployees,
            totalFTE: parseFloat(latestWorkforce.totalFTE),
            genderPayGap: latestPayMetrics ? parseFloat(latestPayMetrics.genderPayGapPercentage) : null,
            turnoverRate: null, // Would come from turnover metrics
          } : null,
          healthSafety: {
            totalIncidents: incidentStats.totalIncidents || 0,
            fatalityRate: incidentStats.fatalIncidents || 0,
            majorIncidents: incidentStats.majorIncidents || 0,
          },
          training: {
            totalHours: trainingStats.totalTrainingHours || 0,
            participants: trainingStats.totalParticipants || 0,
            completionRate: trainingStats.completionRate || 0,
          },
          payEquity: latestPayMetrics ? {
            genderPayGap: parseFloat(latestPayMetrics.genderPayGapPercentage),
            ceoPayRatio: parseFloat(latestPayMetrics.ceoPayRatio),
            lastCalculated: latestPayMetrics.calculationDate,
          } : null,
        },
        compliance: {
          esrsVersion: currentPeriod.esrsVersion || '1.0',
          implementationWave: currentPeriod.implementationWave || 1,
          stopTheClockApplied: currentPeriod.stopTheClockApplied || false,
          materialityStatus: currentPeriod.s1WorkforceMaterial ? 'Material' : 'Not Material',
          reportingStatus: currentPeriod.reportingStatus,
        },
        upcomingDeadlines: {
          materialityDeadline: '2025-07-11', // Commission delegated act
          consultationPeriod: '2025-07-31 to 2025-09-29',
          reportingDeadline: `${Number(year) + 1}-04-30`,
        },
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('CSRD dashboard error:', error);
      res.status(500).json({ error: 'Failed to load CSRD dashboard' });
    }
  });

  // Create new CSRD reporting period
  app.post('/api/csrd/reporting-periods', async (req, res) => {
    try {
      const schema = z.object({
        propertyId: z.string(),
        reportingYear: z.number(),
        periodStart: z.string(),
        periodEnd: z.string(),
        esrsVersion: z.string().optional(),
        implementationWave: z.number().optional(),
        s1WorkforceMaterial: z.boolean().optional(),
        materialityJustification: z.string().optional(),
      });

      const data = schema.parse(req.body);
      
      const period = await csrdService.createReportingPeriod(data);
      
      res.json({ success: true, period });
    } catch (error) {
      console.error('Create reporting period error:', error);
      res.status(500).json({ error: 'Failed to create reporting period' });
    }
  });

  // Calculate workforce characteristics (S1-6)
  app.post('/api/csrd/calculate/workforce/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { measurementDate } = req.body;

      if (!measurementDate) {
        return res.status(400).json({ error: 'measurementDate is required' });
      }

      const characteristics = await csrdService.calculateWorkforceCharacteristics(
        reportingPeriodId,
        new Date(measurementDate)
      );

      res.json({ success: true, characteristics });
    } catch (error) {
      console.error('Calculate workforce error:', error);
      res.status(500).json({ error: 'Failed to calculate workforce characteristics' });
    }
  });

  // Calculate turnover metrics
  app.post('/api/csrd/calculate/turnover/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { periodStart, periodEnd } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({ error: 'periodStart and periodEnd are required' });
      }

      const turnoverMetrics = await csrdService.calculateTurnoverMetrics(
        reportingPeriodId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      res.json({ success: true, turnoverMetrics });
    } catch (error) {
      console.error('Calculate turnover error:', error);
      res.status(500).json({ error: 'Failed to calculate turnover metrics' });
    }
  });

  // Calculate pay metrics (CEO ratio + gender pay gap)
  app.post('/api/csrd/calculate/pay-metrics/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { calculationDate } = req.body;

      if (!calculationDate) {
        return res.status(400).json({ error: 'calculationDate is required' });
      }

      const payMetrics = await csrdService.calculatePayMetrics(
        reportingPeriodId,
        new Date(calculationDate)
      );

      res.json({ success: true, payMetrics });
    } catch (error) {
      console.error('Calculate pay metrics error:', error);
      res.status(500).json({ error: 'Failed to calculate pay metrics' });
    }
  });

  // Calculate work-life balance metrics (S1-6 enhanced)
  app.post('/api/csrd/calculate/work-life-balance/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { periodStart, periodEnd } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({ error: 'periodStart and periodEnd are required' });
      }

      const workLifeBalance = await csrdService.calculateWorkLifeBalance(
        reportingPeriodId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      res.json({ success: true, workLifeBalance });
    } catch (error) {
      console.error('Calculate work-life balance error:', error);
      res.status(500).json({ error: 'Failed to calculate work-life balance metrics' });
    }
  });

  // Calculate enhanced health & safety metrics (incidents per 100 FTE)
  app.post('/api/csrd/calculate/health-safety/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { periodStart, periodEnd } = req.body;

      if (!periodStart || !periodEnd) {
        return res.status(400).json({ error: 'periodStart and periodEnd are required' });
      }

      const healthSafety = await csrdService.calculateHealthSafetyMetrics(
        reportingPeriodId,
        new Date(periodStart),
        new Date(periodEnd)
      );

      res.json({ success: true, healthSafety });
    } catch (error) {
      console.error('Calculate health & safety error:', error);
      res.status(500).json({ error: 'Failed to calculate health & safety metrics' });
    }
  });

  // Enhanced S1 metrics with country/entity segmentation
  app.post('/api/csrd/calculate/enhanced-s1/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { entity, country = 'GRC' } = req.body;

      const enhancedMetrics = await csrdService.calculateEnhancedS1Metrics(
        reportingPeriodId,
        entity,
        country
      );

      res.json({ success: true, metrics: enhancedMetrics });
    } catch (error) {
      console.error('Calculate enhanced S1 metrics error:', error);
      res.status(500).json({ error: 'Failed to calculate enhanced S1 metrics' });
    }
  });

  // Switch ESRS calculation version
  app.post('/api/csrd/switch-version', async (req, res) => {
    try {
      const { version } = req.body;

      if (!version) {
        return res.status(400).json({ error: 'version is required' });
      }

      await csrdService.switchESRSVersion(version);

      res.json({ success: true, message: `Switched to ESRS version: ${version}` });
    } catch (error) {
      console.error('Switch ESRS version error:', error);
      res.status(500).json({ error: 'Failed to switch ESRS version' });
    }
  });

  // Materiality assessment endpoints
  app.post('/api/csrd/materiality-assessment', async (req, res) => {
    try {
      const schema = z.object({
        reportingPeriodId: z.string(),
        topicArea: z.enum(['policies', 'actions', 'metrics']),
        topicCode: z.string(),
        topicDescription: z.string(),
        isMaterial: z.boolean(),
        materialityRationale: z.string(),
        assessedBy: z.string(),
        impactMagnitude: z.enum(['low', 'medium', 'high']).optional(),
        impactLikelihood: z.enum(['low', 'medium', 'high']).optional(),
        stakeholderInterest: z.enum(['low', 'medium', 'high']).optional(),
      });

      const data = schema.parse(req.body);
      
      const assessment = await csrdService.assessMateriality(data);
      
      res.json({ success: true, assessment });
    } catch (error) {
      console.error('Create materiality assessment error:', error);
      res.status(500).json({ error: 'Failed to create materiality assessment' });
    }
  });

  app.get('/api/csrd/materiality-assessment/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { topicCode } = req.query;
      
      const assessments = await csrdService.getMaterialityAssessment(
        reportingPeriodId,
        topicCode as string
      );
      
      res.json({ success: true, assessments });
    } catch (error) {
      console.error('Get materiality assessment error:', error);
      res.status(500).json({ error: 'Failed to get materiality assessment' });
    }
  });

  // One-click CSRD export
  app.get('/api/csrd/export/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { 
        exportType = 's1_only', 
        applyMateriality = 'true' 
      } = req.query;

      const report = await csrdService.exportCsrdReport(
        reportingPeriodId,
        exportType as "full_report" | "s1_only" | "metrics_only",
        applyMateriality === 'true'
      );

      // Set headers for download
      const fileName = `CSRD_S1_Report_${report.reportMetadata?.reportingPeriod?.reportingYear || 'current'}_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/json');
      
      res.json(report);
    } catch (error) {
      console.error('CSRD export error:', error);
      res.status(500).json({ error: 'Failed to export CSRD report' });
    }
  });

  // Add health & safety incident
  app.post('/api/csrd/incidents', async (req, res) => {
    try {
      const schema = z.object({
        reportingPeriodId: z.string(),
        incidentDate: z.string(),
        incidentType: z.enum(['injury', 'illness', 'near_miss', 'fatality']),
        severity: z.enum(['minor', 'major', 'fatal']),
        affectedWorkerType: z.enum(['employee', 'contractor', 'visitor']),
        location: z.string(),
        department: z.string().optional(),
        incidentDescription: z.string().optional(),
        workDaysLost: z.number().optional(),
        medicalTreatmentRequired: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      
      const [incident] = await db
        .insert(s1HealthSafetyIncidents)
        .values(data as InsertS1HealthSafetyIncidents)
        .returning();

      res.json({ success: true, incident });
    } catch (error) {
      console.error('Add incident error:', error);
      res.status(500).json({ error: 'Failed to add health & safety incident' });
    }
  });

  // Add training record
  app.post('/api/csrd/training', async (req, res) => {
    try {
      const schema = z.object({
        reportingPeriodId: z.string(),
        employeeId: z.string().optional(),
        trainingType: z.enum(['safety', 'skills', 'leadership', 'compliance']),
        trainingHours: z.number(),
        trainingDate: z.string(),
        completionStatus: z.enum(['completed', 'in_progress', 'cancelled']).optional(),
        competencyGained: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      
      const [training] = await db
        .insert(s1TrainingMetrics)
        .values({
          ...data,
          trainingHours: data.trainingHours.toString(),
        } as InsertS1TrainingMetrics)
        .returning();

      res.json({ success: true, training });
    } catch (error) {
      console.error('Add training error:', error);
      res.status(500).json({ error: 'Failed to add training record' });
    }
  });

  // Update materiality assessment
  app.patch('/api/csrd/materiality/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const schema = z.object({
        s1WorkforceMaterial: z.boolean(),
        materialityJustification: z.string().optional(),
        materialityAssessmentDate: z.string().optional(),
      });

      const data = schema.parse(req.body);
      
      const [updatedPeriod] = await db
        .update(csrdReportingPeriods)
        .set({
          ...data,
          materialityAssessmentDate: data.materialityAssessmentDate || new Date().toISOString().split('T')[0],
        })
        .where(eq(csrdReportingPeriods.id, reportingPeriodId))
        .returning();

      res.json({ success: true, period: updatedPeriod });
    } catch (error) {
      console.error('Update materiality error:', error);
      res.status(500).json({ error: 'Failed to update materiality assessment' });
    }
  });

  // Get audit trail
  app.get('/api/csrd/audit-trail/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      
      const auditEntries = await db
        .select()
        .from(csrdAuditTrail)
        .where(eq(csrdAuditTrail.reportingPeriodId, reportingPeriodId))
        .orderBy(desc(csrdAuditTrail.auditDate))
        .limit(100);

      res.json({ success: true, auditTrail: auditEntries });
    } catch (error) {
      console.error('Get audit trail error:', error);
      res.status(500).json({ error: 'Failed to get audit trail' });
    }
  });

  // Get export history
  app.get('/api/csrd/export-history/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      
      const exportHistory = await db
        .select()
        .from(csrdExportLog)
        .where(eq(csrdExportLog.reportingPeriodId, reportingPeriodId))
        .orderBy(desc(csrdExportLog.exportDate))
        .limit(20);

      res.json({ success: true, exports: exportHistory });
    } catch (error) {
      console.error('Get export history error:', error);
      res.status(500).json({ error: 'Failed to get export history' });
    }
  });

  // ESRS version management - Toggle stop-the-clock
  app.patch('/api/csrd/stop-the-clock/:reportingPeriodId', async (req, res) => {
    try {
      const { reportingPeriodId } = req.params;
      const { stopTheClockApplied, esrsVersion } = req.body;
      
      const [updatedPeriod] = await db
        .update(csrdReportingPeriods)
        .set({
          stopTheClockApplied,
          esrsVersion: esrsVersion || '1.0',
          updatedAt: sql`now()`,
        })
        .where(eq(csrdReportingPeriods.id, reportingPeriodId))
        .returning();

      res.json({ success: true, period: updatedPeriod });
    } catch (error) {
      console.error('Stop-the-clock update error:', error);
      res.status(500).json({ error: 'Failed to update stop-the-clock status' });
    }
  });
}

// Helper function to calculate readiness score
function calculateReadinessScore(indicators: {
  hasWorkforceData: boolean;
  hasPayData: boolean;
  hasIncidentData: boolean;
  hasTrainingData: boolean;
  materialityAssessed: boolean;
}): number {
  let score = 0;
  const weights = {
    hasWorkforceData: 25, // Essential S1-6 data
    hasPayData: 25,       // Essential pay equity data
    hasIncidentData: 20,  // S1-16 health & safety
    hasTrainingData: 15,  // Training & development
    materialityAssessed: 15, // Materiality assessment
  };

  Object.entries(indicators).forEach(([key, value]) => {
    if (value) {
      score += weights[key as keyof typeof weights];
    }
  });

  return Math.min(score, 100);
}