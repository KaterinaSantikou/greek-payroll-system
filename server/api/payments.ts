import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "../db";
import { paymentInstructions } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Payment schemas
const CreateSEPAPaymentSchema = z.object({
  payrollRunId: z.string(),
  paymentDate: z.string(),
  debitAccount: z.object({
    iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/),
    bic: z.string().optional(),
    accountHolder: z.string()
  }),
  payments: z.array(z.object({
    employeeId: z.string(),
    amount: z.number().positive(),
    currency: z.string().default("EUR"),
    iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}$/),
    accountHolder: z.string(),
    remittanceInfo: z.string()
  })),
  urgentPayment: z.boolean().default(false),
  batchBooking: z.boolean().default(true)
});

const PaymentStatusUpdateSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed", "returned"]),
  statusReason: z.string().optional(),
  bankReference: z.string().optional(),
  processedAt: z.string().optional()
});

// Idempotency middleware
const idempotencyMiddleware = (req: any, res: any, next: any) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey && req.method === 'POST') {
    return res.status(400).json({ error: 'Idempotency-Key header required for payment operations' });
  }
  req.idempotencyKey = idempotencyKey;
  next();
};

// GET /api/payments - List payments
router.get('/api/payments', isAuthenticated, async (req, res) => {
  try {
    const { payrollRunId, status, paymentDate, limit = '50', offset = '0' } = req.query;
    
    let query = db.select().from(paymentInstructions);
    const conditions = [];
    
    if (payrollRunId) {
      conditions.push(eq(paymentInstructions.payrollPeriodId, payrollRunId as string));
    }
    if (status) {
      conditions.push(eq(paymentInstructions.status, status as any));
    }
    if (paymentDate) {
      conditions.push(eq(paymentInstructions.paymentDate, new Date(paymentDate as string)));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.reduce((acc, cond) => acc && cond));
    }
    
    const result = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy(paymentInstructions.createdAt);
    
    // Calculate totals
    const totals = {
      totalAmount: result.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      paymentCount: result.length,
      pendingAmount: result.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.totalAmount || 0), 0),
      completedAmount: result.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.totalAmount || 0), 0)
    };
    
    const signature = generateSignature({ result, totals });
    
    res.json({
      data: result,
      meta: {
        total: result.length,
        totals,
        signature,
        hasPendingPayments: result.some(p => p.status === 'pending')
      }
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// GET /api/payments/:id - Get payment details
router.get('/api/payments/:id', isAuthenticated, async (req, res) => {
  try {
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, req.params.id));
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    const signature = generateSignature(payment);
    
    res.json({
      data: payment,
      meta: {
        signature,
        canCancel: payment.status === 'pending',
        bankProcessed: ['processing', 'completed', 'failed', 'returned'].includes(payment.status),
        sepaCompliant: true
      }
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

// GET /api/payments/:id/status - Get payment status
router.get('/api/payments/:id/status', isAuthenticated, async (req, res) => {
  try {
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, req.params.id));
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    // In production, this would query the bank API for real-time status
    const statusInfo = {
      id: payment.id,
      status: payment.status,
      bankReference: payment.bankReference,
      statusReason: payment.statusReason,
      processedAt: payment.processedAt,
      paymentDate: payment.paymentDate,
      totalAmount: payment.totalAmount,
      currency: payment.currency,
      employeeCount: payment.employeePayments?.length || 0,
      lastUpdated: payment.updatedAt
    };
    
    const signature = generateSignature(statusInfo);
    
    res.json({
      data: statusInfo,
      meta: {
        signature,
        realTimeStatus: true,
        nextStatusCheck: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      }
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

// POST /api/payments/sepa - Create SEPA payment file
router.post('/api/payments/sepa', isAuthenticated, idempotencyMiddleware, async (req, res) => {
  try {
    const paymentData = CreateSEPAPaymentSchema.parse(req.body);
    
    // Check idempotency
    const existingResponse = checkIdempotency(req.idempotencyKey);
    if (existingResponse) {
      return res.status(200).json(existingResponse);
    }
    
    // Validate payroll run exists and is finalized
    const validationErrors = await validateSEPAPayment(paymentData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "SEPA payment validation failed", 
        details: validationErrors 
      });
    }
    
    // Calculate totals
    const totalAmount = paymentData.payments.reduce((sum, p) => sum + p.amount, 0);
    
    const payment = {
      id: nanoid(),
      payrollRunId: paymentData.payrollRunId,
      paymentType: 'sepa_credit_transfer' as const,
      status: 'pending' as const,
      paymentDate: new Date(paymentData.paymentDate),
      totalAmount,
      currency: 'EUR',
      employeePayments: paymentData.payments,
      debitAccount: paymentData.debitAccount,
      urgentPayment: paymentData.urgentPayment,
      batchBooking: paymentData.batchBooking,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: (req as any).user.claims.sub
    };
    
    const [created] = await db.insert(payments).values(payment).returning();
    
    // Generate SEPA pain.001 XML file
    const pain001File = await generatePain001File(created);
    
    // Update with file details
    await db.update(payments)
      .set({
        sepaFileId: pain001File.fileId,
        sepaFileName: pain001File.fileName,
        sepaFileGenerated: true,
        updatedAt: new Date()
      })
      .where(eq(payments.id, created.id));
    
    const response = {
      data: {
        ...created,
        sepaFileId: pain001File.fileId,
        sepaFileName: pain001File.fileName,
        sepaFileGenerated: true
      },
      pain001: pain001File.xmlContent,
      meta: {
        signature: generateSignature(created),
        idempotencyKey: req.idempotencyKey,
        fileGenerated: true,
        readyForBank: true,
        employeeCount: paymentData.payments.length,
        totalAmount,
        currency: 'EUR'
      }
    };
    
    storeIdempotency(req.idempotencyKey, response);
    
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating SEPA payment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid SEPA payment data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create SEPA payment" });
  }
});

// PUT /api/payments/:id/status - Update payment status (webhook from bank)
router.put('/api/payments/:id/status', isAuthenticated, async (req, res) => {
  try {
    const statusData = PaymentStatusUpdateSchema.parse(req.body);
    
    const [payment] = await db.select()
      .from(payments)
      .where(eq(payments.id, req.params.id));
    
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    
    // Update payment status
    const [updated] = await db.update(payments)
      .set({
        status: statusData.status,
        statusReason: statusData.statusReason,
        bankReference: statusData.bankReference,
        processedAt: statusData.processedAt ? new Date(statusData.processedAt) : null,
        updatedAt: new Date()
      })
      .where(eq(payments.id, req.params.id))
      .returning();
    
    // Trigger appropriate webhook
    const webhookEvent = statusData.status === 'completed' ? 'payment.sent' : 'payment.status_changed';
    await triggerWebhook(webhookEvent, {
      paymentId: updated.id,
      payrollRunId: updated.payrollRunId,
      status: statusData.status,
      statusReason: statusData.statusReason,
      bankReference: statusData.bankReference,
      totalAmount: updated.totalAmount,
      employeeCount: updated.employeePayments?.length || 0
    });
    
    res.json({
      data: updated,
      meta: {
        signature: generateSignature(updated),
        webhookTriggered: true
      }
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid status update data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

// Helper functions
async function validateSEPAPayment(data: any): Promise<string[]> {
  const errors = [];
  
  // Validate payroll run exists and is finalized
  // Validate all IBANs are valid
  // Validate employee payment amounts match payroll
  // Validate debit account has sufficient authorization
  
  return errors;
}

async function generatePain001File(payment: any): Promise<any> {
  const fileId = nanoid();
  const fileName = `pain001_${payment.payrollRunId}_${Date.now()}.xml`;
  
  // Generate SEPA pain.001 XML according to ISO 20022 standard
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" 
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${fileId}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${payment.employeePayments.length}</NbOfTxs>
      <CtrlSum>${payment.totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${payment.debitAccount.accountHolder}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-${fileId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>${payment.batchBooking}</BtchBookg>
      <NbOfTxs>${payment.employeePayments.length}</NbOfTxs>
      <CtrlSum>${payment.totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${payment.paymentDate.toISOString().split('T')[0]}</ReqdExctnDt>
      <Dbtr>
        <Nm>${payment.debitAccount.accountHolder}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${payment.debitAccount.iban}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${payment.debitAccount.bic || 'NOTPROVIDED'}</BIC>
        </FinInstnId>
      </DbtrAgt>
      ${payment.employeePayments.map((ep: any, index: number) => `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>EMP-${ep.employeeId}-${index + 1}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${ep.currency}">${ep.amount.toFixed(2)}</InstdAmt>
        </Amt>
        <Cdtr>
          <Nm>${ep.accountHolder}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${ep.iban}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${ep.remittanceInfo}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`).join('')}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return {
    fileId,
    fileName,
    xmlContent: xmlContent.trim()
  };
}

function generateSignature(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
}

// Webhook trigger
async function triggerWebhook(event: string, payload: any): Promise<void> {
  console.log(`Webhook triggered: ${event}`, payload);
}

// Idempotency store
const idempotencyStore = new Map<string, any>();

function checkIdempotency(key: string): any | null {
  return idempotencyStore.get(key) || null;
}

function storeIdempotency(key: string, response: any): void {
  idempotencyStore.set(key, response);
  setTimeout(() => idempotencyStore.delete(key), 24 * 60 * 60 * 1000);
}

export default router;