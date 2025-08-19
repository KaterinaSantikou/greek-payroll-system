import { Storage } from "@google-cloud/storage";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import { randomUUID } from "crypto";

interface OCRResult {
  id: string;
  documentType: 'contract' | 'id_card' | 'passport' | 'other';
  extractedText: string;
  structuredData: Record<string, any>;
  confidence: number;
  processedAt: Date;
  status: 'processed' | 'error' | 'pending';
  errors?: string[];
}

interface ContractData {
  employeeName?: string;
  employeeAFM?: string;
  employeeAMKA?: string;
  contractType?: string;
  startDate?: string;
  endDate?: string;
  baseSalary?: number;
  department?: string;
  position?: string;
  workingHours?: string;
  benefits?: string[];
}

interface IDCardData {
  fullName?: string;
  afm?: string;
  amka?: string;
  birthDate?: string;
  idNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  nationality?: string;
}

export class DocumentAI {
  private documentAI: DocumentProcessorServiceClient;
  private storage: Storage;
  private projectId: string;
  private processorId: string;

  constructor() {
    this.documentAI = new DocumentProcessorServiceClient();
    this.storage = new Storage();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || '';
  }

  /**
   * Process document using Google Document AI OCR
   */
  async processDocument(
    fileBuffer: Buffer,
    mimeType: string,
    documentType: 'contract' | 'id_card' | 'passport' | 'other'
  ): Promise<OCRResult> {
    const processId = randomUUID();
    
    try {
      // Construct the processor name
      const name = `projects/${this.projectId}/locations/eu/processors/${this.processorId}`;

      // The full resource name of the processor
      const request = {
        name,
        rawDocument: {
          content: fileBuffer.toString('base64'),
          mimeType,
        },
      };

      // Process the document
      const [result] = await this.documentAI.processDocument(request);
      const { document } = result;

      if (!document) {
        throw new Error('No document returned from Document AI');
      }

      // Extract text and structured data based on document type
      const extractedText = document.text || '';
      const structuredData = await this.extractStructuredData(document, documentType);
      
      // Calculate confidence score
      const confidence = this.calculateConfidence(document);

      return {
        id: processId,
        documentType,
        extractedText,
        structuredData,
        confidence,
        processedAt: new Date(),
        status: 'processed'
      };

    } catch (error) {
      console.error('Document AI processing error:', error);
      return {
        id: processId,
        documentType,
        extractedText: '',
        structuredData: {},
        confidence: 0,
        processedAt: new Date(),
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Extract structured data based on document type
   */
  private async extractStructuredData(document: any, documentType: string): Promise<Record<string, any>> {
    const entities = document.entities || [];
    
    switch (documentType) {
      case 'contract':
        return this.extractContractData(document, entities);
      case 'id_card':
        return this.extractIDCardData(document, entities);
      default:
        return this.extractGenericData(entities);
    }
  }

  /**
   * Extract contract-specific data
   */
  private extractContractData(document: any, entities: any[]): ContractData {
    const text = document.text || '';
    const contractData: ContractData = {};

    // Use regex patterns to extract Greek employment contract data
    const patterns = {
      employeeName: /(?:Εργαζόμενος|Υπάλληλος|Όνομα)[\s:]+([Α-ΩΆ-Ώα-ωάέήίόύώ\s]+)/i,
      afm: /(?:ΑΦΜ|Α\.Φ\.Μ\.)[\s:]+(\d{9})/i,
      amka: /(?:ΑΜΚΑ|Α\.Μ\.Κ\.Α\.)[\s:]+(\d{11})/i,
      contractType: /(?:Τύπος|Είδος)[\s:]+(?:σύμβασης|συμβολαίου)[\s:]+([Α-ΩΆ-Ώα-ωάέήίόύώ\s]+)/i,
      startDate: /(?:Ημερομηνία|Έναρξη)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      baseSalary: /(?:Μισθός|Αμοιβή)[\s:]+€?(\d+(?:[,\.]\d{2})?)/i,
      department: /(?:Τμήμα|Κλάδος)[\s:]+([Α-ΩΆ-Ώα-ωάέήίόύώ\s]+)/i,
      position: /(?:Θέση|Ειδικότητα)[\s:]+([Α-ΩΆ-Ώα-ωάέήίόύώ\s]+)/i,
      workingHours: /(?:Ώρες|Ωράριο)[\s:]+εργασίας[\s:]+([0-9\-\s:]+)/i
    };

    // Extract data using patterns
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        switch (key) {
          case 'baseSalary':
            contractData[key] = parseFloat(match[1].replace(',', '.'));
            break;
          default:
            (contractData as any)[key] = match[1].trim();
        }
      }
    }

    // Extract benefits from entities
    const benefitEntities = entities.filter(e => 
      e.type === 'BENEFIT' || 
      e.mentionText?.toLowerCase().includes('παροχή') ||
      e.mentionText?.toLowerCase().includes('επίδομα')
    );
    
    if (benefitEntities.length > 0) {
      contractData.benefits = benefitEntities.map(e => e.mentionText);
    }

    return contractData;
  }

  /**
   * Extract ID card specific data
   */
  private extractIDCardData(document: any, entities: any[]): IDCardData {
    const text = document.text || '';
    const idData: IDCardData = {};

    // Greek ID card patterns
    const patterns = {
      fullName: /(?:ΟΝΟΜΑΤΕΠΩΝΥΜΟ|ΌΝΟΜΑ)[\s:]+([Α-ΩΆ-Ώα-ωάέήίόύώ\s]+)/i,
      afm: /(?:ΑΦΜ|Α\.Φ\.Μ\.)[\s:]+(\d{9})/i,
      amka: /(?:ΑΜΚΑ|Α\.Μ\.Κ\.Α\.)[\s:]+(\d{11})/i,
      birthDate: /(?:ΓΕΝΝΗΣΗ|Γενν\.)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      idNumber: /(?:ΑΡΙΘΜΟΣ|Αρ\.)[\s:]+([Α-Ω]{2}\d+)/i,
      issueDate: /(?:ΕΚΔΟΣΗ|Έκδ\.)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      expiryDate: /(?:ΛΗΞΗ|Λήξη)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      nationality: /(?:ΕΘΝΙΚΟΤΗΤΑ|Εθνικ\.)[\s:]+([Α-ΩΆ-Ώα-ωάέήίόύώ]+)/i
    };

    // Extract data using patterns
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        (idData as any)[key] = match[1].trim();
      }
    }

    // Use Document AI entities for additional data
    entities.forEach(entity => {
      const type = entity.type?.toLowerCase();
      const text = entity.mentionText;
      
      if (type === 'person' && !idData.fullName) {
        idData.fullName = text;
      } else if (type === 'date' && text.match(/\d{4}/)) {
        if (!idData.birthDate && text.match(/19|20/)) {
          idData.birthDate = text;
        }
      }
    });

    return idData;
  }

  /**
   * Extract generic data from entities
   */
  private extractGenericData(entities: any[]): Record<string, any> {
    const data: Record<string, any> = {};
    
    entities.forEach(entity => {
      const type = entity.type;
      const text = entity.mentionText;
      
      if (!data[type]) {
        data[type] = [];
      }
      data[type].push(text);
    });

    return data;
  }

  /**
   * Calculate confidence score based on document quality and extraction success
   */
  private calculateConfidence(document: any): number {
    let score = 0;
    let factors = 0;

    // Text quality factor
    const text = document.text || '';
    if (text.length > 100) {
      score += 0.3;
    }
    factors++;

    // Entity extraction factor
    const entities = document.entities || [];
    if (entities.length > 0) {
      score += 0.4;
    }
    factors++;

    // Page quality factor
    const pages = document.pages || [];
    if (pages.length > 0) {
      const firstPage = pages[0];
      if (firstPage.pageQuality?.score) {
        score += firstPage.pageQuality.score * 0.3;
      }
    }
    factors++;

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Validate extracted Greek identification data
   */
  validateGreekData(data: IDCardData | ContractData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate AFM (9 digits)
    if ('afm' in data && data.afm) {
      if (!/^\d{9}$/.test(data.afm)) {
        errors.push('Invalid AFM format - must be 9 digits');
      } else if (!this.validateAFM(data.afm)) {
        errors.push('Invalid AFM - checksum verification failed');
      }
    }

    // Validate AMKA (11 digits)
    if ('amka' in data && data.amka) {
      if (!/^\d{11}$/.test(data.amka)) {
        errors.push('Invalid AMKA format - must be 11 digits');
      } else if (!this.validateAMKA(data.amka)) {
        errors.push('Invalid AMKA - checksum verification failed');
      }
    }

    // Validate dates
    const dateFields = ['startDate', 'endDate', 'birthDate', 'issueDate', 'expiryDate'];
    dateFields.forEach(field => {
      if (field in data && (data as any)[field]) {
        const dateStr = (data as any)[field];
        if (!this.isValidDate(dateStr)) {
          errors.push(`Invalid date format for ${field}`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate Greek AFM using checksum algorithm
   */
  private validateAFM(afm: string): boolean {
    if (afm.length !== 9 || !/^\d+$/.test(afm)) return false;

    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(afm[i]) * Math.pow(2, 8 - i);
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 10 ? remainder : 0;
    
    return checkDigit === parseInt(afm[8]);
  }

  /**
   * Validate Greek AMKA using checksum algorithm
   */
  private validateAMKA(amka: string): boolean {
    if (amka.length !== 11 || !/^\d+$/.test(amka)) return false;

    // Basic date validation (first 6 digits should form a valid date)
    const day = parseInt(amka.substring(0, 2));
    const month = parseInt(amka.substring(2, 4));
    const year = parseInt(amka.substring(4, 6));

    if (day < 1 || day > 31 || month < 1 || month > 12) {
      return false;
    }

    // Checksum validation
    let sum = 0;
    const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(amka[i]) * weights[i];
    }

    const checkDigit = sum % 11;
    return checkDigit === parseInt(amka[10]);
  }

  /**
   * Validate date string format
   */
  private isValidDate(dateStr: string): boolean {
    // Support DD/MM/YYYY, DD-MM-YYYY formats
    const datePattern = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = dateStr.match(datePattern);
    
    if (!match) return false;

    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);

    // Create date object and validate
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  }

  /**
   * Auto-categorize document based on content
   */
  async categorizeDocument(text: string): Promise<'contract' | 'id_card' | 'passport' | 'other'> {
    const lowerText = text.toLowerCase();

    // Greek contract indicators
    const contractKeywords = [
      'σύμβαση', 'συμβόλαιο', 'εργασία', 'μισθωτή', 'εργαζόμενος',
      'εργοδότης', 'αμοιβή', 'μισθός', 'υπάλληλος', 'θέση εργασίας'
    ];

    // Greek ID card indicators
    const idKeywords = [
      'ταυτότητα', 'δελτίο', 'αστυνομική', 'ονοματεπώνυμο',
      'γέννηση', 'πατρώνυμο', 'εθνικότητα', 'έκδοση', 'λήξη'
    ];

    // Passport indicators
    const passportKeywords = [
      'διαβατήριο', 'passport', 'υπουργείο', 'εξωτερικών',
      'ελληνική δημοκρατία', 'hellenic republic'
    ];

    const contractScore = contractKeywords.reduce((score, keyword) => 
      lowerText.includes(keyword) ? score + 1 : score, 0);
    
    const idScore = idKeywords.reduce((score, keyword) => 
      lowerText.includes(keyword) ? score + 1 : score, 0);
    
    const passportScore = passportKeywords.reduce((score, keyword) => 
      lowerText.includes(keyword) ? score + 1 : score, 0);

    const maxScore = Math.max(contractScore, idScore, passportScore);
    
    if (maxScore === 0) return 'other';
    
    if (contractScore === maxScore) return 'contract';
    if (idScore === maxScore) return 'id_card';
    if (passportScore === maxScore) return 'passport';
    
    return 'other';
  }

  /**
   * Process multiple documents in batch
   */
  async processDocumentBatch(
    documents: Array<{ buffer: Buffer; mimeType: string; name: string }>
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (const doc of documents) {
      try {
        // Auto-categorize document
        const tempResult = await this.processDocument(doc.buffer, doc.mimeType, 'other');
        const category = await this.categorizeDocument(tempResult.extractedText);
        
        // Re-process with correct category
        const finalResult = await this.processDocument(doc.buffer, doc.mimeType, category);
        results.push({
          ...finalResult,
          id: `${finalResult.id}_${doc.name}`
        });
        
        // Add small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing document ${doc.name}:`, error);
        results.push({
          id: `error_${randomUUID()}`,
          documentType: 'other',
          extractedText: '',
          structuredData: {},
          confidence: 0,
          processedAt: new Date(),
          status: 'error',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }
    
    return results;
  }
}

export { OCRResult, ContractData, IDCardData };