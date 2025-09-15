import { Express } from 'express';
import { isAuthenticated } from '../replitAuth';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
let anthropic: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const DEFAULT_MODEL_STR = 'claude-3-5-sonnet-20241022';

interface QueryContext {
  userRole: string;
  department?: string;
  propertyId?: string;
  permissions: string[];
}

export function registerAICopilotRoutes(app: Express) {
  // Natural language AI query endpoint
  app.post('/api/ai/query', isAuthenticated, async (req: any, res) => {
    if (!anthropic) {
      return res.status(503).json({
        error: 'AI service unavailable',
        message: 'Anthropic API key not configured',
      });
    }

    try {
      const { query, propertyId, userRole, context } = req.body;
      const userId = req.user.claims.sub;

      // Build context for AI query
      const systemPrompt = buildSystemPrompt(userRole, context, propertyId);
      const enhancedQuery = await enhanceQuery(query, context);

      // Call Anthropic AI
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: enhancedQuery,
          },
        ],
      });

      const aiResponse = response.content[0];
      const responseText = aiResponse.type === 'text' ? aiResponse.text : '';

      // Parse AI response for structured data
      const parsedResponse = parseAIResponse(responseText);

      // Log query for analytics
      console.log(
        `AI Query from user ${userId}: "${query}" -> Response: ${responseText.substring(0, 100)}...`
      );

      res.json({
        answer: parsedResponse.answer,
        confidence: parsedResponse.confidence,
        citations: parsedResponse.citations,
        actionable: parsedResponse.actionable,
        suggestedActions: parsedResponse.suggestedActions,
        data: parsedResponse.data,
      });
    } catch (error) {
      console.error('AI query error:', error);
      res.status(500).json({
        error: 'AI query failed',
        message: 'Failed to process your question',
      });
    }
  });

  // Proactive alerts endpoint
  app.get(
    '/api/ai/proactive-alerts',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { propertyId } = req.query;
        const userId = req.user.claims.sub;

        // Generate proactive alerts based on current data
        const alerts = await generateProactiveAlerts(propertyId, userId);

        res.json(alerts);
      } catch (error) {
        console.error('Error generating proactive alerts:', error);
        res.status(500).json({ error: 'Failed to generate alerts' });
      }
    }
  );

  // Explain pay endpoint for employees
  app.post('/api/ai/explain-pay', isAuthenticated, async (req: any, res) => {
    if (!anthropic) {
      return res.status(503).json({
        error: 'AI service unavailable',
        message: 'Anthropic API key not configured',
      });
    }

    try {
      const { payslipId, question } = req.body;
      const userId = req.user.claims.sub;

      // Get payslip data (mock for now)
      const payslipData = {
        grossPay: 3200,
        netPay: 2847,
        taxes: 280,
        insurance: 73,
        overtimeHours: 8.5,
        overtimePay: 240,
        regularHours: 160,
        regularPay: 2800,
      };

      const explanation = await explainPayCalculation(payslipData, question);

      res.json({
        explanation,
        breakdown: payslipData,
        confidence: 0.95,
      });
    } catch (error) {
      console.error('Explain pay error:', error);
      res.status(500).json({ error: 'Failed to explain pay calculation' });
    }
  });
}

function buildSystemPrompt(
  userRole: string,
  context: QueryContext,
  propertyId?: string
): string {
  let systemPrompt = `You are an AI assistant for PayrollSync, a Greek HR & Payroll Management System. 

IMPORTANT GUIDELINES:
1. Never suggest or perform payroll edits without explicit user confirmation
2. Always provide evidence and citations for your answers
3. Focus on Greek labor law compliance (ERGANI II, e-EFKA/APD, AADE ΦΜΥ)
4. Respect user permissions and role-based access

USER CONTEXT:
- Role: ${userRole}
- Department: ${context.department || 'Not specified'}
- Property: ${propertyId || 'Group view'}
- Permissions: ${context.permissions.join(', ')}

CAPABILITIES:
- Answer questions about schedules, overtime, compliance, payroll
- Provide proactive insights about workforce management
- Explain pay calculations and deductions
- Suggest schedule optimizations
- Alert about compliance issues

RESPONSE FORMAT:
Provide clear, actionable answers with:
1. Direct answer to the question
2. Supporting data/evidence
3. Relevant citations (policies, agreements, regulations)
4. Suggested actions (if applicable)

Greek Labor Law Context:
- 40-hour standard work week
- Overtime rates: 25% for first 5 hours, 50% after
- Sunday work: +75% premium
- Night work: +25% premium (22:00-06:00)
- Holiday work: +100% premium`;

  if (userRole === 'hr') {
    systemPrompt +=
      '\n\nAs an HR user, you have access to payroll data, compliance reports, and employee records across all properties.';
  } else if (userRole === 'manager') {
    systemPrompt +=
      '\n\nAs a manager, focus on team scheduling, overtime approvals, and departmental analytics.';
  } else if (userRole === 'employee') {
    systemPrompt +=
      '\n\nAs an employee, you can only access your own payroll data, schedules, and leave information.';
  }

  return systemPrompt;
}

async function enhanceQuery(query: string, context: QueryContext): string {
  // Enhance the user query with relevant context
  let enhancedQuery = query;

  if (context.department) {
    enhancedQuery += ` (Context: ${context.department} department)`;
  }

  return enhancedQuery;
}

function parseAIResponse(responseText: string) {
  // Parse AI response to extract structured data
  // This is a simplified parser - in production, you'd want more sophisticated parsing

  const confidence =
    responseText.includes('uncertain') || responseText.includes('might')
      ? 0.7
      : 0.9;
  const actionable =
    responseText.toLowerCase().includes('suggest') ||
    responseText.toLowerCase().includes('recommend') ||
    responseText.toLowerCase().includes('should');

  // Extract citations (look for references to policies, laws, etc.)
  const citations = [];
  if (responseText.includes('ERGANI')) citations.push('ERGANI II');
  if (responseText.includes('EFKA')) citations.push('e-EFKA/APD');
  if (responseText.includes('overtime')) citations.push('Greek Labor Law');
  if (responseText.includes('collective agreement'))
    citations.push('CBA Terms');

  return {
    answer: responseText,
    confidence,
    citations,
    actionable,
    suggestedActions: actionable ? extractSuggestedActions(responseText) : [],
    data: null,
  };
}

function extractSuggestedActions(responseText: string): string[] {
  const actions = [];

  if (responseText.toLowerCase().includes('reschedule')) {
    actions.push('Review and adjust schedules');
  }
  if (responseText.toLowerCase().includes('approve')) {
    actions.push('Process pending approvals');
  }
  if (responseText.toLowerCase().includes('file')) {
    actions.push('Submit required filings');
  }

  return actions;
}

async function generateProactiveAlerts(propertyId: string, userId: string) {
  // Generate mock proactive alerts - in production, this would analyze real data
  const alerts = [
    {
      id: 'alert-1',
      type: 'warning',
      title: 'Overtime Cap Alert',
      description:
        'Housekeeping team at Marpunta likely to exceed 48h/week average. Consider redistributing shifts.',
      property: 'Marpunta Village',
      department: 'Housekeeping',
      priority: 'high',
      data: {
        currentHours: 46.5,
        projectedHours: 52,
        threshold: 48,
      },
      actions: [
        { label: 'View Schedule', action: 'navigate_schedule' },
        { label: 'Suggest Fixes', action: 'ai_suggest_fixes' },
      ],
    },
    {
      id: 'alert-2',
      type: 'compliance',
      title: 'ERGANI Filing Due',
      description:
        '3 overtime declarations need to be filed before end of day.',
      property: propertyId || 'Multiple Properties',
      priority: 'medium',
      data: {
        pendingFilings: 3,
        deadline: 'Today 18:00',
      },
      actions: [{ label: 'File Now', action: 'file_ergani' }],
    },
    {
      id: 'alert-3',
      type: 'suggestion',
      title: 'Schedule Optimization',
      description:
        'AI detected 15% potential savings in labor costs by adjusting Wednesday shifts.',
      property: 'Princess Resort',
      department: 'Front Office',
      priority: 'low',
      data: {
        potentialSavings: 420,
        affectedShifts: 8,
      },
      actions: [{ label: 'View Details', action: 'view_optimization' }],
    },
  ];

  // Filter alerts based on property if specified
  if (propertyId && propertyId !== 'group') {
    return alerts.filter(
      alert =>
        !alert.property ||
        alert.property.toLowerCase().includes(propertyId.toLowerCase())
    );
  }

  return alerts;
}

async function explainPayCalculation(
  payslipData: any,
  question: string
): Promise<string> {
  if (!anthropic) {
    return 'AI service is currently unavailable. Please contact HR for pay calculation details.';
  }

  const prompt = `Explain the following pay calculation in simple, friendly terms for a Greek employee:

Pay Details:
- Gross Pay: €${payslipData.grossPay}
- Net Pay: €${payslipData.netPay}
- Regular Hours: ${payslipData.regularHours}
- Regular Pay: €${payslipData.regularPay}
- Overtime Hours: ${payslipData.overtimeHours}
- Overtime Pay: €${payslipData.overtimePay}
- Income Tax: €${payslipData.taxes}
- Insurance (EFKA): €${payslipData.insurance}

Employee Question: "${question}"

Provide a clear, friendly explanation of:
1. How the net pay was calculated
2. Why specific deductions were made
3. How overtime was calculated (Greek rates: 25% first 5 hours, 50% after)
4. Any relevant Greek tax or insurance information

Use simple language and be reassuring. Include specific amounts and percentages.`;

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const aiResponse = response.content[0];
    return aiResponse.type === 'text'
      ? aiResponse.text
      : 'Unable to generate explanation';
  } catch (error) {
    console.error('Error explaining pay:', error);
    return "I'm having trouble explaining your pay calculation right now. Please contact HR for assistance.";
  }
}
