/**
 * Analytics Service for Authentication Events
 * Tracks user behavior and authentication flow analytics
 */

export interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  correlationId: string;
  timestamp: Date;
  properties: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Analytics event types for authentication
export enum AuthAnalyticsEvents {
  // Login flow
  AUTH_LOGIN_SUBMIT = 'auth.login.submit',
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAIL = 'auth.login.fail',
  AUTH_LOGIN_LOCKED = 'auth.login.locked',

  // Sign-up flow  
  AUTH_SIGNUP_SUBMIT = 'auth.signup.submit',
  AUTH_SIGNUP_SUCCESS = 'auth.signup.success',
  AUTH_SIGNUP_FAIL = 'auth.signup.fail',

  // MFA flow
  AUTH_MFA_CHALLENGE = 'auth.mfa.challenge',
  AUTH_MFA_SUCCESS = 'auth.mfa.success',
  AUTH_MFA_FAIL = 'auth.mfa.fail',
  AUTH_MFA_BACKUP_CODE_USED = 'auth.mfa.backup_code_used',
  AUTH_WEBAUTHN_CHALLENGE = 'auth.webauthn.challenge',
  AUTH_WEBAUTHN_SUCCESS = 'auth.webauthn.success',
  AUTH_WEBAUTHN_FAIL = 'auth.webauthn.fail',

  // Email verification
  AUTH_EMAIL_VERIFICATION_SENT = 'auth.email_verification.sent',
  AUTH_EMAIL_VERIFICATION_SUCCESS = 'auth.email_verification.success',
  AUTH_EMAIL_VERIFICATION_EXPIRED = 'auth.email_verification.expired',

  // Password reset
  AUTH_PASSWORD_RESET_REQUEST = 'auth.password_reset.request',
  AUTH_PASSWORD_RESET_SUCCESS = 'auth.password_reset.success',
  AUTH_PASSWORD_RESET_FAIL = 'auth.password_reset.fail',

  // Magic link
  AUTH_MAGIC_LINK_REQUEST = 'auth.magic_link.request',
  AUTH_MAGIC_LINK_SUCCESS = 'auth.magic_link.success',
  AUTH_MAGIC_LINK_EXPIRED = 'auth.magic_link.expired',

  // SSO
  AUTH_SSO_INITIATED = 'auth.sso.initiated',
  AUTH_SSO_SUCCESS = 'auth.sso.success',
  AUTH_SSO_FAIL = 'auth.sso.fail',
  AUTH_SSO_DOMAIN_DISCOVERY = 'auth.sso.domain_discovery',

  // Session management
  AUTH_SESSION_CREATED = 'auth.session.created',
  AUTH_SESSION_REFRESHED = 'auth.session.refreshed',
  AUTH_SESSION_EXPIRED = 'auth.session.expired',
  AUTH_LOGOUT = 'auth.logout',

  // Security events
  AUTH_RATE_LIMITED = 'auth.rate_limited',
  AUTH_SUSPICIOUS_ACTIVITY = 'auth.suspicious_activity',
  AUTH_CSRF_BLOCKED = 'auth.csrf_blocked',

  // GDPR events
  AUTH_GDPR_CONSENT_GIVEN = 'auth.gdpr.consent_given',
  AUTH_GDPR_DATA_EXPORTED = 'auth.gdpr.data_exported',
  AUTH_GDPR_ACCOUNT_DELETED = 'auth.gdpr.account_deleted',
}

// In-memory event storage (would be sent to analytics service in production)
const events: AnalyticsEvent[] = [];

export class AnalyticsService {
  /**
   * Track an authentication event
   */
  static track(
    event: AuthAnalyticsEvents,
    properties: Record<string, any> = {},
    context: {
      userId?: string;
      sessionId?: string;
      correlationId: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ): void {
    // Don't track if analytics is disabled
    if (!require('./FeatureFlagService').FeatureFlagService.isEnabled('auth_analytics_enabled')) {
      return;
    }

    const analyticsEvent: AnalyticsEvent = {
      event,
      userId: context.userId,
      sessionId: context.sessionId,
      correlationId: context.correlationId,
      timestamp: new Date(),
      properties: {
        ...properties,
        // Add context properties
        has_user_id: !!context.userId,
        has_session: !!context.sessionId,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    };

    events.push(analyticsEvent);

    // Keep only last 10000 events to prevent memory issues
    if (events.length > 10000) {
      events.splice(0, events.length - 10000);
    }

    // In production, this would send to analytics service
    console.log('📊 Analytics Event:', {
      event: analyticsEvent.event,
      userId: analyticsEvent.userId,
      correlationId: analyticsEvent.correlationId,
      properties: analyticsEvent.properties,
    });
  }

  /**
   * Get events for a specific user
   */
  static getUserEvents(userId: string, limit: number = 100): AnalyticsEvent[] {
    return events
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get events by correlation ID (for debugging flows)
   */
  static getEventsByCorrelationId(correlationId: string): AnalyticsEvent[] {
    return events
      .filter(e => e.correlationId === correlationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get analytics summary for a time period
   */
  static getSummary(timeRangeHours: number = 24): {
    totalEvents: number;
    uniqueUsers: number;
    loginAttempts: number;
    successfulLogins: number;
    signupAttempts: number;
    mfaChallenges: number;
    topEvents: Array<{ event: string; count: number }>;
  } {
    const cutoff = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentEvents = events.filter(e => e.timestamp > cutoff);

    const uniqueUsers = new Set(recentEvents.filter(e => e.userId).map(e => e.userId)).size;
    
    const loginAttempts = recentEvents.filter(e => e.event === AuthAnalyticsEvents.AUTH_LOGIN_SUBMIT).length;
    const successfulLogins = recentEvents.filter(e => e.event === AuthAnalyticsEvents.AUTH_LOGIN_SUCCESS).length;
    const signupAttempts = recentEvents.filter(e => e.event === AuthAnalyticsEvents.AUTH_SIGNUP_SUBMIT).length;
    const mfaChallenges = recentEvents.filter(e => e.event === AuthAnalyticsEvents.AUTH_MFA_CHALLENGE).length;

    // Count events by type
    const eventCounts = new Map<string, number>();
    recentEvents.forEach(e => {
      eventCounts.set(e.event, (eventCounts.get(e.event) || 0) + 1);
    });

    const topEvents = Array.from(eventCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));

    return {
      totalEvents: recentEvents.length,
      uniqueUsers,
      loginAttempts,
      successfulLogins,
      signupAttempts,
      mfaChallenges,
      topEvents,
    };
  }

  /**
   * Track conversion funnel
   */
  static getConversionFunnel(correlationIds: string[]): {
    correlationId: string;
    events: AnalyticsEvent[];
    outcome: 'success' | 'fail' | 'abandoned';
    duration: number;
  }[] {
    return correlationIds.map(correlationId => {
      const correlationEvents = this.getEventsByCorrelationId(correlationId);
      
      if (correlationEvents.length === 0) {
        return {
          correlationId,
          events: [],
          outcome: 'abandoned' as const,
          duration: 0,
        };
      }

      const firstEvent = correlationEvents[0];
      const lastEvent = correlationEvents[correlationEvents.length - 1];
      const duration = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();

      // Determine outcome based on final event
      let outcome: 'success' | 'fail' | 'abandoned' = 'abandoned';
      if (lastEvent.event.includes('.success')) {
        outcome = 'success';
      } else if (lastEvent.event.includes('.fail') || lastEvent.event.includes('.locked')) {
        outcome = 'fail';
      }

      return {
        correlationId,
        events: correlationEvents,
        outcome,
        duration,
      };
    });
  }

  /**
   * Clear old events (cleanup job)
   */
  static clearOldEvents(olderThanHours: number = 168): number { // 7 days default
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = events.length;
    
    // Remove events older than cutoff
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].timestamp < cutoff) {
        events.splice(i, 1);
      }
    }
    
    return initialLength - events.length;
  }
}

// Cleanup job - run every hour
setInterval(() => {
  AnalyticsService.clearOldEvents(168); // Keep 7 days
}, 60 * 60 * 1000);