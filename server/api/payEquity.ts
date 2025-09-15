import { Router } from 'express';
import { PayEquityService } from '../payEquityService';
import { db } from '../db';
import {
  payEquityAnalysis,
  payEquityCompliance,
  jobPostingSalaryRanges,
  payTransparencyRequests,
  payDecisionExplanations,
  InsertJobPostingSalaryRange,
  InsertPayDecisionExplanation,
} from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { z } from 'zod';

const payEquityService = new PayEquityService();

export function registerPayEquityRoutes(app: Router) {
  // Get EU 2023/970 compliance dashboard data
  app.get(
    '/api/pay-equity/compliance-dashboard/:propertyId',
    async (req, res) => {
      try {
        const { propertyId } = req.params;

        // Calculate compliance readiness
        const readinessData =
          await payEquityService.calculateComplianceReadiness(propertyId);

        // Get recent pay gap analyses
        const recentAnalyses = await db
          .select()
          .from(payEquityAnalysis)
          .where(eq(payEquityAnalysis.propertyId, propertyId))
          .orderBy(desc(payEquityAnalysis.analysisDate))
          .limit(5);

        // Get pending transparency requests
        const pendingRequests = await db
          .select()
          .from(payTransparencyRequests)
          .where(
            and(
              eq(payTransparencyRequests.status, 'pending'),
              gte(payTransparencyRequests.responseDeadline, new Date())
            )
          )
          .orderBy(payTransparencyRequests.responseDeadline)
          .limit(10);

        // Get salary ranges status
        const salaryRangesCount = await db
          .select({ count: db.$count() })
          .from(jobPostingSalaryRanges)
          .where(
            and(
              eq(jobPostingSalaryRanges.propertyId, propertyId),
              eq(jobPostingSalaryRanges.isActive, true)
            )
          );

        // Calculate days until EU deadline
        const deadlineDate = new Date('2026-06-07');
        const currentDate = new Date();
        const daysUntilDeadline = Math.ceil(
          (deadlineDate.getTime() - currentDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const dashboardData = {
          compliance: readinessData,
          deadline: {
            date: '2026-06-07',
            daysRemaining: daysUntilDeadline,
            status:
              daysUntilDeadline > 365
                ? 'planning'
                : daysUntilDeadline > 90
                  ? 'preparation'
                  : 'urgent',
          },
          recentAnalyses,
          pendingRequests: pendingRequests.length,
          salaryRangesPublished: salaryRangesCount[0]?.count || 0,
          lastUpdated: new Date().toISOString(),
        };

        res.json({ success: true, data: dashboardData });
      } catch (error) {
        console.error('Error fetching compliance dashboard:', error);
        res
          .status(500)
          .json({
            success: false,
            error: 'Failed to fetch compliance dashboard',
          });
      }
    }
  );

  // Calculate gender pay gap analysis
  app.post('/api/pay-equity/analyze-pay-gap', async (req, res) => {
    try {
      const { propertyId, departmentId } = req.body;

      if (!propertyId) {
        return res
          .status(400)
          .json({ success: false, error: 'Property ID is required' });
      }

      const result = await payEquityService.calculateGenderPayGap(
        propertyId,
        departmentId
      );

      res.json({
        success: true,
        data: {
          analysis: result.analysis,
          recommendations: result.recommendations,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error analyzing pay gap:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to analyze pay gap' });
    }
  });

  // Generate salary ranges for job postings
  app.post('/api/pay-equity/generate-salary-range', async (req, res) => {
    try {
      const schema = z.object({
        propertyId: z.string(),
        jobTitle: z.string(),
        departmentId: z.string().optional(),
        createdBy: z.string(),
      });

      const validatedData = schema.parse(req.body);

      const rangeData = await payEquityService.generateSalaryRanges(
        validatedData.propertyId,
        validatedData.jobTitle,
        validatedData.departmentId
      );

      // Save the generated range
      const salaryRangeData: InsertJobPostingSalaryRange = {
        propertyId: validatedData.propertyId,
        jobTitle: validatedData.jobTitle,
        departmentId: validatedData.departmentId,
        minSalary: rangeData.suggestedRange.min.toString(),
        maxSalary: rangeData.suggestedRange.max.toString(),
        salaryBasis: 'monthly',
        payFactors: rangeData.factors,
        createdBy: validatedData.createdBy,
      };

      const [savedRange] = await database
        .insert(jobPostingSalaryRanges)
        .values(salaryRangeData)
        .returning();

      res.json({
        success: true,
        data: {
          salaryRange: savedRange,
          marketData: rangeData.marketData,
          factors: rangeData.factors,
        },
      });
    } catch (error) {
      console.error('Error generating salary range:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to generate salary range' });
    }
  });

  // Submit employee right-to-information request
  app.post('/api/pay-equity/transparency-request', async (req, res) => {
    try {
      const schema = z.object({
        employeeId: z.string(),
        requestType: z.enum(['pay_criteria', 'pay_levels', 'progression']),
        requestDetails: z.string(),
      });

      const validatedData = schema.parse(req.body);

      const result = await payEquityService.processTransparencyRequest(
        validatedData.employeeId,
        validatedData.requestType,
        validatedData.requestDetails
      );

      res.json({
        success: true,
        data: {
          requestId: result.requestId,
          responseDeadline: result.responseDeadline,
          autoResponse: result.autoResponse,
          message:
            'Your request has been submitted. You will receive a response within 2 months as required by EU law.',
        },
      });
    } catch (error) {
      console.error('Error processing transparency request:', error);
      res
        .status(500)
        .json({
          success: false,
          error: 'Failed to process transparency request',
        });
    }
  });

  // Get all salary ranges for a property
  app.get('/api/pay-equity/salary-ranges/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;

      const ranges = await database
        .select()
        .from(jobPostingSalaryRanges)
        .where(
          and(
            eq(jobPostingSalaryRanges.propertyId, propertyId),
            eq(jobPostingSalaryRanges.isActive, true)
          )
        )
        .orderBy(desc(jobPostingSalaryRanges.lastUpdated));

      res.json({ success: true, data: ranges });
    } catch (error) {
      console.error('Error fetching salary ranges:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to fetch salary ranges' });
    }
  });

  // Get pay gap analysis history
  app.get('/api/pay-equity/pay-gap-history/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;

      const analyses = await database
        .select()
        .from(payEquityAnalysis)
        .where(eq(payEquityAnalysis.propertyId, propertyId))
        .orderBy(desc(payEquityAnalysis.analysisDate))
        .limit(12); // Last 12 analyses

      // Calculate trend
      const trend =
        analyses.length >= 2
          ? parseFloat(analyses[0].genderPayGapPercent || '0') -
            parseFloat(analyses[1].genderPayGapPercent || '0')
          : 0;

      res.json({
        success: true,
        data: {
          analyses,
          trend: {
            direction:
              trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
            change: Math.abs(trend).toFixed(2),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching pay gap history:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to fetch pay gap history' });
    }
  });

  // Save pay decision explanation
  app.post('/api/pay-equity/pay-decision', async (req, res) => {
    try {
      const schema = z.object({
        employeeId: z.string(),
        decisionType: z.enum(['hire', 'promotion', 'raise', 'review']),
        decisionDate: z.string(),
        oldSalary: z.number().optional(),
        newSalary: z.number(),
        explanation: z.string(),
        contributingFactors: z.array(z.string()).optional(),
        approvedBy: z.string(),
      });

      const validatedData = schema.parse(req.body);

      const decisionData: InsertPayDecisionExplanation = {
        employeeId: validatedData.employeeId,
        decisionType: validatedData.decisionType,
        decisionDate: validatedData.decisionDate,
        oldSalary: validatedData.oldSalary?.toString(),
        newSalary: validatedData.newSalary.toString(),
        salaryChange: validatedData.oldSalary
          ? (validatedData.newSalary - validatedData.oldSalary).toString()
          : null,
        explanation: validatedData.explanation,
        contributingFactors: validatedData.contributingFactors || [],
        approvedBy: validatedData.approvedBy,
      };

      const [savedDecision] = await database
        .insert(payDecisionExplanations)
        .values(decisionData)
        .returning();

      res.json({
        success: true,
        data: savedDecision,
        message: 'Pay decision explanation saved for compliance tracking',
      });
    } catch (error) {
      console.error('Error saving pay decision:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to save pay decision' });
    }
  });

  // Get pending transparency requests for HR
  app.get('/api/pay-equity/pending-requests/:propertyId', async (req, res) => {
    try {
      const { propertyId } = req.params;

      const requests = await database
        .select({
          id: payTransparencyRequests.id,
          employeeId: payTransparencyRequests.employeeId,
          requestType: payTransparencyRequests.requestType,
          requestDate: payTransparencyRequests.requestDate,
          requestDetails: payTransparencyRequests.requestDetails,
          status: payTransparencyRequests.status,
          responseDeadline: payTransparencyRequests.responseDeadline,
        })
        .from(payTransparencyRequests)
        .where(eq(payTransparencyRequests.status, 'pending'))
        .orderBy(payTransparencyRequests.responseDeadline);

      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to fetch pending requests' });
    }
  });

  // Update compliance component status
  app.post('/api/pay-equity/update-compliance', async (req, res) => {
    try {
      const schema = z.object({
        propertyId: z.string(),
        component: z.enum([
          'salary_ranges_published',
          'gender_pay_gap_reported',
          'pay_transparency_policy_active',
          'right_to_info_process_active',
          'pay_decisions_criteria_published',
        ]),
        status: z.boolean(),
      });

      const validatedData = schema.parse(req.body);

      const updateData: any = {
        [validatedData.component]: validatedData.status,
        updatedAt: new Date(),
      };

      await database
        .update(payEquityCompliance)
        .set(updateData)
        .where(eq(payEquityCompliance.propertyId, validatedData.propertyId));

      // Recalculate readiness score
      const readinessData = await payEquityService.calculateComplianceReadiness(
        validatedData.propertyId
      );

      res.json({
        success: true,
        data: readinessData,
        message: `Compliance component updated: ${validatedData.component}`,
      });
    } catch (error) {
      console.error('Error updating compliance:', error);
      res
        .status(500)
        .json({ success: false, error: 'Failed to update compliance' });
    }
  });
}
