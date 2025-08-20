/**
 * IBAN Validation API Routes
 * Handles IBAN validation, name matching, and secure storage
 */

import { Router } from "express";
import { isAuthenticated } from "../replitAuth";
import { IbanValidationService } from "../services/IbanValidationService";
import { z } from "zod";

const router = Router();

// Validation schemas
const ValidateIbanSchema = z.object({
  employeeId: z.string().min(1),
  iban: z.string().min(15).max(34),
  accountHolderName: z.string().min(1).max(140),
  overrideReason: z.string().optional()
});

const SaveIbanSchema = z.object({
  employeeId: z.string().min(1),
  iban: z.string().min(15).max(34),
  accountHolderName: z.string().min(1).max(140),
  nameOverrideReason: z.string().optional()
});

/**
 * POST /api/iban/validate
 * Validate IBAN format, checksum, and name match
 */
router.post('/validate', isAuthenticated, async (req, res) => {
  try {
    const validationRequest = ValidateIbanSchema.parse(req.body);
    const userId = (req.user as any)?.claims?.sub;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await IbanValidationService.validateEmployeeIban(
      validationRequest,
      userId,
      ipAddress,
      userAgent
    );
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('IBAN validation error:', error);
    res.status(400).json({
      success: false,
      error: 'IBAN validation failed',
      details: error.message
    });
  }
});

/**
 * POST /api/iban/save
 * Save validated IBAN to secure vault
 */
router.post('/save', isAuthenticated, async (req, res) => {
  try {
    const saveRequest = SaveIbanSchema.parse(req.body);
    const userId = (req.user as any)?.claims?.sub;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await IbanValidationService.saveSecureIban({
      ...saveRequest,
      validatedBy: userId,
      ipAddress,
      userAgent
    });
    
    res.json({
      success: true,
      data: result,
      message: 'IBAN saved securely'
    });
    
  } catch (error: any) {
    console.error('IBAN save error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to save IBAN',
      details: error.message
    });
  }
});

/**
 * GET /api/iban/employee/:employeeId
 * Get employee's masked IBAN details
 */
router.get('/employee/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const ibanDetails = await IbanValidationService.getEmployeeIban(employeeId);
    
    res.json({
      success: true,
      data: ibanDetails
    });
    
  } catch (error: any) {
    console.error('Get employee IBAN error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve IBAN details'
    });
  }
});

/**
 * GET /api/iban/employee/:employeeId/history
 * Get IBAN validation history for employee
 */
router.get('/employee/:employeeId/history', isAuthenticated, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    const history = await IbanValidationService.getValidationHistory(employeeId, limit);
    
    res.json({
      success: true,
      data: {
        history,
        employeeId,
        totalEntries: history.length
      }
    });
    
  } catch (error: any) {
    console.error('Get validation history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve validation history'
    });
  }
});

/**
 * GET /api/iban/test-data
 * Generate test IBAN data for development
 */
router.get('/test-data', isAuthenticated, async (req, res) => {
  try {
    const testData = IbanValidationService.generateTestData();
    
    res.json({
      success: true,
      data: testData,
      message: 'Test IBAN data generated'
    });
    
  } catch (error: any) {
    console.error('Generate test data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test data'
    });
  }
});

/**
 * GET /api/iban/payment/:employeeId
 * Get full IBAN for payment processing (restricted access)
 */
router.get('/payment/:employeeId', isAuthenticated, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { purpose = 'payment_processing' } = req.query;
    const userId = (req.user as any)?.claims?.sub;
    
    // This endpoint should be further restricted to payroll/payment roles
    // For now, allowing authenticated users but logging the access
    
    const paymentIban = await IbanValidationService.getFullIbanForPayment(
      employeeId,
      userId,
      purpose as string
    );
    
    if (!paymentIban) {
      return res.status(404).json({
        success: false,
        error: 'No validated IBAN found for employee'
      });
    }
    
    res.json({
      success: true,
      data: {
        vaultId: paymentIban.vaultId,
        fullIban: paymentIban.fullIban,
        accountHolderName: paymentIban.accountHolderName,
        bankCode: paymentIban.bankCode
      },
      warning: 'Full IBAN access logged for audit purposes'
    });
    
  } catch (error: any) {
    console.error('Get payment IBAN error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment IBAN'
    });
  }
});

export default router;