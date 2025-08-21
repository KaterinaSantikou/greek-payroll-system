/**
 * Web Component wrapper for PayrollSync embedded surfaces
 * Usage: <payroll-surface surface="payroll_run" token="..." tenant-id="..."></payroll-surface>
 */

import { PayrollSDK, type PayrollSDKConfig } from '@/lib/payrollSDK';

class PayrollSurfaceElement extends HTMLElement {
  private sdk: PayrollSDK | null = null;
  private container: HTMLDivElement | null = null;

  static get observedAttributes() {
    return [
      'surface',
      'token', 
      'tenant-id',
      'locale',
      'theme',
      'base-url',
      'run-id'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.initializeSDK();
  }

  disconnectedCallback() {
    if (this.sdk) {
      this.sdk.destroy();
      this.sdk = null;
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      if (this.sdk) {
        this.updateSDKConfig();
      }
    }
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-height: 400px;
        }
        .container {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #f3f4f6;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 12px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .error {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 20px;
        }
      </style>
      <div class="container">
        <div class="loading">
          <div class="loading-spinner"></div>
          <span>Loading PayrollSync...</span>
        </div>
      </div>
    `;

    this.container = this.shadowRoot.querySelector('.container') as HTMLDivElement;
  }

  private async initializeSDK() {
    if (!this.container) return;

    try {
      const config = this.getSDKConfig();
      
      if (!config.surface || !config.token || !config.tenantId) {
        this.showError('Missing required attributes: surface, token, or tenant-id');
        return;
      }

      this.sdk = new PayrollSDK(config);

      // Setup event listeners for common events
      this.setupEventListeners();

      await this.sdk.init(this.container);
      
      // Fire custom event when initialized
      this.dispatchEvent(new CustomEvent('payroll-initialized', {
        detail: { surface: config.surface },
        bubbles: true
      }));
    } catch (error) {
      console.error('Failed to initialize PayrollSDK:', error);
      this.showError(
        error instanceof Error 
          ? error.message 
          : 'Failed to initialize embedded payroll surface'
      );
    }
  }

  private getSDKConfig(): PayrollSDKConfig {
    return {
      surface: this.getAttribute('surface') as any,
      token: this.getAttribute('token') || '',
      tenantId: this.getAttribute('tenant-id') || '',
      locale: this.getAttribute('locale') || 'en',
      theme: this.getAttribute('theme') as 'light' | 'dark' || 'light',
      baseUrl: this.getAttribute('base-url') || window.location.origin,
    };
  }

  private updateSDKConfig() {
    if (this.sdk) {
      const newConfig = this.getSDKConfig();
      this.sdk.updateConfig(newConfig);
    }
  }

  private setupEventListeners() {
    if (!this.sdk) return;

    // Forward all SDK events as custom events
    const eventTypes = [
      'payroll.run.opened',
      'payroll.run.validated', 
      'payroll.run.finalized',
      'payroll.run.posted',
      'payroll.run.failed',
      'exceptions.loaded',
      'exceptions.resolved',
      'exceptions.failed',
      'filings.loaded',
      'filing.submitted',
      'filing.failed',
      'payments.loaded',
      'payment.sent',
      'payment.failed'
    ] as const;

    eventTypes.forEach(eventType => {
      this.sdk!.on(eventType as any, (event, data) => {
        this.dispatchEvent(new CustomEvent(eventType.replace('.', '-'), {
          detail: { event, data },
          bubbles: true
        }));
      });
    });
  }

  private showError(message: string) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="error">
        <div>
          <strong>Error:</strong> ${message}
        </div>
      </div>
    `;
  }

  // Public methods for external control
  public sendAction(action: string, data?: any) {
    if (this.sdk) {
      this.sdk.sendAction(action, data);
    }
  }

  public resize(width?: string, height?: string) {
    if (this.sdk) {
      this.sdk.resize(width, height);
    }
  }

  public getSDKInstance(): PayrollSDK | null {
    return this.sdk;
  }
}

// Define the custom element
if (!customElements.get('payroll-surface')) {
  customElements.define('payroll-surface', PayrollSurfaceElement);
}

// TypeScript declaration for better IDE support
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'payroll-surface': {
        surface: 'payroll_run' | 'exceptions_review' | 'filings_panel' | 'payments_cockpit';
        token: string;
        'tenant-id': string;
        locale?: string;
        theme?: 'light' | 'dark';
        'base-url'?: string;
        'run-id'?: string;
        onPayrollInitialized?: (event: CustomEvent) => void;
        onPayrollRunOpened?: (event: CustomEvent) => void;
        onPayrollRunValidated?: (event: CustomEvent) => void;
        onPayrollRunFinalized?: (event: CustomEvent) => void;
        onPayrollRunPosted?: (event: CustomEvent) => void;
        onPayrollRunFailed?: (event: CustomEvent) => void;
        onExceptionsLoaded?: (event: CustomEvent) => void;
        onExceptionsResolved?: (event: CustomEvent) => void;
        onExceptionsFailed?: (event: CustomEvent) => void;
        onFilingsLoaded?: (event: CustomEvent) => void;
        onFilingSubmitted?: (event: CustomEvent) => void;
        onFilingFailed?: (event: CustomEvent) => void;
        onPaymentsLoaded?: (event: CustomEvent) => void;
        onPaymentSent?: (event: CustomEvent) => void;
        onPaymentFailed?: (event: CustomEvent) => void;
      };
    }
  }
}

export { PayrollSurfaceElement };