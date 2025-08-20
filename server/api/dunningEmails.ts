/**
 * Dunning Email API Routes
 * Progressive dunning communications with Greek/English templates
 */

import { Router } from 'express';
import { DunningEmailService, type DunningVariables } from '../services/DunningEmailService';
import { isAuthenticated } from '../replitAuth';

const router = Router();
const dunningService = DunningEmailService.getInstance();

/**
 * Initialize dunning sequence for an overdue invoice
 */
router.post('/initialize/:invoiceId', isAuthenticated, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const variables: DunningVariables = req.body;
    
    // Validate required variables
    const requiredFields = [
      'customer_name', 'tenant_name', 'invoice_number', 'invoice_series',
      'invoice_issue_date', 'amount_due', 'currency', 'due_date', 'days_past_due',
      'pay_link', 'invoice_pdf_url', 'payment_method', 'next_retry_date',
      'grace_suspend_date', 'support_email', 'support_phone', 'supplier_name',
      'supplier_vat', 'supplier_tax_office', 'supplier_address', 'supplier_domain',
      'legal_footer', 'is_el', 'trigger_id'
    ];
    
    for (const field of requiredFields) {
      if (!(field in variables)) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }
    
    const stages = await dunningService.initializeDunningSequence(invoiceId, variables);
    
    res.json({
      success: true,
      message: 'Dunning sequence initialized',
      stages: stages.length,
      schedule: stages.map(stage => ({
        stage: stage.stage,
        scheduledAt: stage.scheduledAt,
        templateId: stage.templateId,
        status: stage.status
      }))
    });
    
  } catch (error) {
    console.error('Error initializing dunning sequence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize dunning sequence'
    });
  }
});

/**
 * Cancel dunning sequence (e.g., when payment is received)
 */
router.post('/cancel/:invoiceId', isAuthenticated, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    dunningService.cancelDunningSequence(invoiceId);
    
    res.json({
      success: true,
      message: 'Dunning sequence cancelled and success email queued'
    });
    
  } catch (error) {
    console.error('Error cancelling dunning sequence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel dunning sequence'
    });
  }
});

/**
 * Get dunning statistics
 */
router.get('/statistics', isAuthenticated, async (req, res) => {
  try {
    const statistics = dunningService.getDunningStatistics();
    
    res.json({
      success: true,
      statistics
    });
    
  } catch (error) {
    console.error('Error getting dunning statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dunning statistics'
    });
  }
});

/**
 * Preview dunning email template
 */
router.post('/preview', isAuthenticated, async (req, res) => {
  try {
    const { stage, isGreek, variables } = req.body;
    
    if (!stage || !variables) {
      return res.status(400).json({
        success: false,
        error: 'Missing stage or variables'
      });
    }
    
    const templateId = `dunning_${stage.toLowerCase()}_${isGreek ? 'el' : 'en'}`;
    
    // Create a preview (this would need to be implemented in the service)
    const previewData = {
      templateId,
      stage,
      language: isGreek ? 'Greek' : 'English',
      sampleSubject: isGreek 
        ? `Οφειλόμενη Πληρωμή: Τιμολόγιο ${variables.invoice_number || 'XXXX'}`
        : `Payment Due: Invoice ${variables.invoice_number || 'XXXX'}`,
      sendWindow: stage === 'D0' ? 'Immediate' 
                : stage === 'D3' || stage === 'D7' ? '10:00-12:00, Tue-Fri'
                : stage === 'D14' ? '09:30-11:00, Mon/Tue'
                : 'Immediate',
      variables: {
        ...variables,
        formatted_amount: `€${(variables.amount_due || 0).toLocaleString(isGreek ? 'el-GR' : 'en-US')}`,
        utm_link: `${variables.pay_link || ''}?utm_source=dunning&utm_medium=email&utm_campaign=${variables.trigger_id || ''}`
      }
    };
    
    res.json({
      success: true,
      preview: previewData
    });
    
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview'
    });
  }
});

/**
 * Get global configuration
 */
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    const config = {
      timezone: 'Europe/Athens',
      sendWindows: {
        D0: { immediate: true },
        D3_D7: { 
          hours: '10:00-12:00',
          days: 'Tuesday-Friday'
        },
        D14: {
          hours: '09:30-11:00',
          days: 'Monday-Tuesday'
        }
      },
      utm: {
        source: 'dunning',
        medium: 'email',
        campaign: '{{trigger_id}}'
      },
      sender: {
        fromName: '{{supplier_name}} Billing',
        fromEmail: 'billing@{{supplier_domain}}',
        replyTo: 'accounts@{{supplier_domain}}'
      },
      supportedLanguages: ['en', 'el'],
      stages: ['D0', 'D3', 'D7', 'D14', 'SUCCESS'],
      variables: {
        required: [
          'customer_name', 'tenant_name', 'invoice_number', 'invoice_series',
          'invoice_issue_date', 'amount_due', 'currency', 'due_date', 'days_past_due',
          'pay_link', 'invoice_pdf_url', 'payment_method', 'next_retry_date',
          'grace_suspend_date', 'support_email', 'support_phone', 'supplier_name',
          'supplier_vat', 'supplier_tax_office', 'supplier_address', 'supplier_domain',
          'legal_footer', 'is_el', 'trigger_id'
        ],
        optional: ['last4', 'sepa_mandate_ref']
      }
    };
    
    res.json({
      success: true,
      config
    });
    
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

/**
 * Test dunning sequence with sample data
 */
router.post('/test', isAuthenticated, async (req, res) => {
  try {
    const { isGreek = false } = req.body;
    
    const testInvoiceId = `TEST_${Date.now()}`;
    const testVariables: DunningVariables = {
      customer_name: isGreek ? 'Γιάννης Παπαδόπουλος' : 'John Smith',
      tenant_name: isGreek ? 'Τεστ Εταιρεία ΑΕ' : 'Test Company Ltd',
      invoice_number: '2024001',
      invoice_series: 'SALES-24',
      invoice_issue_date: new Date().toISOString(),
      amount_due: 1250.00,
      currency: 'EUR',
      due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      days_past_due: 3,
      pay_link: 'https://billing.example.com/pay/test',
      invoice_pdf_url: 'https://billing.example.com/invoices/test.pdf',
      payment_method: 'card',
      last4: '1234',
      next_retry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      grace_suspend_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      support_email: 'support@example.com',
      support_phone: isGreek ? '+30 210 123 4567' : '+1 (555) 123-4567',
      supplier_name: isGreek ? 'PayrollSync Ελλάδας ΑΕ' : 'PayrollSync Greece Ltd',
      supplier_vat: '123456789',
      supplier_tax_office: isGreek ? 'ΔΟΥ Αθηνών' : 'Athens Tax Office',
      supplier_address: isGreek ? 'Βασ. Σοφίας 123, 10676 Αθήνα' : 'Vas. Sofias 123, 10676 Athens',
      supplier_domain: 'example.com',
      legal_footer: isGreek 
        ? 'PayrollSync Ελλάδας ΑΕ • ΑΦΜ: 123456789 • ΔΟΥ: Αθηνών • Βασ. Σοφίας 123, 10676 Αθήνα'
        : 'PayrollSync Greece Ltd • VAT: 123456789 • Tax Office: Athens • Vas. Sofias 123, 10676 Athens',
      is_el: isGreek,
      trigger_id: `test_${Date.now()}`
    };
    
    const stages = await dunningService.initializeDunningSequence(testInvoiceId, testVariables);
    
    res.json({
      success: true,
      message: 'Test dunning sequence created',
      testInvoiceId,
      language: isGreek ? 'Greek' : 'English',
      stages: stages.map(stage => ({
        stage: stage.stage,
        scheduledAt: stage.scheduledAt,
        templateId: stage.templateId,
        status: stage.status
      }))
    });
    
  } catch (error) {
    console.error('Error creating test sequence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test sequence'
    });
  }
});

export default router;