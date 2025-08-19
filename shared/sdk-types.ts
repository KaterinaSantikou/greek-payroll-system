/**
 * TypeScript SDK - ERP Integration Types
 * Client-facing interfaces for journal building and ERP operations
 */

// =============================================================================
// JOURNAL BUILDING
// =============================================================================

export interface BuildJournalRequest {
  entity_id: string;
  run_id: string;
  split_by?: ("property_id" | "department" | "cost_center")[];
  rounding?: "bankers" | "round_half_up";
  collapse_zero_lines?: boolean;
}

export interface JournalLine {
  line_id: string;
  account_code: string;
  debit: number;   // >= 0
  credit: number;  // >= 0
  description?: string;
  dimensions?: Record<string, string>;
}

export interface Journal {
  journal_id: string;
  period: string;
  currency: "EUR";
  status: "draft" | "posted" | "reversed";
  lines: JournalLine[];
  source: { type: "payroll"; run_id: string };
}

// =============================================================================
// CONNECTOR OPERATIONS
// =============================================================================

export interface ConnectorAuthRequest {
  partner_id: string;
  connector_type: "xero" | "quickbooks";
}

export interface ConnectorAuthResponse {
  auth_url: string;
  state: string;
  expires_in: number;
}

export interface ConnectorStatus {
  connector: string;
  partner_id: string;
  connected: boolean;
  status: "not_connected" | "connected" | "invalid_token";
  tenant_id?: string;
  company_id?: string;
  expires_at?: string;
  token_expires_soon: boolean;
}

export interface PostJournalRequest {
  partner_id: string;
  journal_id: string;
}

export interface PostJournalResponse {
  success: boolean;
  connector: string;
  journal_id: string;
  external_journal_id: string;
  partner_id: string;
  posted_at: string;
}

// =============================================================================
// GUIDED SETUP
// =============================================================================

export interface SetupStep {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  data?: any;
}

export interface SetupConfig {
  auto_post: boolean;
  rounding: "bankers" | "round_half_up";
  currency: "EUR";
  draft_only: boolean;
}

export interface SetupMappings {
  accounts: Record<string, string>; // earnings_code -> account_code
  dimensions: Record<string, string>; // property_id -> tracking_category_option
}

export interface SetupStatus {
  setup_id: string;
  partner_id: string;
  connector_type: "xero" | "quickbooks";
  current_step: string;
  steps: SetupStep[];
  config: SetupConfig;
  mappings: SetupMappings;
  progress_percentage: number;
  updated_at: string;
}

export interface ChartOfAccount {
  code: string;
  name: string;
  type: "asset" | "liability" | "expense" | "revenue" | "equity";
  description?: string;
}

export interface DimensionCategory {
  id: string;
  name: string;
  options: { id: string; name: string }[];
}

export interface MappingTemplate {
  earnings: Array<{
    code: string;
    name: string;
    type: string;
    required: boolean;
  }>;
  employer_contributions: Array<{
    code: string;
    name: string;
    type: string;
    required: boolean;
  }>;
  liabilities: Array<{
    code: string;
    name: string;
    type: string;
    required: boolean;
  }>;
  clearing: Array<{
    code: string;
    name: string;
    type: string;
    required: boolean;
  }>;
}

// =============================================================================
// RECONCILIATION
// =============================================================================

export interface ReconciliationEntry {
  category: string;
  description: string;
  payroll_amount: number;
  journal_amount: number;
  delta: number;
  is_reconciled: boolean;
}

export interface ReconciliationReport {
  total_payroll: number;
  total_journal: number;
  overall_delta: number;
  is_fully_reconciled: boolean;
  entries: ReconciliationEntry[];
  warnings: string[];
  currency: string;
  rounding_method: "bankers" | "round_half_up";
  generated_at: string;
}

export interface PayrollSummary {
  regular_wages: number;
  overtime: number;
  gross_pay: number;
  efka_employee: number;
  efka_employer: number;
  tax_withholding: number;
  net_pay: number;
  total_deductions: number;
  total_employer_costs: number;
}

// =============================================================================
// ROUNDING CONFIGURATION
// =============================================================================

export interface RoundingConfig {
  method: "bankers" | "round_half_up";
  precision: number;
  enforce_balance: boolean;
}

export interface RoundingExample {
  input: number;
  output: number;
}

export interface RoundingMethod {
  id: "bankers" | "round_half_up";
  name: string;
  description: string;
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

export interface APIError {
  error: string;
  detail: string;
  hint?: string;
}

// =============================================================================
// WEBHOOK EVENTS
// =============================================================================

export interface WebhookEvent {
  id: string;
  type: "payroll.run.finalized" | "gl.journal.draft.created" | "gl.journal.posted" | "gl.journal.reversed" | "connector.token.refreshed";
  partner_id: string;
  data: Record<string, any>;
  created_at: string;
}

// =============================================================================
// CLIENT SDK CLASS (Interface)
// =============================================================================

export interface PayrollSyncSDK {
  // Journal Operations
  buildJournal(request: BuildJournalRequest): Promise<Journal>;
  getJournal(journalId: string): Promise<Journal>;
  postJournal(journalId: string, externalSystem?: string): Promise<PostJournalResponse>;
  reverseJournal(journalId: string): Promise<Journal>;

  // Connector Management
  initiateAuth(request: ConnectorAuthRequest): Promise<ConnectorAuthResponse>;
  getConnectorStatus(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<ConnectorStatus>;
  disconnectConnector(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<{ disconnected: boolean }>;
  postJournalToConnector(connectorType: "xero" | "quickbooks", request: PostJournalRequest): Promise<PostJournalResponse>;

  // Guided Setup
  initializeSetup(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<SetupStatus>;
  getSetupStatus(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<SetupStatus>;
  fetchChartOfAccounts(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<ChartOfAccount[]>;
  saveMappings(partnerId: string, connectorType: "xero" | "quickbooks", mappings: SetupMappings): Promise<{ success: boolean }>;
  validateSetup(partnerId: string, connectorType: "xero" | "quickbooks"): Promise<{ test_journal: Journal; validation: any }>;
  completeSetup(partnerId: string, connectorType: "xero" | "quickbooks", config: Partial<SetupConfig>): Promise<{ setup_complete: boolean }>;

  // Reconciliation
  generateReconciliation(payrollSummary: PayrollSummary, journalId: string): Promise<ReconciliationReport>;
  applyRounding(lines: JournalLine[], config: RoundingConfig): Promise<{ rounded_lines: JournalLine[]; totals: any }>;
  validateCurrency(journalCurrency: string): Promise<{ is_valid: boolean; warning?: string }>;
}