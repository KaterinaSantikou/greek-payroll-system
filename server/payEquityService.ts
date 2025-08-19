import { database } from "./database";
import { 
  payEquityAnalysis, 
  payEquityCompliance, 
  jobPostingSalaryRanges,
  payTransparencyRequests,
  payDecisionExplanations,
  employees,
  contracts,
  InsertPayEquityAnalysis,
  InsertJobPostingSalaryRange,
  InsertPayEquityCompliance
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export class PayEquityService {
  // Calculate gender pay gap for a specific property/department
  async calculateGenderPayGap(propertyId: string, departmentId?: string): Promise<{
    analysis: any;
    recommendations: string[];
  }> {
    const currentDate = new Date().toISOString().split('T')[0];
    
    try {
      // Get employee salaries with gender data
      const salaryQuery = database
        .select({
          employeeId: employees.employeeId,
          gender: employees.gender,
          salary: contracts.salary,
          jobTitle: employees.jobTitle,
          departmentId: employees.departmentId,
        })
        .from(employees)
        .leftJoin(contracts, eq(employees.employeeId, contracts.employeeId))
        .where(
          and(
            eq(employees.propertyId, propertyId),
            departmentId ? eq(employees.departmentId, departmentId) : undefined,
            eq(contracts.status, 'active')
          )
        );

      const salaryData = await salaryQuery.execute();
      
      // Group by gender
      const maleEmployees = salaryData.filter(e => e.gender === 'male');
      const femaleEmployees = salaryData.filter(e => e.gender === 'female');
      const otherEmployees = salaryData.filter(e => e.gender && !['male', 'female'].includes(e.gender));

      // Calculate averages and medians
      const calculateStats = (employees: any[]) => {
        if (employees.length === 0) return { avg: 0, median: 0, count: 0 };
        
        const salaries = employees.map(e => parseFloat(e.salary || '0')).filter(s => s > 0);
        const avg = salaries.reduce((a, b) => a + b, 0) / salaries.length || 0;
        
        salaries.sort((a, b) => a - b);
        const median = salaries.length > 0 
          ? salaries.length % 2 === 0 
            ? (salaries[salaries.length / 2 - 1] + salaries[salaries.length / 2]) / 2
            : salaries[Math.floor(salaries.length / 2)]
          : 0;
          
        return { avg, median, count: employees.length };
      };

      const maleStats = calculateStats(maleEmployees);
      const femaleStats = calculateStats(femaleEmployees);
      const otherStats = calculateStats(otherEmployees);

      // Calculate gender pay gap percentage (traditional: male as baseline)
      const genderPayGapPercent = maleStats.avg > 0 
        ? ((maleStats.avg - femaleStats.avg) / maleStats.avg) * 100
        : 0;

      // Create analysis record
      const analysisData: InsertPayEquityAnalysis = {
        propertyId,
        analysisDate: currentDate,
        analysisType: 'gender_gap',
        departmentId,
        maleEmployees: maleStats.count,
        femaleEmployees: femaleStats.count,
        otherGenderEmployees: otherStats.count,
        maleAvgSalary: maleStats.avg.toString(),
        femaleAvgSalary: femaleStats.avg.toString(),
        otherAvgSalary: otherStats.avg.toString(),
        genderPayGapPercent: genderPayGapPercent.toString(),
        medianMaleSalary: maleStats.median.toString(),
        medianFemaleSalary: femaleStats.median.toString(),
        analysisMethodology: 'Basic arithmetic mean and median calculation by gender',
        controlFactors: [],
        complianceStatus: 'analyzed',
      };

      const [analysis] = await database
        .insert(payEquityAnalysis)
        .values(analysisData)
        .returning();

      // Generate recommendations
      const recommendations = this.generatePayGapRecommendations(genderPayGapPercent, maleStats, femaleStats);

      return { analysis, recommendations };
    } catch (error) {
      console.error('Error calculating gender pay gap:', error);
      throw new Error('Failed to calculate gender pay gap');
    }
  }

  // Generate salary ranges for job postings (EU 2023/970 Article 5)
  async generateSalaryRanges(propertyId: string, jobTitle: string, departmentId?: string): Promise<{
    suggestedRange: { min: number; max: number };
    marketData: any;
    factors: string[];
  }> {
    try {
      // Get current salaries for similar roles
      const similarRoles = await database
        .select({
          salary: contracts.salary,
          experience: sql<number>`EXTRACT(YEAR FROM AGE(CURRENT_DATE, ${employees.hireDate}))`,
          jobTitle: employees.jobTitle,
        })
        .from(employees)
        .leftJoin(contracts, eq(employees.employeeId, contracts.employeeId))
        .where(
          and(
            eq(employees.propertyId, propertyId),
            sql`LOWER(${employees.jobTitle}) SIMILAR TO LOWER('%${jobTitle}%')`,
            eq(contracts.status, 'active')
          )
        );

      const salaries = similarRoles
        .map(r => parseFloat(r.salary || '0'))
        .filter(s => s > 0)
        .sort((a, b) => a - b);

      if (salaries.length === 0) {
        // No data available - use industry defaults
        return {
          suggestedRange: { min: 800, max: 1200 }, // Greek minimum wage area
          marketData: { message: 'No internal salary data available' },
          factors: ['Experience level', 'Education', 'Certifications', 'Performance history']
        };
      }

      // Calculate percentiles for range
      const p25 = salaries[Math.floor(salaries.length * 0.25)];
      const p75 = salaries[Math.floor(salaries.length * 0.75)];
      const median = salaries[Math.floor(salaries.length * 0.5)];

      // Set range with 10% buffer
      const min = Math.floor(p25 * 0.9);
      const max = Math.ceil(p75 * 1.1);

      return {
        suggestedRange: { min, max },
        marketData: {
          sampleSize: salaries.length,
          p25,
          median,
          p75,
          avgExperience: similarRoles.reduce((acc, r) => acc + (r.experience || 0), 0) / similarRoles.length
        },
        factors: [
          'Years of relevant experience',
          'Education level and certifications', 
          'Performance in previous roles',
          'Specialized skills and competencies',
          'Market conditions and location'
        ]
      };
    } catch (error) {
      console.error('Error generating salary ranges:', error);
      throw new Error('Failed to generate salary ranges');
    }
  }

  // Calculate EU 2023/970 compliance readiness score
  async calculateComplianceReadiness(propertyId: string): Promise<{
    score: number;
    breakdown: any;
    daysUntilDeadline: number;
    actionItems: string[];
  }> {
    try {
      // Get or create compliance record
      let [compliance] = await database
        .select()
        .from(payEquityCompliance)
        .where(eq(payEquityCompliance.propertyId, propertyId));

      if (!compliance) {
        const [newCompliance] = await database
          .insert(payEquityCompliance)
          .values({ propertyId } as InsertPayEquityCompliance)
          .returning();
        compliance = newCompliance;
      }

      // Calculate days until deadline
      const deadlineDate = new Date('2026-06-07');
      const currentDate = new Date();
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Scoring criteria (100 points total)
      const criteria = [
        { name: 'Salary ranges published', weight: 25, completed: compliance.salaryRangesPublished },
        { name: 'Gender pay gap reported', weight: 20, completed: compliance.genderPayGapReported },
        { name: 'Pay transparency policy active', weight: 20, completed: compliance.payTransparencyPolicyActive },
        { name: 'Right-to-info process active', weight: 15, completed: compliance.rightToInfoProcessActive },
        { name: 'Pay decision criteria published', weight: 20, completed: compliance.payDecisionsCriteriaPublished },
      ];

      const score = criteria.reduce((total, criterion) => {
        return total + (criterion.completed ? criterion.weight : 0);
      }, 0);

      // Generate action items for incomplete criteria
      const actionItems = criteria
        .filter(c => !c.completed)
        .map(c => `Complete: ${c.name} (${c.weight} points)`);

      // Add deadline-specific actions
      if (daysUntilDeadline < 365) {
        actionItems.unshift('🚨 Less than 1 year until transposition deadline');
      }
      if (daysUntilDeadline < 90) {
        actionItems.unshift('⚠️ Critical: Less than 90 days until deadline');
      }

      // Update readiness score
      await database
        .update(payEquityCompliance)
        .set({ 
          readinessScore: score.toString(),
          lastAssessmentDate: new Date(),
          outstandingActions: actionItems
        })
        .where(eq(payEquityCompliance.propertyId, propertyId));

      return {
        score,
        breakdown: criteria,
        daysUntilDeadline,
        actionItems
      };
    } catch (error) {
      console.error('Error calculating compliance readiness:', error);
      throw new Error('Failed to calculate compliance readiness');
    }
  }

  // Process employee right-to-information request (Article 8)
  async processTransparencyRequest(employeeId: string, requestType: string, details: string): Promise<{
    requestId: string;
    responseDeadline: Date;
    autoResponse?: any;
  }> {
    try {
      // Calculate response deadline (2 months per directive)
      const responseDeadline = new Date();
      responseDeadline.setMonth(responseDeadline.getMonth() + 2);

      const [request] = await database
        .insert(payTransparencyRequests)
        .values({
          employeeId,
          requestType,
          requestDetails: details,
          responseDeadline,
        })
        .returning();

      // Auto-generate response for common requests
      let autoResponse = null;
      if (requestType === 'pay_criteria') {
        autoResponse = await this.generatePayCriteriaResponse(employeeId);
      }

      return {
        requestId: request.id,
        responseDeadline,
        autoResponse
      };
    } catch (error) {
      console.error('Error processing transparency request:', error);
      throw new Error('Failed to process transparency request');
    }
  }

  // Generate automatic pay criteria response
  private async generatePayCriteriaResponse(employeeId: string): Promise<any> {
    try {
      const [employee] = await database
        .select({
          jobTitle: employees.jobTitle,
          salary: contracts.salary,
          hireDate: employees.hireDate,
          propertyId: employees.propertyId,
        })
        .from(employees)
        .leftJoin(contracts, eq(employees.employeeId, contracts.employeeId))
        .where(eq(employees.employeeId, employeeId));

      if (!employee) return null;

      // Get job posting salary ranges for reference
      const salaryRanges = await database
        .select()
        .from(jobPostingSalaryRanges)
        .where(
          and(
            eq(jobPostingSalaryRanges.propertyId, employee.propertyId),
            eq(jobPostingSalaryRanges.jobTitle, employee.jobTitle),
            eq(jobPostingSalaryRanges.isActive, true)
          )
        )
        .orderBy(desc(jobPostingSalaryRanges.lastUpdated))
        .limit(1);

      return {
        jobTitle: employee.jobTitle,
        salaryRange: salaryRanges[0] || null,
        payCriteria: [
          'Years of relevant experience',
          'Educational qualifications',
          'Performance evaluations',
          'Specialized skills and certifications',
          'Market salary benchmarks',
          'Internal equity considerations'
        ],
        responseGenerated: new Date(),
      };
    } catch (error) {
      console.error('Error generating pay criteria response:', error);
      return null;
    }
  }

  private generatePayGapRecommendations(gapPercent: number, maleStats: any, femaleStats: any): string[] {
    const recommendations: string[] = [];

    if (Math.abs(gapPercent) > 10) {
      recommendations.push(`🚨 Significant gender pay gap detected (${gapPercent.toFixed(1)}%)`);
    }

    if (gapPercent > 5) {
      recommendations.push('Review pay equity across similar roles and experience levels');
      recommendations.push('Conduct salary audit with external consultant');
      recommendations.push('Implement structured pay bands and transparent criteria');
    }

    if (gapPercent < -5) {
      recommendations.push('Reverse pay gap detected - ensure male employees receive equitable compensation');
    }

    if (femaleStats.count < maleStats.count * 0.3) {
      recommendations.push('Consider gender diversity in hiring and promotion processes');
    }

    if (Math.abs(gapPercent) < 2) {
      recommendations.push('✅ Pay equity appears well-balanced - maintain current practices');
    }

    recommendations.push('Publish annual gender pay gap report for transparency');
    recommendations.push('Establish regular pay equity reviews (quarterly recommended)');

    return recommendations;
  }
}