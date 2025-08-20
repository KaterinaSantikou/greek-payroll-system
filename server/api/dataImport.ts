import { Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { db } from '../db';
import { employees, contracts, wageComponents, secureIbanVault } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { validateAFM, validateAMKA } from '../services/greekValidation';
import { IbanValidationService } from '../services/IbanValidationService';
import { nanoid } from 'nanoid';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

// Data type definitions
export type ImportDataType = 'employees' | 'contracts' | 'bank_details' | 'wage_components';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'decimal';
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    customValidator?: 'afm' | 'amka' | 'iban' | 'email';
  };
}

export interface ImportSession {
  sessionId: string;
  dataType: ImportDataType;
  fileName: string;
  totalRows: number;
  mappedColumns: ColumnMapping[];
  parsedData: any[];
  validationResults: ValidationResult[];
  dryRunResults?: DryRunResult[];
  createdAt: Date;
  status: 'uploaded' | 'mapped' | 'validated' | 'ready' | 'imported';
}

export interface ValidationResult {
  rowIndex: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValid: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface DryRunResult {
  rowIndex: number;
  action: 'insert' | 'update' | 'skip';
  existingData?: any;
  newData: any;
  changes?: FieldChange[];
  conflicts: string[];
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'modified' | 'removed';
}

// In-memory session storage (in production, use Redis or database)
const importSessions = new Map<string, ImportSession>();

// Field definitions for each data type
const FIELD_DEFINITIONS: Record<ImportDataType, Record<string, any>> = {
  employees: {
    employeeNumber: { required: true, type: 'string', maxLength: 50 },
    name: { required: true, type: 'string', maxLength: 200 },
    afm: { required: false, type: 'string', length: 9, validator: 'afm' },
    amka: { required: false, type: 'string', length: 11, validator: 'amka' },
    bankIban: { required: false, type: 'string', maxLength: 34, validator: 'iban' },
    dateOfBirth: { required: false, type: 'date' },
    birthYear: { required: false, type: 'number', min: 1920, max: 2010 },
    gender: { required: false, type: 'string', options: ['M', 'F', 'Non-binary', 'Not disclosed'] },
    employmentType: { required: true, type: 'string', options: ['indefinite', 'fixed-term', 'seasonal'] },
    contractType: { required: true, type: 'string' },
    ftePct: { required: false, type: 'decimal', min: 0, max: 100, default: 100 },
    hireDate: { required: true, type: 'date' },
    maritalStatus: { required: false, type: 'string', options: ['single', 'married', 'divorced', 'widowed'] },
    dependents: { required: false, type: 'number', min: 0, max: 20, default: 0 }
  },
  contracts: {
    employeeId: { required: true, type: 'string' },
    type: { required: true, type: 'string', options: ['indefinite', 'fixed_term', 'seasonal', 'trial'] },
    grade: { required: false, type: 'string', maxLength: 50 },
    basePay: { required: true, type: 'decimal', min: 0 },
    ftePct: { required: false, type: 'decimal', min: 0, max: 100, default: 100 },
    effectiveFrom: { required: true, type: 'date' },
    effectiveTo: { required: false, type: 'date' }
  },
  bank_details: {
    employeeId: { required: true, type: 'string' },
    fullIban: { required: true, type: 'string', maxLength: 34, validator: 'iban' },
    accountHolderName: { required: true, type: 'string', maxLength: 140 },
    bankName: { required: false, type: 'string', maxLength: 100 }
  },
  wage_components: {
    employeeId: { required: true, type: 'string' },
    baseSalary: { required: true, type: 'decimal', min: 0 },
    hourlyRate: { required: false, type: 'decimal', min: 0 },
    foodAllowance: { required: false, type: 'decimal', min: 0, default: 0 },
    housingAllowance: { required: false, type: 'decimal', min: 0, default: 0 },
    transportAllowance: { required: false, type: 'decimal', min: 0, default: 0 },
    overtimeEligible: { required: false, type: 'boolean', default: true },
    effectiveFrom: { required: true, type: 'date' }
  }
};

/**
 * Upload and parse CSV/Excel file
 */
export async function uploadDataFile(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dataType } = req.body;
    
    if (!dataType || !Object.keys(FIELD_DEFINITIONS).includes(dataType)) {
      return res.status(400).json({ 
        error: 'Invalid data type',
        validTypes: Object.keys(FIELD_DEFINITIONS)
      });
    }

    // Parse file based on type
    let parsedData: any[] = [];
    let headers: string[] = [];

    try {
      if (req.file.mimetype === 'text/csv') {
        // Parse CSV
        const csvData = req.file.buffer.toString('utf-8');
        const lines = csvData.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          return res.status(400).json({ error: 'Empty file' });
        }
        
        headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          parsedData.push(row);
        }
      } else {
        // Parse Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          return res.status(400).json({ error: 'Empty worksheet' });
        }
        
        headers = (jsonData[0] as any[]).map(h => String(h || '').trim());
        
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i] as any[];
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] !== undefined ? String(values[index]) : '';
          });
          parsedData.push(row);
        }
      }
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Failed to parse file',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' 
      });
    }

    // Create import session
    const sessionId = nanoid();
    const session: ImportSession = {
      sessionId,
      dataType: dataType as ImportDataType,
      fileName: req.file.originalname,
      totalRows: parsedData.length,
      mappedColumns: [],
      parsedData,
      validationResults: [],
      createdAt: new Date(),
      status: 'uploaded'
    };

    importSessions.set(sessionId, session);

    res.json({
      sessionId,
      fileName: req.file.originalname,
      totalRows: parsedData.length,
      headers,
      sampleData: parsedData.slice(0, 5), // First 5 rows for preview
      availableFields: Object.keys(FIELD_DEFINITIONS[dataType as ImportDataType])
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Set column mappings for import session
 */
export async function setColumnMapping(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { mappings } = req.body;

    const session = importSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Import session not found' });
    }

    // Validate mappings
    const columnMappings: ColumnMapping[] = [];
    const fieldDefs = FIELD_DEFINITIONS[session.dataType];

    for (const mapping of mappings) {
      const { sourceColumn, targetField } = mapping;
      
      if (!fieldDefs[targetField]) {
        return res.status(400).json({ 
          error: `Invalid target field: ${targetField}`,
          availableFields: Object.keys(fieldDefs)
        });
      }

      const fieldDef = fieldDefs[targetField];
      columnMappings.push({
        sourceColumn,
        targetField,
        required: fieldDef.required || false,
        dataType: fieldDef.type,
        validation: {
          minLength: fieldDef.minLength,
          maxLength: fieldDef.maxLength,
          min: fieldDef.min,
          max: fieldDef.max,
          pattern: fieldDef.pattern,
          customValidator: fieldDef.validator
        }
      });
    }

    session.mappedColumns = columnMappings;
    session.status = 'mapped';

    res.json({
      sessionId,
      mappedColumns: columnMappings,
      status: session.status
    });

  } catch (error) {
    console.error('Mapping error:', error);
    res.status(500).json({ error: 'Failed to set column mapping' });
  }
}

/**
 * Validate mapped data
 */
export async function validateData(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const session = importSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Import session not found' });
    }

    if (session.status !== 'mapped') {
      return res.status(400).json({ error: 'Session not ready for validation' });
    }

    const validationResults: ValidationResult[] = [];
    
    for (let rowIndex = 0; rowIndex < session.parsedData.length; rowIndex++) {
      const row = session.parsedData[rowIndex];
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validate each mapped field
      for (const mapping of session.mappedColumns) {
        const value = row[mapping.sourceColumn];
        
        // Check required fields
        if (mapping.required && (!value || value.toString().trim() === '')) {
          errors.push({
            field: mapping.targetField,
            message: `${mapping.targetField} is required but missing`,
            code: 'REQUIRED_FIELD_MISSING',
            value
          });
          continue;
        }

        // Skip validation if empty and not required
        if (!value || value.toString().trim() === '') {
          continue;
        }

        // Data type validation
        const validationResult = await validateFieldValue(
          value, 
          mapping.targetField, 
          mapping.validation
        );

        if (!validationResult.isValid) {
          errors.push(...validationResult.errors);
        }
        
        if (validationResult.warnings.length > 0) {
          warnings.push(...validationResult.warnings);
        }
      }

      validationResults.push({
        rowIndex,
        errors,
        warnings,
        isValid: errors.length === 0
      });
    }

    session.validationResults = validationResults;
    session.status = 'validated';

    const validRowCount = validationResults.filter(r => r.isValid).length;
    const errorRowCount = validationResults.filter(r => !r.isValid).length;

    res.json({
      sessionId,
      totalRows: session.totalRows,
      validRows: validRowCount,
      errorRows: errorRowCount,
      validationResults: validationResults,
      status: session.status
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate data' });
  }
}

/**
 * Run dry-run import to show what changes would be made
 */
export async function dryRunImport(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const session = importSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Import session not found' });
    }

    if (session.status !== 'validated') {
      return res.status(400).json({ error: 'Data must be validated before dry run' });
    }

    const validRows = session.validationResults
      .filter(r => r.isValid)
      .map(r => r.rowIndex);

    const dryRunResults: DryRunResult[] = [];

    for (const rowIndex of validRows) {
      const row = session.parsedData[rowIndex];
      const mappedData = mapRowToData(row, session.mappedColumns);
      
      const dryRunResult = await generateDryRunResult(
        session.dataType,
        mappedData,
        rowIndex
      );
      
      dryRunResults.push(dryRunResult);
    }

    session.dryRunResults = dryRunResults;
    session.status = 'ready';

    const insertCount = dryRunResults.filter(r => r.action === 'insert').length;
    const updateCount = dryRunResults.filter(r => r.action === 'update').length;
    const skipCount = dryRunResults.filter(r => r.action === 'skip').length;

    res.json({
      sessionId,
      summary: {
        totalRows: dryRunResults.length,
        inserts: insertCount,
        updates: updateCount,
        skips: skipCount
      },
      dryRunResults,
      status: session.status
    });

  } catch (error) {
    console.error('Dry run error:', error);
    res.status(500).json({ error: 'Failed to perform dry run' });
  }
}

/**
 * Execute the actual import
 */
export async function executeImport(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const { confirmImport } = req.body;
    
    if (!confirmImport) {
      return res.status(400).json({ error: 'Import confirmation required' });
    }

    const session = importSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Import session not found' });
    }

    if (session.status !== 'ready') {
      return res.status(400).json({ error: 'Session not ready for import' });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const importErrors: any[] = [];

    // Execute imports in database transaction
    await db.transaction(async (tx) => {
      for (const dryRunResult of session.dryRunResults || []) {
        if (dryRunResult.action === 'skip') continue;

        try {
          await executeRowImport(tx, session.dataType, dryRunResult);
          
          if (dryRunResult.action === 'insert') insertedCount++;
          else if (dryRunResult.action === 'update') updatedCount++;
          
        } catch (error) {
          errorCount++;
          importErrors.push({
            rowIndex: dryRunResult.rowIndex,
            error: error.message
          });
        }
      }
    });

    session.status = 'imported';

    res.json({
      sessionId,
      success: true,
      summary: {
        inserted: insertedCount,
        updated: updatedCount,
        errors: errorCount
      },
      errors: importErrors
    });

  } catch (error) {
    console.error('Import execution error:', error);
    res.status(500).json({ error: 'Failed to execute import' });
  }
}

/**
 * Get import session status
 */
export async function getImportSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    const session = importSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Import session not found' });
    }

    res.json(session);

  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
}

// Helper functions

async function validateFieldValue(
  value: any, 
  fieldName: string, 
  validation?: ColumnMapping['validation']
): Promise<{ isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] }> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!validation) {
    return { isValid: true, errors, warnings };
  }

  const strValue = String(value);

  // Length validation
  if (validation.minLength && strValue.length < validation.minLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be at least ${validation.minLength} characters`,
      code: 'MIN_LENGTH_VIOLATION',
      value
    });
  }

  if (validation.maxLength && strValue.length > validation.maxLength) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must not exceed ${validation.maxLength} characters`,
      code: 'MAX_LENGTH_VIOLATION', 
      value
    });
  }

  // Custom validators
  if (validation.customValidator) {
    try {
      switch (validation.customValidator) {
        case 'afm':
          if (!validateAFM(strValue)) {
            errors.push({
              field: fieldName,
              message: 'Invalid Greek Tax ID (AFM) format',
              code: 'INVALID_AFM',
              value
            });
          }
          break;
        case 'amka':
          if (!validateAMKA(strValue)) {
            errors.push({
              field: fieldName,
              message: 'Invalid Greek Social Security Number (AMKA) format',
              code: 'INVALID_AMKA',
              value
            });
          }
          break;
        case 'iban':
          const ibanValidationRequest = {
            employeeId: '',
            iban: strValue,
            accountHolderName: ''
          };
          const ibanValidation = await IbanValidationService.validateEmployeeIban(
            ibanValidationRequest,
            'import-validation'
          );
          const isValid = ibanValidation.validation.isValid;
          if (!isValid) {
            errors.push({
              field: fieldName,
              message: 'Invalid IBAN format',
              code: 'INVALID_IBAN',
              value
            });
          }
          break;
      }
    } catch (validationError) {
      warnings.push({
        field: fieldName,
        message: `Could not validate ${fieldName}: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`,
        code: 'VALIDATION_WARNING',
        value
      });
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

function mapRowToData(row: any, mappings: ColumnMapping[]): any {
  const mappedData: any = {};
  
  for (const mapping of mappings) {
    let value = row[mapping.sourceColumn];
    
    // Convert data types
    if (value !== null && value !== undefined && value !== '') {
      switch (mapping.dataType) {
        case 'number':
          value = Number(value);
          break;
        case 'decimal':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase());
          break;
        case 'date':
          value = new Date(value).toISOString().split('T')[0];
          break;
      }
    }
    
    mappedData[mapping.targetField] = value;
  }
  
  return mappedData;
}

async function generateDryRunResult(
  dataType: ImportDataType,
  mappedData: any,
  rowIndex: number
): Promise<DryRunResult> {
  let existingData: any = null;
  let action: 'insert' | 'update' | 'skip' = 'insert';
  const changes: FieldChange[] = [];
  const conflicts: string[] = [];

  // Check for existing records based on data type
  try {
    switch (dataType) {
      case 'employees':
        if (mappedData.employeeNumber) {
          const existing = await db
            .select()
            .from(employees)
            .where(eq(employees.employeeNumber, mappedData.employeeNumber))
            .limit(1);
          
          if (existing.length > 0) {
            existingData = existing[0];
            action = 'update';
            
            // Generate field changes
            Object.keys(mappedData).forEach(field => {
              if (existingData[field] !== mappedData[field]) {
                changes.push({
                  field,
                  oldValue: existingData[field],
                  newValue: mappedData[field],
                  type: 'modified'
                });
              }
            });
          }
        }
        break;

      case 'contracts':
        if (mappedData.employeeId) {
          const existing = await db
            .select()
            .from(contracts)
            .where(
              and(
                eq(contracts.employeeId, mappedData.employeeId),
                eq(contracts.effectiveFrom, mappedData.effectiveFrom)
              )
            )
            .limit(1);
            
          if (existing.length > 0) {
            existingData = existing[0];
            action = 'update';
          }
        }
        break;

      case 'bank_details':
        if (mappedData.employeeId) {
          const existing = await db
            .select()
            .from(secureIbanVault)
            .where(eq(secureIbanVault.employeeId, mappedData.employeeId))
            .limit(1);
            
          if (existing.length > 0) {
            existingData = existing[0];
            action = 'update';
          }
        }
        break;

      case 'wage_components':
        if (mappedData.employeeId) {
          const existing = await db
            .select()
            .from(wageComponents)
            .where(
              and(
                eq(wageComponents.employeeId, mappedData.employeeId),
                eq(wageComponents.effectiveFrom, mappedData.effectiveFrom)
              )
            )
            .limit(1);
            
          if (existing.length > 0) {
            existingData = existing[0];
            action = 'update';
          }
        }
        break;
    }
  } catch (error) {
    conflicts.push(`Error checking existing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    rowIndex,
    action,
    existingData,
    newData: mappedData,
    changes,
    conflicts
  };
}

async function executeRowImport(tx: any, dataType: ImportDataType, dryRunResult: DryRunResult) {
  const { action, newData, existingData } = dryRunResult;
  
  switch (dataType) {
    case 'employees':
      if (action === 'insert') {
        await tx.insert(employees).values(newData);
      } else if (action === 'update') {
        await tx
          .update(employees)
          .set(newData)
          .where(eq(employees.employeeId, existingData.employeeId));
      }
      break;

    case 'contracts':
      if (action === 'insert') {
        await tx.insert(contracts).values(newData);
      } else if (action === 'update') {
        await tx
          .update(contracts)
          .set(newData)
          .where(eq(contracts.contractId, existingData.contractId));
      }
      break;

    case 'bank_details':
      if (action === 'insert') {
        await tx.insert(secureIbanVault).values(newData);
      } else if (action === 'update') {
        await tx
          .update(secureIbanVault)
          .set(newData)
          .where(eq(secureIbanVault.vaultId, existingData.vaultId));
      }
      break;

    case 'wage_components':
      if (action === 'insert') {
        await tx.insert(wageComponents).values(newData);
      } else if (action === 'update') {
        await tx
          .update(wageComponents)
          .set(newData)
          .where(eq(wageComponents.componentId, existingData.componentId));
      }
      break;
  }
}