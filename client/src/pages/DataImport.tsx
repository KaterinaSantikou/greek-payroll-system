import React from 'react';
import { DataImportWizard } from '@/components/DataImportWizard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Upload, 
  FileSpreadsheet, 
  Users, 
  CreditCard,
  FileText,
  Settings
} from 'lucide-react';

const IMPORT_TYPES = [
  {
    id: 'employees',
    title: 'Employee Master Data',
    description: 'Import employee personal information, employment details, and Greek compliance data (AFM, AMKA)',
    icon: Users,
    fields: ['Employee Number', 'Name', 'AFM', 'AMKA', 'Date of Birth', 'Employment Type', 'Hire Date']
  },
  {
    id: 'contracts',
    title: 'Employment Contracts',
    description: 'Import contract details including type, pay rates, and effective dates',
    icon: FileText,
    fields: ['Employee ID', 'Contract Type', 'Base Pay', 'FTE Percentage', 'Effective From/To']
  },
  {
    id: 'bank_details',
    title: 'Bank Account Details',
    description: 'Import secure IBAN information with Greek banking validation',
    icon: CreditCard,
    fields: ['Employee ID', 'IBAN', 'Account Holder Name', 'Bank Name']
  },
  {
    id: 'wage_components',
    title: 'Wage Components',
    description: 'Import salary structures, allowances, and premium rates',
    icon: Settings,
    fields: ['Employee ID', 'Base Salary', 'Allowances', 'Overtime Rates', 'Effective Date']
  }
];

export default function DataImport() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
          <p className="text-muted-foreground">
            Import CSV and Excel files with intelligent field mapping and Greek compliance validation
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {IMPORT_TYPES.map((type) => {
          const IconComponent = type.icon;
          return (
            <Card key={type.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconComponent className="w-5 h-5 text-primary" />
                  {type.title}
                </CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Fields</h4>
                  <div className="flex flex-wrap gap-1">
                    {type.fields.slice(0, 4).map((field) => (
                      <span
                        key={field}
                        className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                      >
                        {field}
                      </span>
                    ))}
                    {type.fields.length > 4 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                        +{type.fields.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <DataImportWizard
                  trigger={
                    <Button className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Import {type.title}
                    </Button>
                  }
                  onImportComplete={() => {
                    // Refresh any relevant data
                    console.log(`Import completed for ${type.title}`);
                  }}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
          <CardDescription>
            Best practices for successful data imports
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-semibold mb-2">File Format</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Supported formats: CSV, Excel (.xls, .xlsx)</li>
              <li>• Maximum file size: 10MB</li>
              <li>• First row must contain column headers</li>
              <li>• Use UTF-8 encoding for Greek characters</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Greek Compliance</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• AFM: 9-digit tax identification number</li>
              <li>• AMKA: 11-digit social security number</li>
              <li>• IBAN: Valid Greek bank account format</li>
              <li>• Automatic validation and error reporting</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Data Validation</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Required fields are automatically detected</li>
              <li>• Data type validation (dates, numbers, text)</li>
              <li>• Duplicate detection and conflict resolution</li>
              <li>• Preview changes before importing</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Safe Import Process</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Multi-step wizard with field mapping</li>
              <li>• Dry-run preview of all changes</li>
              <li>• Rollback capabilities for data integrity</li>
              <li>• Comprehensive audit logging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}