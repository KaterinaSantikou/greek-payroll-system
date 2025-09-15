/**
 * QuickBooks Online GL Connector for Embedded Payroll API
 * Implements QuickBooks OAuth2 integration for journal posting
 */

export interface QBOConnection {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface QBOJournalEntry {
  reference: string;
  txnDate: string;
  privateNote: string;
  lines: QBOJournalLine[];
}

export interface QBOJournalLine {
  accountId: string;
  description: string;
  amount: number;
  postingType: 'Credit' | 'Debit';
}

export class QuickBooksConnector {
  private static readonly QBO_API_BASE =
    'https://sandbox-quickbooks.api.intuit.com'; // Use production URL for live
  private static readonly CLIENT_ID = process.env.QBO_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.QBO_CLIENT_SECRET;

  /**
   * Initialize OAuth2 flow for QuickBooks connection
   */
  static getAuthorizationUrl(redirectUri: string, state: string): string {
    const scopes = 'com.intuit.quickbooks.accounting';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    });

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  static async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    realmId: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    realmId: string;
  }> {
    const response = await fetch(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `QuickBooks token exchange failed: ${response.statusText}`
      );
    }

    const tokens = await response.json();
    return {
      ...tokens,
      realmId,
    };
  }

  /**
   * Refresh expired access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `QuickBooks token refresh failed: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Create journal entry in QuickBooks Online
   */
  static async createJournalEntry(
    connection: QBOConnection,
    journalEntry: QBOJournalEntry
  ): Promise<{ journalId: string }> {
    // Refresh token if needed
    if (connection.expiresAt <= new Date()) {
      const tokens = await this.refreshAccessToken(connection.refreshToken);
      connection.accessToken = tokens.access_token;
      connection.refreshToken = tokens.refresh_token;
      connection.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    }

    const qboPayload = {
      JournalEntry: {
        Line: journalEntry.lines.map((line, index) => ({
          Id: (index + 1).toString(),
          Description: line.description,
          Amount: Math.abs(line.amount),
          DetailType: 'JournalEntryLineDetail',
          JournalEntryLineDetail: {
            PostingType: line.postingType,
            AccountRef: {
              value: line.accountId,
            },
          },
        })),
        DocNumber: journalEntry.reference,
        TxnDate: journalEntry.txnDate,
        PrivateNote: journalEntry.privateNote,
      },
    };

    const response = await fetch(
      `${this.QBO_API_BASE}/v3/company/${connection.realmId}/journalentry`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(qboPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `QuickBooks journal creation failed: ${JSON.stringify(errorData)}`
      );
    }

    const result = await response.json();
    return {
      journalId: result.QueryResponse?.JournalEntry[0]?.Id || 'unknown',
    };
  }

  /**
   * Get chart of accounts from QuickBooks Online
   */
  static async getChartOfAccounts(connection: QBOConnection): Promise<
    Array<{
      accountId: string;
      accountCode: string;
      accountName: string;
      accountType: string;
    }>
  > {
    const response = await fetch(
      `${this.QBO_API_BASE}/v3/company/${connection.realmId}/query?query=SELECT * FROM Account`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get QuickBooks accounts: ${response.statusText}`
      );
    }

    const result = await response.json();
    return (
      result.QueryResponse?.Account?.map((account: any) => ({
        accountId: account.Id,
        accountCode: account.AcctNum || account.Id,
        accountName: account.Name,
        accountType: account.AccountType,
      })) || []
    );
  }

  /**
   * Get company information
   */
  static async getCompanyInfo(connection: QBOConnection): Promise<{
    companyName: string;
    country: string;
    currency: string;
  }> {
    const response = await fetch(
      `${this.QBO_API_BASE}/v3/company/${connection.realmId}/companyinfo/${connection.realmId}`,
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get QuickBooks company info: ${response.statusText}`
      );
    }

    const result = await response.json();
    const companyInfo = result.QueryResponse?.CompanyInfo[0];

    return {
      companyName: companyInfo?.CompanyName || 'Unknown',
      country: companyInfo?.Country || 'Unknown',
      currency: companyInfo?.Currency || 'USD',
    };
  }

  /**
   * Validate connection by testing API access
   */
  static async validateConnection(connection: QBOConnection): Promise<{
    isValid: boolean;
    companyName?: string;
    error?: string;
  }> {
    try {
      const companyInfo = await this.getCompanyInfo(connection);
      return {
        isValid: true,
        companyName: companyInfo.companyName,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test connection with a simple query
   */
  static async testConnection(connection: QBOConnection): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.QBO_API_BASE}/v3/company/${connection.realmId}/query?query=SELECT COUNT(*) FROM Account`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}
