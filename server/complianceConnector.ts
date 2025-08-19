/**
 * Compliance Connector Architecture
 * ERGANI II adapters (REST/SOAP), retries, status ledger
 */

// ERGANI II Integration with multiple protocol support
export interface ErganiConfiguration {
  environment: 'production' | 'sandbox' | 'test';
  endpoints: {
    rest: string;
    soap?: string;
    oauth?: string;
  };
  authentication: {
    method: 'oauth2' | 'api_key' | 'certificate';
    credentials: {
      clientId?: string;
      clientSecret?: string;
      apiKey?: string;
      certificate?: string;
      privateKey?: string;
    };
  };
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  };
}

// ERGANI event payload structures
export interface ErganiEventPayload {
  employeeData: {
    afm: string;
    amka?: string;
    lastname: string;
    firstname: string;
    workplaceId: string;
  };
  eventData: {
    eventType: 'WI' | 'WO' | 'BS' | 'BE' | 'LC'; // Work In/Out, Break Start/End, Location Change
    timestamp: string;
    workstationId?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    digitalSignature: string;
  };
  metadata: {
    submissionId: string;
    originalEventId: string;
    deviceId: string;
    softwareVersion: string;
  };
}

// Status tracking for compliance submissions
export interface ComplianceSubmission {
  submissionId: string;
  originalEventId: string;
  erganiPayload: ErganiEventPayload;
  status: 'pending' | 'submitted' | 'acknowledged' | 'failed' | 'rejected';
  attempts: ComplianceAttempt[];
  currentAttempt: number;
  createdAt: string;
  lastAttemptAt?: string;
  acknowledgedAt?: string;
  finalizedAt?: string;
  errorDetails?: {
    code: string;
    message: string;
    technicalDetails: any;
  };
}

export interface ComplianceAttempt {
  attemptNumber: number;
  timestamp: string;
  method: 'rest' | 'soap';
  endpoint: string;
  requestPayload: any;
  responseCode?: number;
  responseBody?: any;
  success: boolean;
  duration: number;
  errorMessage?: string;
  retryScheduled?: string;
}

// Status ledger for audit and monitoring
export interface ComplianceStatusLedger {
  date: string; // YYYY-MM-DD
  statistics: {
    totalSubmissions: number;
    successful: number;
    pending: number;
    failed: number;
    retrying: number;
    acknowledged: number;
    rejected: number;
  };
  detailedEntries: ComplianceSubmission[];
  systemHealth: {
    erganiAvailability: number; // percentage
    averageResponseTime: number; // milliseconds
    errorRate: number; // percentage
    lastSuccessfulSubmission: string;
  };
  alertsGenerated: {
    alertType: string;
    count: number;
    lastOccurrence: string;
  }[];
}

export class ComplianceConnector {
  private static config: ErganiConfiguration = {
    environment: 'sandbox',
    endpoints: {
      rest: 'https://ergani.gov.gr/api/v2',
      soap: 'https://ergani.gov.gr/soap/v2',
      oauth: 'https://ergani.gov.gr/oauth/token'
    },
    authentication: {
      method: 'oauth2',
      credentials: {
        clientId: process.env.ERGANI_CLIENT_ID,
        clientSecret: process.env.ERGANI_CLIENT_SECRET
      }
    },
    retryPolicy: {
      maxRetries: 5,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 60000
    },
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerHour: 5000,
      burstLimit: 10
    }
  };

  private static rateLimiter = new Map<string, number[]>();
  private static submissionQueue: ComplianceSubmission[] = [];
  private static processing = false;

  // Main submission method with automatic retry
  static async submitToErgani(timeEvent: any): Promise<ComplianceSubmission> {
    const submission = await this.createComplianceSubmission(timeEvent);
    
    // Add to queue for processing
    this.submissionQueue.push(submission);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processSubmissionQueue();
    }

    return submission;
  }

  // Process submission queue with rate limiting and retry logic
  private static async processSubmissionQueue(): Promise<void> {
    this.processing = true;

    while (this.submissionQueue.length > 0) {
      const submission = this.submissionQueue.shift()!;

      try {
        // Check rate limits
        await this.enforceRateLimit();

        // Attempt submission
        await this.attemptSubmission(submission);

        // If successful, update status ledger
        if (submission.status === 'acknowledged') {
          await this.updateStatusLedger(submission, 'success');
        }

      } catch (error) {
        console.error(`Submission failed for ${submission.submissionId}:`, error);
        
        // Handle failure
        await this.handleSubmissionFailure(submission, error);
      }

      // Brief pause between submissions
      await this.delay(100);
    }

    this.processing = false;
  }

  // Attempt individual submission with fallback protocols
  private static async attemptSubmission(submission: ComplianceSubmission): Promise<void> {
    const attempt: ComplianceAttempt = {
      attemptNumber: submission.currentAttempt + 1,
      timestamp: new Date().toISOString(),
      method: 'rest', // Start with REST
      endpoint: this.config.endpoints.rest,
      requestPayload: submission.erganiPayload,
      success: false,
      duration: 0
    };

    submission.attempts.push(attempt);
    submission.currentAttempt = attempt.attemptNumber;
    submission.lastAttemptAt = attempt.timestamp;

    const startTime = Date.now();

    try {
      // Try REST first
      const restResult = await this.submitViaRest(submission.erganiPayload);
      
      attempt.responseCode = restResult.status;
      attempt.responseBody = restResult.data;
      attempt.success = true;
      attempt.duration = Date.now() - startTime;

      submission.status = 'acknowledged';
      submission.acknowledgedAt = new Date().toISOString();

    } catch (restError) {
      attempt.errorMessage = restError.message;
      attempt.duration = Date.now() - startTime;

      // Fallback to SOAP if available
      if (this.config.endpoints.soap) {
        try {
          attempt.method = 'soap';
          attempt.endpoint = this.config.endpoints.soap;

          const soapResult = await this.submitViaSoap(submission.erganiPayload);
          
          attempt.responseBody = soapResult;
          attempt.success = true;
          
          submission.status = 'acknowledged';
          submission.acknowledgedAt = new Date().toISOString();

        } catch (soapError) {
          // Both protocols failed
          submission.status = 'failed';
          submission.errorDetails = {
            code: 'SUBMISSION_FAILED',
            message: 'Both REST and SOAP submission failed',
            technicalDetails: {
              restError: restError.message,
              soapError: soapError.message
            }
          };

          // Schedule retry if attempts remain
          if (submission.currentAttempt < this.config.retryPolicy.maxRetries) {
            await this.scheduleRetry(submission);
          } else {
            submission.finalizedAt = new Date().toISOString();
            await this.updateStatusLedger(submission, 'final_failure');
          }
        }
      } else {
        // Only REST available and it failed
        submission.status = 'failed';
        submission.errorDetails = {
          code: 'REST_FAILED',
          message: restError.message,
          technicalDetails: restError
        };

        if (submission.currentAttempt < this.config.retryPolicy.maxRetries) {
          await this.scheduleRetry(submission);
        } else {
          submission.finalizedAt = new Date().toISOString();
          await this.updateStatusLedger(submission, 'final_failure');
        }
      }
    }
  }

  // REST API submission
  private static async submitViaRest(payload: ErganiEventPayload): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(`${this.config.endpoints.rest}/work-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-API-Version': '2.0',
        'User-Agent': 'PayrollSync-ERGANI-Connector/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`REST submission failed: ${response.status} - ${errorBody}`);
    }

    return {
      status: response.status,
      data: await response.json()
    };
  }

  // SOAP API submission
  private static async submitViaSoap(payload: ErganiEventPayload): Promise<any> {
    const soapEnvelope = this.buildSoapEnvelope(payload);
    
    const response = await fetch(this.config.endpoints.soap!, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'SubmitWorkEvent'
      },
      body: soapEnvelope
    });

    if (!response.ok) {
      throw new Error(`SOAP submission failed: ${response.status}`);
    }

    const responseText = await response.text();
    return this.parseSoapResponse(responseText);
  }

  // OAuth2 token management
  private static async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    const cached = this.getCachedToken();
    if (cached && !this.isTokenExpired(cached)) {
      return cached.access_token;
    }

    // Request new token
    const response = await fetch(this.config.endpoints.oauth!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.authentication.credentials.clientId!,
        client_secret: this.config.authentication.credentials.clientSecret!,
        scope: 'work-events'
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData = await response.json();
    this.cacheToken(tokenData);
    
    return tokenData.access_token;
  }

  // Rate limiting enforcement
  private static async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const window = 60000; // 1 minute window
    const key = 'ergani_submissions';

    // Get current window requests
    const requests = this.rateLimiter.get(key) || [];
    const recentRequests = requests.filter(time => now - time < window);

    // Check if we're over the limit
    if (recentRequests.length >= this.config.rateLimits.requestsPerMinute) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = window - (now - oldestRequest);
      
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimiter.set(key, recentRequests);
  }

  // Retry scheduling with exponential backoff
  private static async scheduleRetry(submission: ComplianceSubmission): Promise<void> {
    const delay = this.calculateRetryDelay(submission.currentAttempt);
    const retryTime = new Date(Date.now() + delay);

    submission.status = 'pending';
    submission.attempts[submission.attempts.length - 1].retryScheduled = retryTime.toISOString();

    // In a real implementation, this would use a job queue
    setTimeout(() => {
      this.submissionQueue.push(submission);
      if (!this.processing) {
        this.processSubmissionQueue();
      }
    }, delay);
  }

  // Calculate retry delay based on backoff strategy
  private static calculateRetryDelay(attemptNumber: number): number {
    const { backoffStrategy, initialDelay, maxDelay } = this.config.retryPolicy;

    if (backoffStrategy === 'exponential') {
      return Math.min(initialDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    } else {
      return Math.min(initialDelay * attemptNumber, maxDelay);
    }
  }

  // Status ledger management
  private static async updateStatusLedger(
    submission: ComplianceSubmission,
    outcome: 'success' | 'failure' | 'final_failure'
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const ledger = await this.getStatusLedger(today);

    // Update statistics
    if (outcome === 'success') {
      ledger.statistics.successful++;
      ledger.statistics.acknowledged++;
    } else {
      ledger.statistics.failed++;
    }

    // Add detailed entry
    ledger.detailedEntries.push(submission);

    // Calculate system health metrics
    await this.updateSystemHealthMetrics(ledger);

    // Save ledger
    await this.saveStatusLedger(today, ledger);

    // Generate alerts if needed
    await this.checkForAlerts(ledger);
  }

  // Helper methods
  private static async createComplianceSubmission(timeEvent: any): Promise<ComplianceSubmission> {
    const submissionId = `ergani_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      submissionId,
      originalEventId: timeEvent.eventId,
      erganiPayload: this.transformToErganiPayload(timeEvent),
      status: 'pending',
      attempts: [],
      currentAttempt: 0,
      createdAt: new Date().toISOString()
    };
  }

  private static transformToErganiPayload(timeEvent: any): ErganiEventPayload {
    return {
      employeeData: {
        afm: timeEvent.employeeId, // Assuming AFM is used as employee ID
        lastname: 'LastName', // Would be fetched from employee service
        firstname: 'FirstName',
        workplaceId: timeEvent.propertyId
      },
      eventData: {
        eventType: this.mapEventType(timeEvent.eventType),
        timestamp: timeEvent.timestamp,
        workstationId: timeEvent.deviceInfo?.deviceId,
        coordinates: timeEvent.location?.coordinates,
        digitalSignature: this.generateDigitalSignature(timeEvent)
      },
      metadata: {
        submissionId: timeEvent.eventId,
        originalEventId: timeEvent.eventId,
        deviceId: timeEvent.deviceInfo?.deviceId || 'unknown',
        softwareVersion: '1.0.0'
      }
    };
  }

  private static mapEventType(eventType: string): 'WI' | 'WO' | 'BS' | 'BE' | 'LC' {
    const mapping: Record<string, 'WI' | 'WO' | 'BS' | 'BE' | 'LC'> = {
      'clock_in': 'WI',
      'clock_out': 'WO',
      'break_start': 'BS',
      'break_end': 'BE',
      'location_change': 'LC'
    };
    return mapping[eventType] || 'WI';
  }

  private static generateDigitalSignature(timeEvent: any): string {
    // In a real implementation, this would use proper cryptographic signing
    const data = `${timeEvent.employeeId}-${timeEvent.timestamp}-${timeEvent.eventType}`;
    return btoa(data).substring(0, 32);
  }

  private static buildSoapEnvelope(payload: ErganiEventPayload): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SubmitWorkEvent xmlns="http://ergani.gov.gr/schemas">
      <eventData>
        <afm>${payload.employeeData.afm}</afm>
        <eventType>${payload.eventData.eventType}</eventType>
        <timestamp>${payload.eventData.timestamp}</timestamp>
        <signature>${payload.eventData.digitalSignature}</signature>
      </eventData>
    </SubmitWorkEvent>
  </soap:Body>
</soap:Envelope>`;
  }

  private static parseSoapResponse(response: string): any {
    // Simple SOAP response parsing - would use proper XML parser in production
    return { success: response.includes('success') };
  }

  private static getCachedToken(): any {
    // Token caching implementation
    return null;
  }

  private static isTokenExpired(token: any): boolean {
    return Date.now() > token.expires_at;
  }

  private static cacheToken(tokenData: any): void {
    // Cache token with expiration
  }

  private static async getStatusLedger(date: string): Promise<ComplianceStatusLedger> {
    // Retrieve or create status ledger for date
    return {
      date,
      statistics: {
        totalSubmissions: 0,
        successful: 0,
        pending: 0,
        failed: 0,
        retrying: 0,
        acknowledged: 0,
        rejected: 0
      },
      detailedEntries: [],
      systemHealth: {
        erganiAvailability: 100,
        averageResponseTime: 0,
        errorRate: 0,
        lastSuccessfulSubmission: new Date().toISOString()
      },
      alertsGenerated: []
    };
  }

  private static async saveStatusLedger(date: string, ledger: ComplianceStatusLedger): Promise<void> {
    // Save ledger to database
  }

  private static async updateSystemHealthMetrics(ledger: ComplianceStatusLedger): Promise<void> {
    // Calculate health metrics from recent submissions
  }

  private static async checkForAlerts(ledger: ComplianceStatusLedger): Promise<void> {
    // Check for conditions that require alerts
  }

  private static async handleSubmissionFailure(submission: ComplianceSubmission, error: any): Promise<void> {
    // Handle and log submission failures
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}