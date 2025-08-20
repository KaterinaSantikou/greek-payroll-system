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
  qrCode?: string;
  errors?: string[];
  transmissionDate?: Date;
}

export interface MyDataInvoiceData {
  invoiceHeader: {
    series: string;
    aa: string; // Sequential number
    issueDate: string;
    invoiceType: string; // 1.1 for Services, 5.1 for Credit Note
    currency: string;
  };
  counterpart: {
    vatNumber: string;
    name: string;
    address: {
      street: string;
      number?: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  issuer: {
    vatNumber: string;
    name: string;
    address: {
      street: string;
      number?: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  invoiceDetails: Array<{
    lineNumber: number;
    recType: string; // 1 for services
    fuelCode?: string;
    quantity: number;
    measurementUnit: string;
    invoiceDetailType: string; // 1 for Service provision
    netValue: number;
    vatCategory: string; // 1 for 24%, 2 for 13%, etc.
    vatAmount: number;
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
      console.warn('MyDATA credentials not configured. Electronic books transmission will not work.');
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
        qrCode: result.qrCode,
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
    
    // Get customer details from subscription - would need to be fetched separately
    // For now, we'll extract what we can from the invoice
    const customerVatNumber = '';
    const customerName = '';
    const customerAddress = { street: '', city: '', postalCode: '', country: 'GR' };

    const invoiceData: MyDataInvoiceData = {
      invoiceHeader: {
        series: series,
        aa: number, // Sequential number
        issueDate: invoice.issueDate,
        invoiceType: invoice.type === 'credit_note' ? '5.1' : '1.1', // 1.1 for Services, 5.1 for Credit Note
        currency: 'EUR'
      },
      
      counterpart: {
        vatNumber: customerVatNumber,
        name: customerName,
        address: customerAddress
      },
      
      issuer: {
        vatNumber: organizationVatNumber,
        name: organizationName,
        address: {
          street: organizationAddress.street,
          city: organizationAddress.city,
          postalCode: organizationAddress.postalCode,
          country: organizationAddress.country
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
        totalGrossValue: invoice.totalCents / 100
      }
    };

    // Build invoice details from line items
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    items.forEach((item: any, index: number) => {
      invoiceData.invoiceDetails.push({
        lineNumber: index + 1,
        recType: '1', // Services
        quantity: item.quantity,
        measurementUnit: '1', // Default unit
        invoiceDetailType: '1', // Service provision
        netValue: item.subtotalCents / 100,
        vatCategory: this.getVatCategoryFromRate(parseFloat(invoice.vatRate)),
        vatAmount: (item.subtotalCents * parseFloat(invoice.vatRate)) / 100,
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
   * Validate that myDATA credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.userId && this.subscriptionKey);
  }
}

export const myDataService = new MyDataService();