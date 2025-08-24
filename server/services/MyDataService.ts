import crypto from 'crypto';
import { Invoice, CreditNote } from '@shared/billingSchema';

export interface MyDataInvoiceRequest {
  invoice: Invoice;
  organizationVatNumber: string;
  organizationName: string;
  organizationAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface MyDataResponse {
  success: boolean;
  invoiceUid?: string;
  mark?: string; // AADE Mark for the document
  qrCode?: string;
  authenticationCode?: string;
  errors?: string[];
  transmissionDate?: Date;
}

export interface MyDataInvoiceData {
  invoiceHeader: {
    series: string; // Max 50 chars
    aa: string; // Sequential number, max 50 chars
    issueDate: string;
    invoiceType: string; // 1.1 for Services Provided, 5.1 for Correlated Credit Note
    currency: string;
    exchangeRate?: number;
    selfPricing?: boolean;
    dispatchDate?: string;
    dispatchTime?: string;
    vehicleNumber?: string;
    movePurpose?: string;
  };
  counterpart: {
    vatNumber: string;
    country: string;
    branch?: number;
    name: string;
    address: {
      street: string;
      number?: string;
      postalCode: string;
      city: string;
    };
  };
  issuer: {
    vatNumber: string;
    country: string;
    branch?: number;
    name: string;
    address: {
      street: string;
      number?: string;
      postalCode: string;
      city: string;
    };
  };
  invoiceDetails: Array<{
    lineNumber: number;
    recType: string; // 1 for services
    fuelCode?: string;
    quantity: number;
    measurementUnit: string; // 1 for pieces/units
    invoiceDetailType: string; // 1 for Service provision
    netValue: number;
    vatCategory: string; // 1 for 24%, 2 for 13%, 3 for 6%, 4 for 17%, 5 for 9%, 6 for 4%, 7 for 0%, 8 for exemptions
    vatAmount: number;
    vatExemptionCategory?: string;
    dienergia?: string; // For specific service types
    // Income classifications (required)
    incomeClassification: Array<{
      classificationType: string; // E3_561_001, E3_562_001, etc.
      classificationCategory: string; // category_1_1, category_1_2, etc.
      amount: number;
    }>;
    // Expenses classifications (if applicable)
    expensesClassification?: Array<{
      classificationType: string;
      classificationCategory: string;
      amount: number;
    }>;
    withholdingTaxCategory?: string;
    withholdingTaxAmount?: number;
    stampDutyCategory?: string;
    stampDutyAmount?: number;
    feesCategory?: string;
    feesAmount?: number;
    otherTaxesCategory?: string;
    otherTaxesAmount?: number;
    deductionsCategory?: string;
    deductionsAmount?: number;
    comments?: string;
  }>;
  invoiceSummary: {
    totalNetValue: number;
    totalVatAmount: number;
    totalWithholdingTaxAmount: number;
    totalFeesAmount: number;
    totalStampDutyAmount: number;
    totalOtherTaxesAmount: number;
    totalDeductionsAmount: number;
    totalGrossValue: number;
    // Income classification totals
    incomeClassification: Array<{
      classificationType: string;
      classificationCategory: string;
      amount: number;
    }>;
    // Expenses classification totals (if applicable)
    expensesClassification?: Array<{
      classificationType: string;
      classificationCategory: string;
      amount: number;
    }>;
  };
}

export class MyDataService {
  private readonly apiUrl: string;
  private readonly userId: string;
  private readonly subscriptionKey: string;

  constructor() {
    this.apiUrl = process.env.MYDATA_API_URL || 'https://mydata-dev.azure-api.net';
    this.userId = process.env.MYDATA_USER_ID || '';
    this.subscriptionKey = process.env.MYDATA_SUBSCRIPTION_KEY || '';
    
    if (!this.userId || !this.subscriptionKey) {
      console.info('[Integrations] MyDATA not configured (ok in dev).');
    }
  }

  /**
   * Transmit invoice to myDATA for electronic books compliance
   */
  async transmitInvoice(request: MyDataInvoiceRequest): Promise<MyDataResponse> {
    try {
      const invoiceData = this.buildInvoiceData(request);
      
      // Generate authentication token
      const authToken = this.generateAuthToken(request.organizationVatNumber);
      
      const response = await fetch(`${this.apiUrl}/SendInvoicesDoc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'aade-user-id': this.userId,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          errors: [`HTTP ${response.status}: ${errorText}`]
        };
      }

      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        return {
          success: false,
          errors: result.errors.map((e: any) => e.message)
        };
      }

      return {
        success: true,
        invoiceUid: result.invoiceUid,
        mark: result.mark, // AADE Mark
        qrCode: result.qrCode,
        authenticationCode: result.authenticationCode,
        transmissionDate: new Date()
      };

    } catch (error) {
      console.error('MyDATA transmission failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Transmit credit note to myDATA
   */
  async transmitCreditNote(
    creditNote: CreditNote,
    originalInvoice: Invoice,
    organizationDetails: {
      organizationVatNumber: string;
      organizationName: string;
      organizationAddress: { street: string; city: string; postalCode: string; country: string; };
    }
  ): Promise<MyDataResponse> {
    // Credit notes are treated as correlated documents in myDATA
    const request: MyDataInvoiceRequest = {
      invoice: {
        ...originalInvoice,
        id: creditNote.id,
        invoiceNumber: creditNote.creditNoteNumber,
        type: 'credit_note',
        subtotalCents: creditNote.creditAmountCents,
        vatAmountCents: creditNote.vatAmountCents,
        totalCents: creditNote.totalCreditCents,
        issueDate: creditNote.issueDate,
        items: [
          {
            description: `Credit Note for Invoice ${originalInvoice.invoiceNumber}`,
            periodStart: originalInvoice.periodStart,
            periodEnd: originalInvoice.periodEnd,
            quantity: 1,
            unitPriceCents: creditNote.creditAmountCents,
            subtotalCents: creditNote.creditAmountCents,
            isProrated: false
          }
        ]
      },
      organizationVatNumber: organizationDetails.organizationVatNumber,
      organizationName: organizationDetails.organizationName,
      organizationAddress: organizationDetails.organizationAddress
    };

    return this.transmitInvoice(request);
  }

  /**
   * Get invoice status from myDATA
   */
  async getInvoiceStatus(invoiceUid: string, organizationVatNumber: string): Promise<{
    status: 'transmitted' | 'rejected' | 'cancelled';
    details?: any;
  }> {
    try {
      const authToken = this.generateAuthToken(organizationVatNumber);
      
      const response = await fetch(`${this.apiUrl}/RequestDocs?mark=${invoiceUid}`, {
        method: 'GET',
        headers: {
          'aade-user-id': this.userId,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
          'Authorization': `Bearer ${authToken}`,
        }
      });

      const result = await response.json();
      
      return {
        status: result.status || 'transmitted',
        details: result
      };

    } catch (error) {
      console.error('Failed to get invoice status:', error);
      return { status: 'transmitted' }; // Assume success on error
    }
  }

  /**
   * Build myDATA invoice structure from our invoice data
   */
  private buildInvoiceData(request: MyDataInvoiceRequest): MyDataInvoiceData {
    const { invoice, organizationVatNumber, organizationName, organizationAddress } = request;
    
    // Parse invoice number to extract series and sequential number
    const [series, year, number] = invoice.invoiceNumber.split('-');
    
    // Validate myDATA constraints
    if (series.length > 50) {
      throw new Error('Invoice series exceeds myDATA maximum length of 50 characters');
    }
    if (number.length > 50) {
      throw new Error('Invoice number exceeds myDATA maximum length of 50 characters');
    }
    
    // Get customer details from subscription - would need to be fetched separately
    // For now, we'll extract what we can from the invoice
    const customerVatNumber = '';
    const customerName = '';
    const customerAddress = { street: '', city: '', postalCode: '', country: 'GR' };

    const invoiceData: MyDataInvoiceData = {
      invoiceHeader: {
        series: series.substring(0, 50), // Ensure myDATA length limit
        aa: number.substring(0, 50), // Ensure myDATA length limit
        issueDate: invoice.issueDate,
        invoiceType: invoice.type === 'credit_note' ? '5.1' : '1.1', // 1.1 for Services Provided, 5.1 for Correlated Credit Note
        currency: 'EUR'
      },
      
      counterpart: {
        vatNumber: customerVatNumber,
        country: 'GR',
        name: customerName,
        address: {
          street: customerAddress.street,
          postalCode: customerAddress.postalCode,
          city: customerAddress.city
        }
      },
      
      issuer: {
        vatNumber: organizationVatNumber,
        country: 'GR',
        name: organizationName,
        address: {
          street: organizationAddress.street,
          postalCode: organizationAddress.postalCode,
          city: organizationAddress.city
        }
      },

      invoiceDetails: [],
      
      invoiceSummary: {
        totalNetValue: invoice.subtotalCents / 100,
        totalVatAmount: invoice.vatAmountCents / 100,
        totalWithholdingTaxAmount: 0,
        totalFeesAmount: 0,
        totalStampDutyAmount: 0,
        totalOtherTaxesAmount: 0,
        totalDeductionsAmount: 0,
        totalGrossValue: invoice.totalCents / 100,
        // Income classification for software services
        incomeClassification: [
          {
            classificationType: 'E3_561_001', // Services - Software/IT
            classificationCategory: 'category_1_1',
            amount: invoice.subtotalCents / 100
          }
        ]
      }
    };

    // Build invoice details from line items
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    items.forEach((item: any, index: number) => {
      const itemNetValue = item.subtotalCents / 100;
      const itemVatAmount = (item.subtotalCents * parseFloat(invoice.vatRate)) / 100;
      
      invoiceData.invoiceDetails.push({
        lineNumber: index + 1,
        recType: '1', // Services
        quantity: item.quantity,
        measurementUnit: '1', // Pieces/units
        invoiceDetailType: '1', // Service provision
        netValue: itemNetValue,
        vatCategory: this.getVatCategoryFromRate(parseFloat(invoice.vatRate)),
        vatAmount: itemVatAmount,
        // Required income classification per line item
        incomeClassification: [
          {
            classificationType: 'E3_561_001', // Services - Software/IT
            classificationCategory: 'category_1_1',
            amount: itemNetValue
          }
        ],
        comments: item.description
      });
    });

    return invoiceData;
  }

  /**
   * Generate authentication token for myDATA API
   */
  private generateAuthToken(vatNumber: string): string {
    // myDATA uses a specific token format based on VAT number and timestamp
    const timestamp = Date.now();
    const data = `${vatNumber}${timestamp}`;
    
    // This is a simplified token generation - actual implementation
    // would use proper cryptographic signing with your myDATA certificates
    return Buffer.from(data).toString('base64');
  }

  /**
   * Parse address from JSON to myDATA format
   */
  private parseAddress(billingAddress: any): {
    street: string;
    number?: string;
    city: string;
    postalCode: string;
    country: string;
  } {
    if (!billingAddress) {
      return {
        street: '',
        city: '',
        postalCode: '',
        country: 'GR'
      };
    }

    return {
      street: billingAddress.street || '',
      number: billingAddress.number,
      city: billingAddress.city || '',
      postalCode: billingAddress.postalCode || '',
      country: billingAddress.country || 'GR'
    };
  }

  /**
   * Get myDATA VAT category code from rate
   */
  private getVatCategoryFromRate(vatRate: number): string {
    // myDATA VAT categories for Greece
    if (vatRate === 0.24) return '1'; // 24%
    if (vatRate === 0.13) return '2'; // 13%
    if (vatRate === 0.06) return '3'; // 6%
    if (vatRate === 0) return '8'; // 0% (exempt/reverse charge)
    
    return '1'; // Default to 24%
  }

  /**
   * Generate EN 16931 XML for B2G e-invoicing
   */
  async generateEN16931XML(invoice: Invoice, organizationDetails: any, customerDetails: any): Promise<string> {
    // EN 16931 is the European standard for electronic invoicing
    // This would generate UBL 2.1 or UN/CEFACT Cross Industry Invoice XML
    
    const issueDate = new Date(invoice.issueDate).toISOString().split('T')[0];
    const dueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
    
    // Simplified UBL 2.1 XML structure
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" 
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" 
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>PayrollSync HR &amp; Payroll Services</cbc:Note>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${organizationDetails.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${organizationDetails.address.street}</cbc:StreetName>
        <cbc:CityName>${organizationDetails.address.city}</cbc:CityName>
        <cbc:PostalZone>${organizationDetails.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>GR</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${organizationDetails.vatNumber}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${customerDetails.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${customerDetails.address.street}</cbc:StreetName>
        <cbc:CityName>${customerDetails.address.city}</cbc:CityName>
        <cbc:PostalZone>${customerDetails.address.postalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>GR</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${customerDetails.vatNumber}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  ${this.generateInvoiceLines(invoice)}
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${(invoice.vatAmountCents / 100).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${(invoice.subtotalCents / 100).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${(invoice.vatAmountCents / 100).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${(parseFloat(invoice.vatRate) * 100).toFixed(0)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${(invoice.subtotalCents / 100).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${(invoice.subtotalCents / 100).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${(invoice.totalCents / 100).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">${(invoice.totalCents / 100).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    return xml;
  }

  /**
   * Generate invoice lines for EN 16931 XML
   */
  private generateInvoiceLines(invoice: Invoice): string {
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    
    return items.map((item: any, index: number) => `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${(item.subtotalCents / 100).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${this.escapeXml(item.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${(parseFloat(invoice.vatRate) * 100).toFixed(0)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${(item.unitPriceCents / 100).toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join('');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Deliver B2G e-invoice via provider
   */
  async deliverB2GInvoice(xml: string, customerVatNumber: string): Promise<boolean> {
    try {
      // This would integrate with a B2G e-invoicing provider
      // Such as PEPPOL Access Point or national e-invoicing platform
      console.log('Delivering B2G invoice via e-invoicing provider...');
      console.log(`Customer VAT: ${customerVatNumber}`);
      console.log(`XML length: ${xml.length} characters`);
      
      // Mock delivery - in production, integrate with actual provider
      return true;
    } catch (error) {
      console.error('B2G invoice delivery failed:', error);
      return false;
    }
  }

  /**
   * Get income classification type based on service type
   * OPERATIONAL REQUIREMENT: Keep classification mapping updated with AADE changes
   */
  getIncomeClassification(serviceType: string): string {
    // Greek income classification types for different service categories
    // Last updated: 2025-08-20 - Monitor for AADE classification changes
    const classifications = {
      'payroll_service_base': 'E3_561_007', // Software services
      'payroll_service_employee': 'E3_561_007', // Per-employee billing
      'software': 'E3_561_001', // Software development services
      'payroll': 'E3_562_001',  // Payroll processing services
      'hr': 'E3_563_001',       // HR consulting services
      'consulting': 'E3_564_001', // Business consulting
      'training': 'E3_565_001'   // Training services
    };
    
    return classifications[serviceType as keyof typeof classifications] || 'E3_561_007'; // Default to software services
  }

  /**
   * OPERATIONAL REQUIREMENT: myDATA API version monitoring
   */
  async checkApiVersionStatus(): Promise<{
    currentVersion: string;
    isDeprecated: boolean;
    migrationRequired: boolean;
    deprecationDate?: Date;
  }> {
    try {
      // This would call AADE's version status endpoint
      // For now, return current known status
      return {
        currentVersion: 'v1.0.8',
        isDeprecated: false,
        migrationRequired: false,
        deprecationDate: undefined
      };
    } catch (error) {
      console.error('Failed to check myDATA API version:', error);
      return {
        currentVersion: 'unknown',
        isDeprecated: false,
        migrationRequired: true // Assume migration needed if check fails
      };
    }
  }

  /**
   * Validate that myDATA credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.userId && this.subscriptionKey);
  }
}

export const myDataService = new MyDataService();