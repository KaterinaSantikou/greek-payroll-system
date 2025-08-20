import { Invoice, Subscription, BillingPlan } from '@shared/billingSchema';

export interface InvoiceTemplateData {
  invoice: Invoice;
  subscription: Subscription;
  plan: BillingPlan;
  organizationDetails: {
    name: string;
    vatNumber: string;
    taxOffice: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
      phone?: string;
      email?: string;
      website?: string;
    };
    logoUrl?: string;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  pdfBuffer?: Buffer;
  error?: string;
}

export class InvoicePDFService {
  
  /**
   * Generate PDF invoice with Greek formatting
   */
  async generateInvoicePDF(templateData: InvoiceTemplateData): Promise<PDFGenerationResult> {
    try {
      // For production, you would use a proper PDF generation library like Puppeteer or PDFKit
      // This is a simplified implementation that generates HTML that can be converted to PDF
      
      const htmlContent = await this.generateInvoiceHTML(templateData);
      
      // In production, use Puppeteer to convert HTML to PDF:
      // const browser = await puppeteer.launch();
      // const page = await browser.newPage();
      // await page.setContent(htmlContent);
      // const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: 20, bottom: 20, left: 20, right: 20 } });
      // await browser.close();
      
      // For now, we'll simulate PDF generation and return the HTML
      const pdfBuffer = Buffer.from(htmlContent, 'utf-8');
      
      return {
        success: true,
        pdfBuffer,
        pdfUrl: `/api/invoices/${templateData.invoice.id}/pdf`
      };

    } catch (error) {
      console.error('PDF generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate HTML template for invoice
   */
  private async generateInvoiceHTML(templateData: InvoiceTemplateData): Promise<string> {
    const { invoice, subscription, plan, organizationDetails } = templateData;
    
    const isGreek = invoice.language === 'el';
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    
    const labels = {
      invoice: isGreek ? 'ΤΙΜΟΛΟΓΙΟ' : 'INVOICE',
      creditNote: isGreek ? 'ΠΙΣΤΩΤΙΚΟ ΣΗΜΕΙΩΜΑ' : 'CREDIT NOTE',
      invoiceNumber: isGreek ? 'Αριθμός Τιμολογίου' : 'Invoice Number',
      series: isGreek ? 'Σειρά' : 'Series',
      issueDate: isGreek ? 'Ημερομηνία Έκδοσης' : 'Issue Date',
      issueTime: isGreek ? 'Ώρα Έκδοσης' : 'Issue Time',
      dueDate: isGreek ? 'Ημερομηνία Λήξης' : 'Due Date',
      period: isGreek ? 'Περίοδος Χρέωσης' : 'Billing Period',
      billTo: isGreek ? 'Στοιχεία Πελάτη' : 'Bill To',
      billFrom: isGreek ? 'Στοιχεία Προμηθευτή' : 'Bill From',
      description: isGreek ? 'Περιγραφή' : 'Description',
      quantity: isGreek ? 'Ποσότητα' : 'Quantity',
      unitPrice: isGreek ? 'Τιμή Μονάδας' : 'Unit Price',
      netAmount: isGreek ? 'Καθαρή Αξία' : 'Net Amount',
      amount: isGreek ? 'Ποσό' : 'Amount',
      subtotal: isGreek ? 'Υποσύνολο' : 'Subtotal',
      vat: isGreek ? 'Φ.Π.Α.' : 'VAT',
      total: isGreek ? 'Σύνολο' : 'Total',
      vatNumber: isGreek ? 'Α.Φ.Μ.' : 'VAT Number',
      taxOffice: isGreek ? 'Δ.Ο.Υ.' : 'Tax Office',
      address: isGreek ? 'Διεύθυνση' : 'Address',
      paymentTerms: isGreek ? 'Όροι Πληρωμής' : 'Payment Terms',
      notes: isGreek ? 'Σημειώσεις' : 'Notes',
      currency: 'EUR',
      originalInvoice: isGreek ? 'Αρχικό Τιμολόγιο' : 'Original Invoice',
      creditReason: isGreek ? 'Λόγος Πίστωσης' : 'Credit Reason',
      noVat: 'ΧΩΡΙΣ ΑΦΜ'
    };

    const invoiceTitle = invoice.type === 'credit_note' ? labels.creditNote : labels.invoice;
    
    // Parse invoice number for series and sequential number
    const [series, year, sequentialNumber] = invoice.invoiceNumber.split('-');
    
    // Format issue date and time
    const issueDateTime = new Date(invoice.issueDate);
    const formattedDate = this.formatDate(issueDateTime, invoice.language as 'el' | 'en');
    const formattedTime = issueDateTime.toLocaleTimeString(isGreek ? 'el-GR' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Format billing address
    const billingAddress = subscription.billingAddress as any;
    const customerAddress = billingAddress ? [
      billingAddress.street,
      `${billingAddress.postalCode} ${billingAddress.city}`,
      billingAddress.country || 'Greece'
    ].filter(Boolean).join('<br>') : '';
    
    // Determine customer VAT display
    const customerVatDisplay = subscription.vatNumber || labels.noVat;
    
    // Generate VAT breakdown by rate
    const vatBreakdown = this.generateVatBreakdown(items, parseFloat(invoice.vatRate), isGreek);

    return `
<!DOCTYPE html>
<html lang="${isGreek ? 'el' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${invoiceTitle} ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 10px;
    }
    
    .company-details {
      font-size: 11px;
      color: #666;
    }
    
    .invoice-meta {
      flex: 1;
      text-align: right;
    }
    
    .invoice-title {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    
    .invoice-details {
      font-size: 11px;
    }
    
    .invoice-details dt {
      font-weight: bold;
      display: inline-block;
      width: 120px;
    }
    
    .invoice-details dd {
      display: inline;
      margin-left: 0;
    }
    
    .customer-info {
      margin-bottom: 30px;
    }
    
    .customer-info h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #2563eb;
    }
    
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .invoice-table th {
      background-color: #f8f9fa;
      padding: 12px 8px;
      text-align: left;
      border: 1px solid #dee2e6;
      font-weight: bold;
      font-size: 11px;
    }
    
    .invoice-table td {
      padding: 10px 8px;
      border: 1px solid #dee2e6;
      font-size: 11px;
    }
    
    .invoice-table .amount {
      text-align: right;
    }
    
    .invoice-summary {
      margin-left: auto;
      width: 300px;
      margin-bottom: 30px;
    }
    
    .invoice-summary table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .invoice-summary td {
      padding: 8px;
      border: 1px solid #dee2e6;
    }
    
    .invoice-summary .total-row {
      background-color: #2563eb;
      color: white;
      font-weight: bold;
    }
    
    .vat-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 10px;
    }
    
    .payment-info {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }
    
    .payment-info h3 {
      margin: 0 0 10px 0;
      font-size: 12px;
      color: #2563eb;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
    
    .qr-code {
      float: right;
      margin-left: 20px;
    }
    
    .prorated {
      font-style: italic;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div class="company-info">
      ${organizationDetails.logoUrl ? `<img src="${organizationDetails.logoUrl}" alt="${organizationDetails.name}" class="company-logo">` : ''}
      <h2>${organizationDetails.name}</h2>
      <div class="company-details">
        ${labels.vatNumber}: ${organizationDetails.vatNumber}<br>
        ${labels.taxOffice}: ${organizationDetails.taxOffice}<br>
        ${organizationDetails.address.street}<br>
        ${organizationDetails.address.postalCode} ${organizationDetails.address.city}<br>
        ${organizationDetails.address.phone ? `Τηλ.: ${organizationDetails.address.phone}<br>` : ''}
        ${organizationDetails.address.email ? `Email: ${organizationDetails.address.email}<br>` : ''}
        ${organizationDetails.address.website ? `Web: ${organizationDetails.address.website}` : ''}
      </div>
    </div>
    
    <div class="invoice-meta">
      <div class="invoice-title">${invoiceTitle}</div>
      <dl class="invoice-details">
        <dt>${labels.series}:</dt>
        <dd>${series}</dd><br>
        
        <dt>${labels.invoiceNumber}:</dt>
        <dd>${sequentialNumber}/${year}</dd><br>
        
        <dt>${labels.issueDate}:</dt>
        <dd>${formattedDate}</dd><br>
        
        <dt>${labels.issueTime}:</dt>
        <dd>${formattedTime}</dd><br>
        
        <dt>${labels.currency}:</dt>
        <dd>EUR</dd><br>
        
        <dt>${labels.dueDate}:</dt>
        <dd>${this.formatDate(new Date(invoice.dueDate), invoice.language as 'el' | 'en')}</dd><br>
        
        <dt>${labels.period}:</dt>
        <dd>${this.formatDate(new Date(invoice.periodStart), invoice.language as 'el' | 'en')} - ${this.formatDate(new Date(invoice.periodEnd), invoice.language as 'el' | 'en')}</dd>
      </dl>
      
      ${invoice.mydataQrCode ? `
        <div class="qr-code">
          <img src="data:image/png;base64,${invoice.mydataQrCode}" alt="myDATA QR" style="width: 80px; height: 80px;">
        </div>
      ` : ''}
    </div>
  </div>

  <div class="billing-parties" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
    <div class="supplier-info">
      <h3>${labels.billFrom}</h3>
      <strong>${organizationDetails.name}</strong><br>
      ${labels.vatNumber}: ${organizationDetails.vatNumber}<br>
      ${labels.taxOffice}: ${organizationDetails.taxOffice}<br>
      ${organizationDetails.address.street}<br>
      ${organizationDetails.address.postalCode} ${organizationDetails.address.city}<br>
      ${organizationDetails.address.country || 'Ελλάδα'}<br>
      ${organizationDetails.address.phone ? `Τηλ.: ${organizationDetails.address.phone}<br>` : ''}
      ${organizationDetails.address.email ? `Email: ${organizationDetails.address.email}` : ''}
    </div>
    
    <div class="customer-info">
      <h3>${labels.billTo}</h3>
      <strong>${subscription.companyName}</strong><br>
      ${labels.vatNumber}: ${customerVatDisplay}<br>
      ${subscription.taxOffice ? `${labels.taxOffice}: ${subscription.taxOffice}<br>` : ''}
      ${customerAddress}
    </div>
  </div>

  ${invoice.type === 'credit_note' ? `
    <div class="credit-note-info" style="background-color: #fef3c7; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <strong>${labels.originalInvoice}:</strong> ${(invoice as any).originalInvoiceNumber || 'N/A'}<br>
      <strong>${labels.creditReason}:</strong> ${(invoice as any).creditReason || 'N/A'}
    </div>
  ` : ''}

  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width: 45%">${labels.description}</th>
        <th style="width: 15%">${labels.quantity}</th>
        <th style="width: 20%">${labels.unitPrice} (€)</th>
        <th style="width: 20%">${labels.netAmount} (€)</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any, index: number) => `
        <tr>
          <td>
            ${item.description}
            ${item.periodStart && item.periodEnd ? `<br><small>${this.formatDate(new Date(item.periodStart), invoice.language as 'el' | 'en')} - ${this.formatDate(new Date(item.periodEnd), invoice.language as 'el' | 'en')}</small>` : ''}
            ${item.isProrated ? `<br><span class="prorated">${isGreek ? 'Αναλογικό' : 'Prorated'}</span>` : ''}
          </td>
          <td>${this.formatNumber(item.quantity, invoice.language as 'el' | 'en')}</td>
          <td class="amount">${this.formatCurrency(item.unitPriceCents, invoice.language as 'el' | 'en').replace('€', '').trim()}</td>
          <td class="amount">${this.formatCurrency(item.subtotalCents, invoice.language as 'el' | 'en').replace('€', '').trim()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="invoice-summary">
    <table>
      <tr>
        <td><strong>${labels.subtotal} (${labels.netAmount})</strong></td>
        <td class="amount"><strong>${this.formatCurrency(invoice.subtotalCents, invoice.language as 'el' | 'en').replace('€', '')} €</strong></td>
      </tr>
      ${vatBreakdown}
      <tr class="total-row">
        <td><strong>${labels.total} (${isGreek ? 'Συμπ. Φ.Π.Α.' : 'Incl. VAT'})</strong></td>
        <td class="amount"><strong>${this.formatCurrency(invoice.totalCents, invoice.language as 'el' | 'en').replace('€', '')} €</strong></td>
      </tr>
    </table>
  </div>

  ${invoice.vatNote || invoice.vatTreatment === 'reverse_charge' ? `
    <div class="vat-info">
      <strong>${isGreek ? 'Σημείωση ΦΠΑ' : 'VAT Note'}:</strong> 
      ${invoice.vatTreatment === 'reverse_charge' ? 
        (isGreek ? 'Αντίστροφη Επιβάρυνση - Ο λήπτης οφείλει το ΦΠΑ' : 'Reverse Charge - VAT payable by recipient') : 
        invoice.vatNote
      }
    </div>
  ` : ''}

  ${this.isB2GTransaction(subscription) ? `
    <div class="b2g-info" style="background-color: #dbeafe; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
      <strong>${isGreek ? 'Ηλεκτρονική Τιμολόγηση Δημοσίου' : 'Public Sector E-Invoicing'}:</strong><br>
      ${isGreek ? 
        'Το παρόν τιμολόγιο διαβιβάστηκε ηλεκτρονικά σύμφωνα με το πρότυπο EN 16931.' :
        'This invoice was transmitted electronically according to EN 16931 standard.'
      }
    </div>
  ` : ''}

  ${invoice.notes ? `
    <div class="payment-info">
      <h3>${labels.notes}</h3>
      <p>${invoice.notes}</p>
    </div>
  ` : ''}

  <div class="payment-info">
    <h3>${labels.paymentTerms}</h3>
    <p>${isGreek ? 
      'Η πληρωμή θα πρέπει να πραγματοποιηθεί εντός 30 ημερών από την ημερομηνία έκδοσης του τιμολογίου.' : 
      'Payment is due within 30 days from the invoice date.'
    }</p>
  </div>

  <div class="footer">
    ${isGreek ? 
      'Αυτό το τιμολόγιο δημιουργήθηκε ηλεκτρονικά και διαβιβάστηκε στο myDATA σύμφωνα με την ελληνική νομοθεσία.' :
      'This invoice was generated electronically and transmitted to myDATA in compliance with Greek legislation.'
    }
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get invoice template based on language and type
   */
  getInvoiceTemplate(language: 'el' | 'en', type: 'invoice' | 'credit_note'): string {
    // This could be expanded to support multiple templates
    return 'default';
  }

  /**
   * Format currency for Greek locale (decimal comma)
   */
  formatCurrency(amountCents: number, language: 'el' | 'en' = 'el'): string {
    const amount = amountCents / 100;
    if (language === 'el') {
      // Greek format: 1.234,56 €
      return amount.toLocaleString('el-GR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + ' €';
    } else {
      // English format: €1,234.56
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    }
  }

  /**
   * Format number for Greek locale (decimal comma)
   */
  formatNumber(value: number, language: 'el' | 'en' = 'el'): string {
    return value.toLocaleString(language === 'el' ? 'el-GR' : 'en-US');
  }

  /**
   * Format date for Greek locale
   */
  formatDate(date: string | Date, language: 'el' | 'en' = 'el'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
  }

  /**
   * Generate VAT breakdown by rate
   */
  private generateVatBreakdown(items: any[], mainVatRate: number, isGreek: boolean): string {
    const vatLabel = isGreek ? 'Φ.Π.Α.' : 'VAT';
    const vatPercentage = Math.round(mainVatRate * 100);
    
    // For now, assuming single VAT rate - can be extended for multiple rates
    const totalNet = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    const vatAmount = Math.round(totalNet * mainVatRate);
    
    const formattedNet = isGreek ? 
      (totalNet / 100).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
      (totalNet / 100).toFixed(2);
    const formattedVat = isGreek ? 
      (vatAmount / 100).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
      (vatAmount / 100).toFixed(2);

    return `
      <tr>
        <td>${vatLabel} ${vatPercentage}%</td>
        <td class="amount">${formattedVat} €</td>
      </tr>
    `;
  }

  /**
   * Check if transaction is B2G (Business to Government)
   */
  private isB2GTransaction(subscription: any): boolean {
    // Check if customer VAT number indicates public sector
    const vatNumber = subscription.vatNumber;
    if (!vatNumber) return false;
    
    // Greek public sector VAT numbers often start with specific patterns
    // This would need to be enhanced with actual public sector VAT number patterns
    return vatNumber.startsWith('EL999') || vatNumber.startsWith('GR999');
  }
}

export const invoicePDFService = new InvoicePDFService();