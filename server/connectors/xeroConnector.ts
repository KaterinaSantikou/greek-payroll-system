/**
 * Xero GL Connector for Embedded Payroll API
 * Implements Xero OAuth2 integration for journal posting
 */

export interface XeroConnection {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface XeroJournalEntry {
  reference: string;
  date: string;
  description: string;
  lines: XeroJournalLine[];
}

export interface XeroJournalLine {
  accountCode: string;
  description: string;
  grossAmount: number;
}

export class XeroConnector {
  private static readonly XERO_API_BASE = 'https://api.xero.com/api.xro/2.0';
  private static readonly CLIENT_ID = process.env.XERO_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;

  /**
   * Initialize OAuth2 flow for Xero connection
   */
  static getAuthorizationUrl(redirectUri: string, state: string): string {
    const scopes = 'accounting.transactions accounting.contacts accounting.settings';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    });

    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    redirectUri: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.CLIENT_ID!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Xero token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Refresh expired access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Xero token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get Xero tenants for authenticated user
   */
  static async getTenants(accessToken: string): Promise<Array<{
    tenantId: string;
    tenantName: string;
    tenantType: string;
  }>> {
    const response = await fetch('https://api.xero.com/connections', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get Xero tenants: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Create manual journal entry in Xero
   */
  static async createJournalEntry(
    connection: XeroConnection,
    journalEntry: XeroJournalEntry
  ): Promise<{ journalId: string }> {
    // Refresh token if needed
    if (connection.expiresAt <= new Date()) {
      const tokens = await this.refreshAccessToken(connection.refreshToken);
      connection.accessToken = tokens.access_token;
      connection.refreshToken = tokens.refresh_token;
      connection.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    }

    const xeroPayload = {
      ManualJournals: [{
        Narration: journalEntry.description,
        Reference: journalEntry.reference,
        Date: journalEntry.date,
        JournalLines: journalEntry.lines.map(line => ({
          AccountCode: line.accountCode,
          Description: line.description,
          LineAmount: Math.abs(line.grossAmount),
          AccountType: line.grossAmount >= 0 ? 'DEBIT' : 'CREDIT',
        })),
      }],
    };

    const response = await fetch(`${this.XERO_API_BASE}/ManualJournals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Xero-tenant-id': connection.tenantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(xeroPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Xero journal creation failed: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    return {
      journalId: result.ManualJournals[0]?.ManualJournalID,
    };
  }

  /**
   * Get chart of accounts from Xero
   */
  static async getChartOfAccounts(connection: XeroConnection): Promise<Array<{
    accountCode: string;
    accountName: string;
    accountType: string;
  }>> {
    const response = await fetch(`${this.XERO_API_BASE}/Accounts`, {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Xero-tenant-id': connection.tenantId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get Xero accounts: ${response.statusText}`);
    }

    const result = await response.json();
    return result.Accounts.map((account: any) => ({
      accountCode: account.Code,
      accountName: account.Name,
      accountType: account.Type,
    }));
  }

  /**
   * Validate connection by testing API access
   */
  static async validateConnection(connection: XeroConnection): Promise<{
    isValid: boolean;
    organisationName?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.XERO_API_BASE}/Organisation`, {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Xero-tenant-id': connection.tenantId,
        },
      });

      if (response.ok) {
        const result = await response.json();
        return {
          isValid: true,
          organisationName: result.Organisations[0]?.Name,
        };
      } else {
        return {
          isValid: false,
          error: `API Error: ${response.status} ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}