/**
 * PayrollSync SDK - Client library for embedded payroll surfaces
 * Provides a JavaScript interface for integrating PayrollSync features into any web application
 */

// Define payroll surface types
export type PayrollSurface = 
  | 'payroll_run' 
  | 'exceptions_review' 
  | 'filings_panel' 
  | 'payments_cockpit';

// Event types and their data
export interface PayrollSDKEvents {
  'payroll.run.opened': { runId: string; status: string };
  'payroll.run.validated': { runId: string; validationResults: any };
  'payroll.run.finalized': { runId: string; timestamp: string };
  'payroll.run.posted': { runId: string; postingResults: any };
  'payroll.run.failed': { runId: string; error: string };
  'exceptions.loaded': { count: number; exceptions: any[] };
  'exceptions.resolved': { exceptionId: string; resolution: any };
  'exceptions.failed': { exceptionId: string; error: string };
  'filings.loaded': { filings: any[] };
  'filing.submitted': { filingId: string; submissionResult: any };
  'filing.failed': { filingId: string; error: string };
  'payments.loaded': { payments: any[] };
  'payment.sent': { paymentId: string; result: any };
  'payment.failed': { paymentId: string; error: string };
}

// Event handler type
export type PayrollEventHandler<K extends keyof PayrollSDKEvents> = (
  eventName: K,
  data: PayrollSDKEvents[K]
) => void;

// SDK Configuration
export interface PayrollSDKConfig {
  surface: PayrollSurface;
  token: string;
  tenantId: string;
  locale?: 'en' | 'el';
  theme?: 'light' | 'dark';
  baseUrl?: string;
  runId?: string;
}

export class PayrollSDK {
  private config: PayrollSDKConfig;
  private iframe: HTMLIFrameElement | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private eventHandlers = new Map<keyof PayrollSDKEvents, PayrollEventHandler<any>[]>();

  constructor(config: PayrollSDKConfig) {
    this.config = {
      baseUrl: window.location.origin,
      locale: 'en',
      theme: 'light',
      ...config,
    };
  }

  /**
   * Initialize the embedded surface
   */
  init(containerElement: HTMLElement, additionalConfig?: Partial<PayrollSDKConfig>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Merge additional config
        if (additionalConfig) {
          this.config = { ...this.config, ...additionalConfig };
        }

        // Create iframe
        this.iframe = document.createElement('iframe');
        this.iframe.style.width = '100%';
        this.iframe.style.height = '600px';
        this.iframe.style.border = 'none';
        this.iframe.style.borderRadius = '8px';
        
        // Set iframe source with config parameters
        const params = new URLSearchParams({
          surface: this.config.surface,
          token: this.config.token,
          tenantId: this.config.tenantId,
          locale: this.config.locale || 'en',
          theme: this.config.theme || 'light',
          embedded: 'true',
        });

        this.iframe.src = `${this.config.baseUrl}/embed?${params.toString()}`;

        // Setup message listener
        this.messageListener = (event: MessageEvent) => {
          // Verify origin for security
          if (event.origin !== new URL(this.config.baseUrl!).origin) {
            return;
          }

          if (event.data.type === 'payroll_event') {
            this.handleEvent(event.data.eventName, event.data.data);
          } else if (event.data.type === 'iframe_ready') {
            resolve();
          } else if (event.data.type === 'iframe_error') {
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener('message', this.messageListener);

        // Handle iframe load
        this.iframe.onload = () => {
          // Send initial config to iframe
          this.postMessage({
            type: 'init_config',
            config: this.config,
          });
        };

        this.iframe.onerror = () => {
          reject(new Error('Failed to load embedded surface'));
        };

        // Add iframe to container
        containerElement.appendChild(this.iframe);

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Initialization timeout'));
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add event listener
   */
  on<K extends keyof PayrollSDKEvents>(
    eventName: K,
    handler: PayrollEventHandler<K>
  ): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof PayrollSDKEvents>(
    eventName: K,
    handler: PayrollEventHandler<K>
  ): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming events from iframe
   */
  private handleEvent<K extends keyof PayrollSDKEvents>(
    eventName: K,
    data: PayrollSDKEvents[K]
  ): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.forEach(handler => handler(eventName, data));
    }
  }

  /**
   * Send message to iframe
   */
  private postMessage(message: any): void {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage(message, this.config.baseUrl!);
    }
  }

  /**
   * Send action to embedded surface
   */
  sendAction(action: string, data?: any): void {
    this.postMessage({
      type: 'sdk_action',
      action,
      data,
    });
  }

  /**
   * Update SDK configuration
   */
  updateConfig(newConfig: Partial<PayrollSDKConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.postMessage({
      type: 'config_update',
      config: this.config,
    });
  }

  /**
   * Resize the iframe
   */
  resize(width?: string, height?: string): void {
    if (this.iframe) {
      if (width) this.iframe.style.width = width;
      if (height) this.iframe.style.height = height;
    }
  }

  /**
   * Destroy the SDK instance
   */
  destroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;
    }
    
    this.eventHandlers.clear();
  }
}