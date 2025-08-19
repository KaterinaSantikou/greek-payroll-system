/**
 * PayrollSync SDK Client Implementation
 * TypeScript client for ERP integration APIs
 */

import type {
  BuildJournalRequest,
  Journal,
  ConnectorAuthRequest,
  ConnectorAuthResponse,
  ConnectorStatus,
  PostJournalRequest,
  PostJournalResponse,
  SetupStatus,
  SetupMappings,
  SetupConfig,
  ChartOfAccount,
  ReconciliationReport,
  PayrollSummary,
  RoundingConfig,
  JournalLine,
  PayrollSyncSDK,
} from '@shared/sdk-types';

class PayrollSyncClient implements PayrollSyncSDK {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/v1', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: 'HTTP_ERROR', 
        detail: `${response.status} ${response.statusText}` 
      }));
      throw new Error(`API Error: ${error.error} - ${error.detail}`);
    }

    return response.json();
  }

  // =============================================================================
  // JOURNAL OPERATIONS
  // =============================================================================

  async buildJournal(request: BuildJournalRequest): Promise<Journal> {
    return this.request<Journal>('/gl/build-journal', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getJournal(journalId: string): Promise<Journal> {
    return this.request<Journal>(`/gl/journal/${journalId}`);
  }

  async postJournal(journalId: string, externalSystem?: string): Promise<PostJournalResponse> {
    return this.request<PostJournalResponse>(`/gl/journal/${journalId}/post`, {
      method: 'POST',
      body: JSON.stringify({ external_system: externalSystem }),
    });
  }

  async reverseJournal(journalId: string): Promise<Journal> {
    return this.request<Journal>(`/gl/journal/${journalId}/reverse`, {
      method: 'POST',
    });
  }

  // =============================================================================
  // CONNECTOR MANAGEMENT
  // =============================================================================

  async initiateAuth(request: ConnectorAuthRequest): Promise<ConnectorAuthResponse> {
    const { partner_id, connector_type } = request;
    return this.request<ConnectorAuthResponse>(
      `/connectors/${connector_type}/auth?partner_id=${partner_id}`
    );
  }

  async getConnectorStatus(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<ConnectorStatus> {
    return this.request<ConnectorStatus>(
      `/connectors/${connectorType}/status?partner_id=${partnerId}`
    );
  }

  async disconnectConnector(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<{ disconnected: boolean }> {
    return this.request<{ disconnected: boolean }>(
      `/connectors/${connectorType}?partner_id=${partnerId}`,
      { method: 'DELETE' }
    );
  }

  async postJournalToConnector(connectorType: "xero" | "quickbooks", request: PostJournalRequest): Promise<PostJournalResponse> {
    return this.request<PostJournalResponse>(`/connectors/${connectorType}/post-journal`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // =============================================================================
  // GUIDED SETUP
  // =============================================================================

  async initializeSetup(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<SetupStatus> {
    return this.request<SetupStatus>('/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({ partner_id: partnerId, connector_type: connectorType }),
    });
  }

  async getSetupStatus(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<SetupStatus> {
    return this.request<SetupStatus>(
      `/setup/status?partner_id=${partnerId}&connector_type=${connectorType}`
    );
  }

  async fetchChartOfAccounts(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<ChartOfAccount[]> {
    const response = await this.request<{ data: { chart_of_accounts: ChartOfAccount[] } }>(
      `/setup/fetch-data?partner_id=${partnerId}&connector_type=${connectorType}`
    );
    return response.data.chart_of_accounts;
  }

  async saveMappings(partnerId: string, connectorType: "xero" | "quickbooks", mappings: SetupMappings): Promise<{ success: boolean }> {
    const response = await this.request<{ message: string }>('/setup/mapping', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: partnerId,
        connector_type: connectorType,
        account_mappings: mappings.accounts,
        dimension_mappings: mappings.dimensions,
      }),
    });
    return { success: !!response.message };
  }

  async validateSetup(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<{ test_journal: Journal; validation: any }> {
    return this.request<{ test_journal: Journal; validation: any }>('/setup/validate', {
      method: 'POST',
      body: JSON.stringify({ partner_id: partnerId, connector_type: connectorType }),
    });
  }

  async completeSetup(partnerId: string, connectorType: "xero" | "quickbooks", config: Partial<SetupConfig>): Promise<{ setup_complete: boolean }> {
    return this.request<{ setup_complete: boolean }>('/setup/go-live', {
      method: 'POST',
      body: JSON.stringify({
        partner_id: partnerId,
        connector_type: connectorType,
        ...config,
      }),
    });
  }

  // =============================================================================
  // RECONCILIATION
  // =============================================================================

  async generateReconciliation(payrollSummary: PayrollSummary, journalId: string): Promise<ReconciliationReport> {
    const response = await this.request<{ reconciliation: ReconciliationReport }>('/reconciliation/generate', {
      method: 'POST',
      body: JSON.stringify({
        payroll_summary: payrollSummary,
        journal_id: journalId,
      }),
    });
    return response.reconciliation;
  }

  async applyRounding(lines: JournalLine[], config: RoundingConfig): Promise<{ rounded_lines: JournalLine[]; totals: any }> {
    return this.request<{ rounded_lines: JournalLine[]; totals: any }>('/reconciliation/apply-rounding', {
      method: 'POST',
      body: JSON.stringify({
        lines,
        rounding_method: config.method,
        precision: config.precision,
        enforce_balance: config.enforce_balance,
      }),
    });
  }

  async validateCurrency(journalCurrency: string): Promise<{ is_valid: boolean; warning?: string }> {
    return this.request<{ is_valid: boolean; warning?: string }>('/reconciliation/validate-currency', {
      method: 'POST',
      body: JSON.stringify({ journal_currency: journalCurrency }),
    });
  }
}

// Export singleton instance
export const payrollSync = new PayrollSyncClient();

// Export class for custom instances
export { PayrollSyncClient };
export default payrollSync;