/**
 * PayrollSync Embedded SDK
 * Client SDK for integrating embeddable payroll surfaces
 */

export interface PayrollSDKConfig {
  tenantId: string;
  token: string;
  surface: 'payroll_run' | 'exceptions_review' | 'filings_panel' | 'payments_cockpit';
  locale?: string;
  theme?: 'light' | 'dark';
  baseUrl?: string;
}

export interface PayrollSDKEvents {
  'payroll.run.opened': { runId: string; status: string };
  'payroll.run.validated': { runId: string; data: any };
  'payroll.run.finalized': { runId: string; data: any };
  'payroll.run.posted': { runId: string; journalId: string };
  'payroll.run.failed': { runId: string; error: string };
  'exceptions.loaded': { count: number };
  'exceptions.resolved': { exceptionId: string; action: string; employeeId: string; type: string };
  'exceptions.failed': { exceptionId?: string; error: string };
  'filings.loaded': { count: number };
  'filing.submitted': { filingId: string; type: string; records: number };
  'filing.failed': { filingId: string; error: string };
  'payments.loaded': { count: number };
  'payment.sent': { batchId: string; batchNumber: string; bank: string; amount: string; paymentCount: number };
  'payment.failed': { batchId: string; error: string };
}

export type PayrollEventHandler<K extends keyof PayrollSDKEvents> = (
  event: K,
  data: PayrollSDKEvents[K]
) => void;

export class PayrollSDK {
  private config: PayrollSDKConfig;
  private iframe: HTMLIFrameElement | null = null;
  private eventHandlers: Map<keyof PayrollSDKEvents, PayrollEventHandler<any>[]> = new Map();
  private messageListener: ((event: MessageEvent) => void) | null = null;

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

        this.iframe.src = `${this.config.baseUrl}/embed?${params.toString()}`;\n\n        // Setup message listener\n        this.messageListener = (event: MessageEvent) => {\n          // Verify origin for security\n          if (event.origin !== new URL(this.config.baseUrl!).origin) {\n            return;\n          }\n\n          if (event.data.type === 'payroll_event') {\n            this.handleEvent(event.data.eventName, event.data.data);\n          } else if (event.data.type === 'iframe_ready') {\n            resolve();\n          } else if (event.data.type === 'iframe_error') {\n            reject(new Error(event.data.error));\n          }\n        };\n\n        window.addEventListener('message', this.messageListener);\n\n        // Handle iframe load\n        this.iframe.onload = () => {\n          // Send initial config to iframe\n          this.postMessage({\n            type: 'init_config',\n            config: this.config,\n          });\n        };\n\n        this.iframe.onerror = () => {\n          reject(new Error('Failed to load embedded surface'));\n        };\n\n        // Add iframe to container\n        containerElement.appendChild(this.iframe);\n\n        // Timeout after 10 seconds\n        setTimeout(() => {\n          reject(new Error('Initialization timeout'));\n        }, 10000);\n      } catch (error) {\n        reject(error);\n      }\n    });\n  }\n\n  /**\n   * Add event listener\n   */\n  on<K extends keyof PayrollSDKEvents>(\n    eventName: K,\n    handler: PayrollEventHandler<K>\n  ): void {\n    if (!this.eventHandlers.has(eventName)) {\n      this.eventHandlers.set(eventName, []);\n    }\n    this.eventHandlers.get(eventName)!.push(handler);\n  }\n\n  /**\n   * Remove event listener\n   */\n  off<K extends keyof PayrollSDKEvents>(\n    eventName: K,\n    handler: PayrollEventHandler<K>\n  ): void {\n    const handlers = this.eventHandlers.get(eventName);\n    if (handlers) {\n      const index = handlers.indexOf(handler);\n      if (index !== -1) {\n        handlers.splice(index, 1);\n      }\n    }\n  }\n\n  /**\n   * Send action to embedded surface\n   */\n  sendAction(action: string, data?: any): void {\n    if (!this.iframe) {\n      console.warn('SDK not initialized');\n      return;\n    }\n\n    this.postMessage({\n      type: 'action',\n      action,\n      data,\n    });\n  }\n\n  /**\n   * Update configuration\n   */\n  updateConfig(newConfig: Partial<PayrollSDKConfig>): void {\n    this.config = { ...this.config, ...newConfig };\n    \n    if (this.iframe) {\n      this.postMessage({\n        type: 'update_config',\n        config: this.config,\n      });\n    }\n  }\n\n  /**\n   * Resize iframe\n   */\n  resize(width?: string, height?: string): void {\n    if (this.iframe) {\n      if (width) this.iframe.style.width = width;\n      if (height) this.iframe.style.height = height;\n    }\n  }\n\n  /**\n   * Destroy the SDK instance\n   */\n  destroy(): void {\n    if (this.messageListener) {\n      window.removeEventListener('message', this.messageListener);\n      this.messageListener = null;\n    }\n\n    if (this.iframe) {\n      this.iframe.remove();\n      this.iframe = null;\n    }\n\n    this.eventHandlers.clear();\n  }\n\n  /**\n   * Handle events from iframe\n   */\n  private handleEvent(eventName: keyof PayrollSDKEvents, data: any): void {\n    const handlers = this.eventHandlers.get(eventName);\n    if (handlers) {\n      handlers.forEach(handler => {\n        try {\n          handler(eventName, data);\n        } catch (error) {\n          console.error(`Error in event handler for ${eventName}:`, error);\n        }\n      });\n    }\n  }\n\n  /**\n   * Post message to iframe\n   */\n  private postMessage(message: any): void {\n    if (this.iframe && this.iframe.contentWindow) {\n      this.iframe.contentWindow.postMessage(message, this.config.baseUrl!);\n    }\n  }\n}\n\n/**\n * Utility function to initialize SDK with default settings\n */\nexport function initPayrollSDK(\n  config: PayrollSDKConfig,\n  containerElement: HTMLElement\n): Promise<PayrollSDK> {\n  const sdk = new PayrollSDK(config);\n  return sdk.init(containerElement).then(() => sdk);\n}\n\n/**\n * Global SDK instance for window-based access\n */\ndeclare global {\n  interface Window {\n    PayrollSDK: typeof PayrollSDK;\n    initPayrollSDK: typeof initPayrollSDK;\n  }\n}\n\n// Expose to global scope for script tag usage\nif (typeof window !== 'undefined') {\n  window.PayrollSDK = PayrollSDK;\n  window.initPayrollSDK = initPayrollSDK;\n}