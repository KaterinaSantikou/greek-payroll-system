/**
 * Native Connectors Service - Xero & QuickBooks Online Integration
 */

import crypto from 'crypto';
import { WebhookService } from './webhookService';
import { db } from '../db';
import { partners } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ConnectorConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface ConnectorCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tenantId?: string;
  companyId?: string;
}

export interface GLJournalLine {
  lineId: string;
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
  costCenter?: string;
  department?: string;
  propertyId?: string;
  project?: string;
  employeeId?: string;
}

export interface CanonicalJournal {
  journalId: string;
  entityId: string;
  period: string;
  currency: string;
  description: string;
  runId?: string;
  lines: GLJournalLine[];
}

export abstract class BaseConnector {
  protected config: ConnectorConfig;
  protected credentials?: ConnectorCredentials;
  
  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract getAuthUrl(state: string, codeVerifier?: string): string;
  abstract exchangeCodeForToken(code: string, codeVerifier?: string): Promise<TokenResponse>;
  abstract refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
  abstract postJournal(journal: CanonicalJournal): Promise<string>;
  abstract validateConnection(): Promise<boolean>;

  setCredentials(credentials: ConnectorCredentials) {
    this.credentials = credentials;
  }

  async ensureValidToken(): Promise<void> {
    if (!this.credentials) {
      throw new Error('No credentials configured');
    }

    if (new Date() >= this.credentials.expiresAt) {
      if (!this.credentials.refreshToken) {
        throw new Error('Access token expired and no refresh token available');
      }

      const tokenResponse = await this.refreshAccessToken(this.credentials.refreshToken);
      this.credentials = {
        ...this.credentials,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || this.credentials.refreshToken,
        expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000)),
      };

      // Trigger webhook for token refresh
      await this.notifyTokenRefresh();
    }
  }

  protected async notifyTokenRefresh(): Promise<void> {
    try {
      const activePartners = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.status, 'active'));

      for (const partner of activePartners) {
        await WebhookService.sendConnectorTokenRefreshedEvent(partner.id, {
          connector: this.getConnectorType(),
          entity_id: this.credentials?.tenantId || 'unknown'
        });
      }
    } catch (error) {
      console.error('Failed to send token refresh webhook:', error);
    }
  }

  protected abstract getConnectorType(): string;
}

export class XeroConnector extends BaseConnector {
  
  getConnectorType(): string {
    return 'xero';
  }

  getAuthUrl(state: string, codeVerifier: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: this.generateCodeChallenge(codeVerifier),
      code_challenge_method: 'S256'
    });

    return `https://login.xero.com/identity/connect/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
    const tokenUrl = 'https://identity.xero.com/connect/token';
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Xero token exchange failed: ${error}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const tokenUrl = 'https://identity.xero.com/connect/token';
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Xero token refresh failed: ${error}`);
    }

    return response.json();
  }

  async postJournal(journal: CanonicalJournal): Promise<string> {
    await this.ensureValidToken();

    const xeroJournal = this.transformToXeroFormat(journal);
    
    const response = await fetch(`https://api.xero.com/api.xro/2.0/ManualJournals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.accessToken}`,
        'Content-Type': 'application/json',
        'Xero-Tenant-Id': this.credentials!.tenantId!,
      },
      body: JSON.stringify({ ManualJournals: [xeroJournal] }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Xero journal posting failed: ${error}`);
    }

    const result = await response.json();
    return result.ManualJournals[0].ManualJournalID;
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      
      const response = await fetch('https://api.xero.com/api.xro/2.0/Organisation', {
        headers: {
          'Authorization': `Bearer ${this.credentials!.accessToken}`,
          'Xero-Tenant-Id': this.credentials!.tenantId!,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private transformToXeroFormat(journal: CanonicalJournal) {
    const journalLines = journal.lines.map(line => {
      const xeroLine: any = {
        Description: line.description,
        AccountCode: line.accountCode,
      };

      // Xero uses positive amounts with explicit Debit/Credit
      const debitAmount = parseFloat(line.debit || '0');
      const creditAmount = parseFloat(line.credit || '0');

      if (debitAmount > 0) {
        xeroLine.Debit = debitAmount;
      }
      if (creditAmount > 0) {
        xeroLine.Credit = creditAmount;
      }

      // Add tracking categories for dimensions
      const tracking = [];
      if (line.propertyId) {
        tracking.push({ Name: 'Property', Option: line.propertyId });
      }
      if (line.department) {
        tracking.push({ Name: 'Department', Option: line.department });
      }
      if (line.costCenter) {
        tracking.push({ Name: 'Cost Center', Option: line.costCenter });
      }

      if (tracking.length > 0) {
        xeroLine.Tracking = tracking;
      }

      return xeroLine;
    });

    return {
      Narration: journal.description,
      Date: new Date().toISOString().split('T')[0],
      Status: 'POSTED',
      JournalLines: journalLines,
    };
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }
}

export class QuickBooksConnector extends BaseConnector {

  getConnectorType(): string {
    return 'quickbooks';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
    });

    return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks token exchange failed: ${error}`);
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks token refresh failed: ${error}`);
    }

    return response.json();
  }

  async postJournal(journal: CanonicalJournal): Promise<string> {
    await this.ensureValidToken();

    const qboJournal = this.transformToQBOFormat(journal);
    
    const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${this.credentials!.companyId}/journalentry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.credentials!.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qboJournal),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks journal posting failed: ${error}`);
    }

    const result = await response.json();
    return result.QueryResponse?.JournalEntry?.[0]?.Id || 'unknown';
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      
      const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${this.credentials!.companyId}/companyinfo/${this.credentials!.companyId}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials!.accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private transformToQBOFormat(journal: CanonicalJournal) {
    const lines = journal.lines.map(line => {
      const debitAmount = parseFloat(line.debit || '0');
      const creditAmount = parseFloat(line.credit || '0');
      
      const amount = Math.max(debitAmount, creditAmount);
      const postingType = debitAmount > 0 ? 'Debit' : 'Credit';

      const qboLine: any = {
        DetailType: 'JournalEntryLineDetail',
        Amount: amount,
        Description: line.description,
        JournalEntryLineDetail: {
          PostingType: postingType,
          AccountRef: {
            value: line.accountCode,
            name: line.description.split(' ')[0], // Extract account name from description
          },
        },
      };

      // Add dimensional references
      if (line.department) {
        qboLine.JournalEntryLineDetail.DepartmentRef = {
          value: line.department,
        };
      }
      if (line.costCenter) {
        qboLine.JournalEntryLineDetail.ClassRef = {
          value: line.costCenter,
        };
      }
      if (line.propertyId) {
        qboLine.JournalEntryLineDetail.LocationRef = {
          value: line.propertyId,
        };
      }

      return qboLine;
    });

    return {
      DocNumber: journal.runId || journal.journalId,
      TxnDate: new Date().toISOString().split('T')[0],
      Line: lines,
    };
  }
}

export class ConnectorFactory {
  static createConnector(type: 'xero' | 'quickbooks', config: ConnectorConfig): BaseConnector {
    switch (type) {
      case 'xero':
        return new XeroConnector(config);
      case 'quickbooks':
        return new QuickBooksConnector(config);
      default:
        throw new Error(`Unsupported connector type: ${type}`);
    }
  }
}