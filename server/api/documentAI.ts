import type { Express } from 'express';
import multer from 'multer';
import { DocumentAI } from '../documentAI';
import { ESignatureService } from '../eSignature';
import { isAuthenticated } from '../replitAuth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, images, and common document formats
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Unsupported file type. Please upload PDF, image, or document files.'
        )
      );
    }
  },
});

export function registerDocumentAIRoutes(app: Express) {
  const documentAI = new DocumentAI();
  const eSignatureService = new ESignatureService();

  /**
   * Upload and process single document with OCR
   */
  app.post(
    '/api/documents/process',
    isAuthenticated,
    upload.single('document'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No document file provided' });
        }

        const { documentType } = req.body;
        const validTypes = ['contract', 'id_card', 'passport', 'other'];

        if (documentType && !validTypes.includes(documentType)) {
          return res.status(400).json({
            error:
              'Invalid document type. Must be one of: contract, id_card, passport, other',
          });
        }

        // Process document with OCR
        const result = await documentAI.processDocument(
          req.file.buffer,
          req.file.mimetype,
          documentType || 'other'
        );

        // Validate Greek data if applicable
        let validationResult;
        if (
          result.documentType === 'id_card' ||
          result.documentType === 'contract'
        ) {
          validationResult = documentAI.validateGreekData(
            result.structuredData as any
          );
        }

        res.json({
          success: true,
          data: {
            ...result,
            originalFilename: req.file.originalname,
            fileSize: req.file.size,
            validation: validationResult,
          },
        });
      } catch (error) {
        console.error('Document processing error:', error);
        res.status(500).json({
          error: 'Failed to process document',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Upload and process multiple documents in batch
   */
  app.post(
    '/api/documents/process-batch',
    isAuthenticated,
    upload.array('documents', 10),
    async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: 'No document files provided' });
        }

        // Prepare documents for batch processing
        const documents = files.map(file => ({
          buffer: file.buffer,
          mimeType: file.mimetype,
          name: file.originalname,
        }));

        // Process all documents
        const results = await documentAI.processDocumentBatch(documents);

        // Add validation results for Greek documents
        const resultsWithValidation = results.map(result => {
          let validationResult;
          if (
            result.documentType === 'id_card' ||
            result.documentType === 'contract'
          ) {
            validationResult = documentAI.validateGreekData(
              result.structuredData as any
            );
          }
          return {
            ...result,
            validation: validationResult,
          };
        });

        res.json({
          success: true,
          data: {
            results: resultsWithValidation,
            summary: {
              totalDocuments: files.length,
              processed: results.filter(r => r.status === 'processed').length,
              errors: results.filter(r => r.status === 'error').length,
              contracts: results.filter(r => r.documentType === 'contract')
                .length,
              idCards: results.filter(r => r.documentType === 'id_card').length,
              other: results.filter(r => r.documentType === 'other').length,
            },
          },
        });
      } catch (error) {
        console.error('Batch document processing error:', error);
        res.status(500).json({
          error: 'Failed to process documents',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Auto-categorize document type from text
   */
  app.post('/api/documents/categorize', isAuthenticated, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text content is required' });
      }

      const category = await documentAI.categorizeDocument(text);

      res.json({
        success: true,
        data: {
          category,
          confidence: category !== 'other' ? 0.8 : 0.3,
          suggestions: {
            contract:
              text.toLowerCase().includes('σύμβαση') ||
              text.toLowerCase().includes('εργασία'),
            id_card:
              text.toLowerCase().includes('ταυτότητα') ||
              text.toLowerCase().includes('δελτίο'),
            passport:
              text.toLowerCase().includes('διαβατήριο') ||
              text.toLowerCase().includes('passport'),
          },
        },
      });
    } catch (error) {
      console.error('Document categorization error:', error);
      res.status(500).json({
        error: 'Failed to categorize document',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * Validate Greek identification data (AFM, AMKA)
   */
  app.post(
    '/api/documents/validate-greek-data',
    isAuthenticated,
    async (req, res) => {
      try {
        const { data } = req.body;

        if (!data || typeof data !== 'object') {
          return res.status(400).json({ error: 'Data object is required' });
        }

        const validationResult = documentAI.validateGreekData(data);

        res.json({
          success: true,
          data: validationResult,
        });
      } catch (error) {
        console.error('Greek data validation error:', error);
        res.status(500).json({
          error: 'Failed to validate Greek data',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Create e-signature request for processed documents
   */
  app.post(
    '/api/documents/create-signature-request',
    isAuthenticated,
    async (req, res) => {
      try {
        const {
          documentId,
          documentName,
          documentUrl,
          signers,
          message,
          expirationDays,
          legalCompliance,
          metadata,
        } = req.body;

        // Validate required fields
        if (
          !documentId ||
          !documentName ||
          !documentUrl ||
          !signers ||
          !Array.isArray(signers)
        ) {
          return res.status(400).json({
            error:
              'Required fields: documentId, documentName, documentUrl, signers',
          });
        }

        // Validate signers format
        for (const signer of signers) {
          if (
            !signer.name ||
            !signer.email ||
            !signer.role ||
            typeof signer.sequence !== 'number'
          ) {
            return res.status(400).json({
              error: 'Each signer must have: name, email, role, sequence',
            });
          }
        }

        // Create signature request
        const signatureRequest = await eSignatureService.createSignatureRequest(
          documentId,
          documentName,
          documentUrl,
          signers,
          {
            message,
            expirationDays,
            metadata,
            legalCompliance,
          }
        );

        res.json({
          success: true,
          data: signatureRequest,
        });
      } catch (error) {
        console.error('Signature request creation error:', error);
        res.status(500).json({
          error: 'Failed to create signature request',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Send signature request to signers
   */
  app.post(
    '/api/documents/send-signature-request/:requestId',
    isAuthenticated,
    async (req, res) => {
      try {
        const { requestId } = req.params;

        await eSignatureService.sendSignatureRequest(requestId);

        res.json({
          success: true,
          message: 'Signature request sent successfully',
        });
      } catch (error) {
        console.error('Send signature request error:', error);
        res.status(500).json({
          error: 'Failed to send signature request',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get signature request status
   */
  app.get(
    '/api/documents/signature-request/:requestId',
    isAuthenticated,
    async (req, res) => {
      try {
        const { requestId } = req.params;

        const signatureRequest =
          eSignatureService.getSignatureRequest(requestId);

        if (!signatureRequest) {
          return res.status(404).json({ error: 'Signature request not found' });
        }

        // Get audit trail
        const events = eSignatureService.getSignatureEvents(requestId);

        res.json({
          success: true,
          data: {
            request: signatureRequest,
            events,
            statistics: {
              totalSigners: signatureRequest.signers.length,
              signed: signatureRequest.signers.filter(
                s => s.status === 'signed'
              ).length,
              pending: signatureRequest.signers.filter(
                s => s.status === 'pending'
              ).length,
              declined: signatureRequest.signers.filter(
                s => s.status === 'declined'
              ).length,
            },
          },
        });
      } catch (error) {
        console.error('Get signature request error:', error);
        res.status(500).json({
          error: 'Failed to get signature request',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get all signature requests (with filtering)
   */
  app.get(
    '/api/documents/signature-requests',
    isAuthenticated,
    async (req, res) => {
      try {
        const { status } = req.query;

        let requests;
        if (status && typeof status === 'string') {
          requests = eSignatureService.getRequestsByStatus(status as any);
        } else {
          // Get all requests - in real implementation, this would be paginated
          requests = Array.from((eSignatureService as any).requests.values());
        }

        res.json({
          success: true,
          data: {
            requests,
            summary: {
              total: requests.length,
              draft: requests.filter(r => r.status === 'draft').length,
              in_progress: requests.filter(r => r.status === 'in_progress')
                .length,
              completed: requests.filter(r => r.status === 'completed').length,
              declined: requests.filter(r => r.status === 'declined').length,
              expired: requests.filter(r => r.status === 'expired').length,
            },
          },
        });
      } catch (error) {
        console.error('Get signature requests error:', error);
        res.status(500).json({
          error: 'Failed to get signature requests',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Send reminder for pending signatures
   */
  app.post(
    '/api/documents/send-reminder/:requestId',
    isAuthenticated,
    async (req, res) => {
      try {
        const { requestId } = req.params;

        await eSignatureService.sendReminder(requestId);

        res.json({
          success: true,
          message: 'Reminder sent successfully',
        });
      } catch (error) {
        console.error('Send reminder error:', error);
        res.status(500).json({
          error: 'Failed to send reminder',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Get document processing analytics
   */
  app.get('/api/documents/analytics', isAuthenticated, async (req, res) => {
    try {
      // In a real implementation, this would query a database
      // For now, return mock analytics structure
      const analytics = {
        documentsProcessed: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
          total: 0,
        },
        documentTypes: {
          contracts: 0,
          idCards: 0,
          passports: 0,
          other: 0,
        },
        ocrAccuracy: {
          average: 0,
          contracts: 0,
          idCards: 0,
        },
        signatureRequests: {
          pending: eSignatureService.getRequestsByStatus('in_progress').length,
          completed: eSignatureService.getRequestsByStatus('completed').length,
          declined: eSignatureService.getRequestsByStatus('declined').length,
          expired: eSignatureService.getExpiredRequests().length,
        },
        avgProcessingTime: 0, // seconds
        recentActivity: [], // Recent documents processed
      };

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get document analytics error:', error);
      res.status(500).json({
        error: 'Failed to get document analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
