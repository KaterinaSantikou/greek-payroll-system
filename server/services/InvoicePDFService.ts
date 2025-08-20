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
      issueDate: isGreek ? 'Ημερομηνία Έκδοσης' : 'Issue Date',
      dueDate: isGreek ? 'Ημερομηνία Λήξης' : 'Due Date',
      period: isGreek ? 'Περίοδος Χρέωσης' : 'Billing Period',
      billTo: isGreek ? 'Στοιχεία Πελάτη' : 'Bill To',
      description: isGreek ? 'Περιγραφή' : 'Description',
      quantity: isGreek ? 'Ποσότητα' : 'Quantity',
      unitPrice: isGreek ? 'Τιμή Μονάδας' : 'Unit Price',
      amount: isGreek ? 'Ποσό' : 'Amount',
      subtotal: isGreek ? 'Υποσύνολο' : 'Subtotal',
      vat: isGreek ? 'ΦΠΑ' : 'VAT',
      total: isGreek ? 'Σύνολο' : 'Total',
      vatNumber: isGreek ? 'Α.Φ.Μ.' : 'VAT Number',
      taxOffice: isGreek ? 'Δ.Ο.Υ.' : 'Tax Office',
      address: isGreek ? 'Διεύθυνση' : 'Address',
      paymentTerms: isGreek ? 'Όροι Πληρωμής' : 'Payment Terms',
      notes: isGreek ? 'Σημειώσεις' : 'Notes',
      currency: 'EUR'
    };

    const invoiceTitle = invoice.type === 'credit_note' ? labels.creditNote : labels.invoice;
    
    // Format billing address
    const billingAddress = subscription.billingAddress as any;
    const customerAddress = billingAddress ? [
      billingAddress.street,
      `${billingAddress.postalCode} ${billingAddress.city}`,
      billingAddress.country
    ].filter(Boolean).join('<br>') : '';

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
        <dt>${labels.invoiceNumber}:</dt>
        <dd>${invoice.invoiceNumber}</dd><br>
        
        <dt>${labels.issueDate}:</dt>
        <dd>${new Date(invoice.issueDate).toLocaleDateString(isGreek ? 'el-GR' : 'en-US')}</dd><br>
        
        <dt>${labels.dueDate}:</dt>
        <dd>${new Date(invoice.dueDate).toLocaleDateString(isGreek ? 'el-GR' : 'en-US')}</dd><br>
        
        <dt>${labels.period}:</dt>
        <dd>${new Date(invoice.periodStart).toLocaleDateString(isGreek ? 'el-GR' : 'en-US')} - ${new Date(invoice.periodEnd).toLocaleDateString(isGreek ? 'el-GR' : 'en-US')}</dd>
      </dl>
      
      ${invoice.mydataQrCode ? `
        <div class="qr-code">
          <img src="data:image/png;base64,${invoice.mydataQrCode}" alt="myDATA QR" style="width: 80px; height: 80px;">
        </div>
      ` : ''}
    </div>
  </div>

  <div class="customer-info">
    <h3>${labels.billTo}</h3>
    <strong>${subscription.companyName}</strong><br>
    ${subscription.vatNumber ? `${labels.vatNumber}: ${subscription.vatNumber}<br>` : ''}
    ${subscription.taxOffice ? `${labels.taxOffice}: ${subscription.taxOffice}<br>` : ''}
    ${customerAddress}
  </div>

  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width: 50%">${labels.description}</th>
        <th style="width: 15%">${labels.quantity}</th>
        <th style="width: 15%">${labels.unitPrice} (€)</th>
        <th style="width: 20%">${labels.amount} (€)</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item: any, index: number) => `
        <tr>
          <td>
            ${item.description}
            ${item.periodStart && item.periodEnd ? `<br><small>${new Date(item.periodStart).toLocaleDateString(isGreek ? 'el-GR' : 'en-US')} - ${new Date(item.periodEnd).toLocaleDateString(isGreek ? 'el-GR' : 'en-US')}</small>` : ''}
            ${item.isProrated ? `<br><span class="prorated">${isGreek ? 'Αναλογικό' : 'Prorated'}</span>` : ''}
          </td>
          <td>${item.quantity}</td>
          <td class="amount">${(item.unitPriceCents / 100).toFixed(2)}</td>
          <td class="amount">${(item.subtotalCents / 100).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="invoice-summary">
    <table>
      <tr>
        <td><strong>${labels.subtotal}</strong></td>
        <td class="amount"><strong>€${(invoice.subtotalCents / 100).toFixed(2)}</strong></td>
      </tr>
      <tr>
        <td>${labels.vat} (${(parseFloat(invoice.vatRate) * 100).toFixed(0)}%)</td>
        <td class="amount">€${(invoice.vatAmountCents / 100).toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td><strong>${labels.total}</strong></td>
        <td class="amount"><strong>€${(invoice.totalCents / 100).toFixed(2)}</strong></td>
      </tr>
    </table>
  </div>

  ${invoice.vatNote ? `
    <div class="vat-info">
      <strong>${isGreek ? 'Σημείωση ΦΠΑ' : 'VAT Note'}:</strong> ${invoice.vatNote}
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
   * Format currency for Greek locale
   */
  formatCurrency(amountCents: number, language: 'el' | 'en' = 'el'): string {
    const amount = amountCents / 100;
    return new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  /**
   * Format date for Greek locale
   */
  formatDate(date: string | Date, language: 'el' | 'en' = 'el'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US');
  }
}

export const invoicePDFService = new InvoicePDFService();