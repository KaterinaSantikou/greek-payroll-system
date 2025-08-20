import type { Express } from "express";
import { db } from '../db';
import { 
  billingPlans, 
  subscriptions, 
  invoices, 
  employeeMetering,
  creditNotes,
  paymentMethods,
  paymentAttempts
} from '@shared/billingSchema';
import { eq, and, desc } from 'drizzle-orm';
import { isAuthenticated } from '../replitAuth';
import { billingService } from '../services/BillingService';
import { paymentService } from '../services/PaymentService';
import { dunningService } from '../services/DunningService';
import { myDataService } from '../services/MyDataService';
import { invoicePDFService } from '../services/InvoicePDFService';

export function registerBillingRoutes(app: Express) {
  
  // Get billing plans
  app.get('/api/billing/plans', async (req, res) => {
    try {
      const plans = await db.select()
        .from(billingPlans)
        .where(eq(billingPlans.isActive, true))
        .orderBy(billingPlans.baseFeeEur);
      
      res.json(plans);
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      res.status(500).json({ error: 'Failed to fetch billing plans' });
    }
  });

  // Get subscription details
  app.get('/api/billing/subscription/:organizationId', isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      // Get associated plan
      const plan = await db.select()
        .from(billingPlans)
        .where(eq(billingPlans.id, subscription.planId))
        .then(rows => rows[0]);
      
      res.json({ subscription, plan });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // Get invoices for organization
  app.get('/api/billing/invoices/:organizationId', isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      const invoiceList = await db.select()
        .from(invoices)
        .where(eq(invoices.subscriptionId, subscription.id))
        .orderBy(desc(invoices.issueDate))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit));
      
      res.json(invoiceList);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Get specific invoice
  app.get('/api/billing/invoice/:invoiceId', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      const invoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .then(rows => rows[0]);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  // Generate invoice PDF
  app.get('/api/billing/invoice/:invoiceId/pdf', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      const invoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .then(rows => rows[0]);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId))
        .then(rows => rows[0]);
      
      const plan = await db.select()
        .from(billingPlans)
        .where(eq(billingPlans.id, subscription!.planId))
        .then(rows => rows[0]);
      
      // Generate PDF
      const pdfResult = await invoicePDFService.generateInvoicePDF({
        invoice,
        subscription: subscription!,
        plan: plan!,
        organizationDetails: {
          name: process.env.COMPANY_NAME || 'PayrollSync',
          vatNumber: process.env.COMPANY_VAT_NUMBER || 'EL123456789',
          taxOffice: process.env.COMPANY_TAX_OFFICE || 'Α\' Αθηνών',
          address: {
            street: process.env.COMPANY_ADDRESS || 'Πανεπιστημίου 1',
            city: process.env.COMPANY_CITY || 'Αθήνα',
            postalCode: process.env.COMPANY_POSTAL_CODE || '10671',
            country: 'Greece',
            phone: process.env.COMPANY_PHONE,
            email: process.env.COMPANY_EMAIL,
            website: process.env.COMPANY_WEBSITE
          },
          logoUrl: process.env.COMPANY_LOGO_URL
        }
      });

      if (!pdfResult.success) {
        return res.status(500).json({ error: pdfResult.error });
      }

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'private, max-age=3600'
      });

      res.send(pdfResult.pdfBuffer);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // Get payment methods
  app.get('/api/billing/payment-methods/:organizationId', isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      const methods = await paymentService.getPaymentMethods(subscription.id);
      res.json(methods);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  // Add payment method
  app.post('/api/billing/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const { organizationId, type, ...paymentDetails } = req.body;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      let paymentMethod;
      if (type === 'card') {
        paymentMethod = await paymentService.addCardPaymentMethod(
          subscription.id,
          paymentDetails,
          paymentDetails.isDefault || false
        );
      } else if (type === 'sepa_debit') {
        paymentMethod = await paymentService.addSepaPaymentMethod(
          subscription.id,
          paymentDetails,
          paymentDetails.isDefault || false
        );
      } else {
        return res.status(400).json({ error: 'Invalid payment method type' });
      }
      
      res.json(paymentMethod);
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  });

  // Process payment
  app.post('/api/billing/payment/:invoiceId', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { paymentMethodId } = req.body;
      
      const result = await paymentService.processPayment(invoiceId, paymentMethodId);
      
      if (result.success) {
        // Stop any active dunning campaigns
        await dunningService.stopDunningCampaign(invoiceId);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  });

  // Get payment history
  app.get('/api/billing/payments/:organizationId', isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { limit = 50 } = req.query;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      const payments = await paymentService.getPaymentHistory(subscription.id, Number(limit));
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  // Transmit invoice to myDATA
  app.post('/api/billing/invoice/:invoiceId/mydata', isAuthenticated, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      const invoice = await db.select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .then(rows => rows[0]);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.mydataTransmitted) {
        return res.status(400).json({ error: 'Invoice already transmitted to myDATA' });
      }

      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId))
        .then(rows => rows[0]);
      
      const result = await myDataService.transmitInvoice({
        invoice,
        organizationVatNumber: process.env.COMPANY_VAT_NUMBER || 'EL123456789',
        organizationName: process.env.COMPANY_NAME || 'PayrollSync',
        organizationAddress: {
          street: process.env.COMPANY_ADDRESS || 'Πανεπιστημίου 1',
          city: process.env.COMPANY_CITY || 'Αθήνα',
          postalCode: process.env.COMPANY_POSTAL_CODE || '10671',
          country: 'Greece'
        }
      });

      if (result.success) {
        // Update invoice with myDATA details
        await db.update(invoices)
          .set({
            mydataTransmitted: true,
            mydataTransmissionDate: result.transmissionDate,
            mydataInvoiceUid: result.invoiceUid,
            mydataQrCode: result.qrCode
          })
          .where(eq(invoices.id, invoiceId));
      }

      res.json(result);
    } catch (error) {
      console.error('Error transmitting to myDATA:', error);
      res.status(500).json({ error: 'Failed to transmit to myDATA' });
    }
  });

  // Get employee metering data
  app.get('/api/billing/metering/:organizationId', isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { year, month } = req.query;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      let whereConditions = [eq(employeeMetering.subscriptionId, subscription.id)];
      
      if (year) {
        whereConditions.push(eq(employeeMetering.year, Number(year)));
      }
      
      if (month) {
        whereConditions.push(eq(employeeMetering.month, Number(month)));
      }
      
      const meteringData = await db.select()
        .from(employeeMetering)
        .where(and(...whereConditions))
        .orderBy(desc(employeeMetering.year), desc(employeeMetering.month));
      res.json(meteringData);
    } catch (error) {
      console.error('Error fetching metering data:', error);
      res.status(500).json({ error: 'Failed to fetch metering data' });
    }
  });

  // Generate test invoice
  app.post('/api/billing/test-invoice/:organizationId', isAuthenticated, async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      const subscription = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .then(rows => rows[0]);
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      // Generate invoice for current month
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const invoice = await billingService.generateInvoice(
        subscription.id,
        periodStart,
        periodEnd
      );

      res.json(invoice);
    } catch (error) {
      console.error('Error generating test invoice:', error);
      res.status(500).json({ error: 'Failed to generate test invoice' });
    }
  });
}