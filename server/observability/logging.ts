// =============================================================================
// ENHANCED LOGGING SYSTEM
// =============================================================================

import { randomUUID } from 'crypto';
import { Sentry } from './sentry.js';

/**
 * Log Levels (RFC 5424)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Logger configuration based on environment
 */
class Logger {
  private currentLevel: LogLevel;
  private enableColors: boolean;
  private enablePIIRedaction: boolean;

  constructor() {
    this.currentLevel = this.getLogLevelFromEnv();
    this.enableColors = process.env.DISABLE_LOG_COLORS !== 'true';
    this.enablePIIRedaction = process.env.NODE_ENV === 'production';
    
    console.log(`[LOGGER] Initialized with level: ${LogLevel[this.currentLevel]} (${this.currentLevel})`);
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
    
    switch (envLevel) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': case 'warning': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default:
        console.warn(`[LOGGER] Unknown LOG_LEVEL: ${envLevel}, defaulting to INFO`);
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private colorize(level: LogLevel, text: string): string {
    if (!this.enableColors) return text;
    
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    return `${colors[level]}${text}${reset}`;
  }

  private redactPII(data: any): any {
    if (!this.enablePIIRedaction) return data;
    
    if (typeof data === 'string') {
      // Redact common PII patterns
      return data
        .replace(/\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g, '[EMAIL_REDACTED]') // Email
        .replace(/\\b\\d{9}\\b/g, '[AFM_REDACTED]') // Greek AFM (9 digits)
        .replace(/\\b\\d{11}\\b/g, '[AMKA_REDACTED]') // Greek AMKA (11 digits)
        .replace(/\\b\\d{3}-?\\d{2}-?\\d{4}\\b/g, '[SSN_REDACTED]') // US SSN
        .replace(/\\b4[0-9]{12}(?:[0-9]{3})?\\b/g, '[CARD_REDACTED]') // Credit card (basic)
        .replace(/password[\"']?\\s*[:=]\\s*[\"']?[^\\s,}]+/gi, 'password: [REDACTED]');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sensitiveKeys = [
        'password', 'token', 'secret', 'key', 'afm', 'amka', 'ssn', 
        'email', 'phone', 'iban', 'credit_card', 'authorization'
      ];
      
      if (Array.isArray(data)) {
        return data.map(item => this.redactPII(item));
      }
      
      const redacted: any = {};
      for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));
        
        if (isSensitive) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactPII(value);
        }
      }
      return redacted;
    }
    
    return data;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any, requestId?: string): string {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level].padEnd(5);
    const reqId = requestId ? `[${requestId.slice(0, 8)}]` : '[--------]';
    
    let formatted = `${timestamp} ${this.colorize(level, levelStr)} ${reqId} ${message}`;
    
    if (meta) {
      const redactedMeta = this.redactPII(meta);
      formatted += ` ${JSON.stringify(redactedMeta)}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, meta?: any, requestId?: string) {
    if (!this.shouldLog(level)) return;
    
    const formatted = this.formatMessage(level, message, meta, requestId);
    
    // Send to appropriate output
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
      
      // Send errors to Sentry in production
      if (this.enablePIIRedaction && level >= LogLevel.ERROR) {
        if (meta instanceof Error) {
          Sentry.captureException(meta);
        } else {
          Sentry.captureMessage(message, 'error');
        }
      }
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, meta?: any, requestId?: string) {
    this.log(LogLevel.DEBUG, message, meta, requestId);
  }

  info(message: string, meta?: any, requestId?: string) {
    this.log(LogLevel.INFO, message, meta, requestId);
  }

  warn(message: string, meta?: any, requestId?: string) {
    this.log(LogLevel.WARN, message, meta, requestId);
  }

  error(message: string, meta?: any, requestId?: string) {
    this.log(LogLevel.ERROR, message, meta, requestId);
  }

  fatal(message: string, meta?: any, requestId?: string) {
    this.log(LogLevel.FATAL, message, meta, requestId);
    
    // Fatal errors should terminate the process
    if (this.enablePIIRedaction) {
      process.exit(1);
    }
  }

  // Method to change log level at runtime
  setLogLevel(level: LogLevel) {
    this.currentLevel = level;
    this.info(`Log level changed to: ${LogLevel[level]}`);
  }
}

// Global logger instance
export const logger = new Logger();

/**
 * Request ID middleware - adds unique ID to each request
 */
export function requestIdMiddleware(req: any, res: any, next: any) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Add to Sentry scope
  if (typeof Sentry !== 'undefined') {
    try {
      Sentry.configureScope(scope => {
        scope.setTag('request_id', requestId);
      });
    } catch (e) {
      // Sentry might not be initialized, ignore
    }
  }
  
  logger.debug('Request started', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent']
  }, requestId);
  
  next();
}

/**
 * Request logging middleware - logs request/response details
 */
export function requestLoggingMiddleware(req: any, res: any, next: any) {
  const start = Date.now();
  const requestId = req.requestId;
  
  // Log request
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }, requestId);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? LogLevel.ERROR :
                  res.statusCode >= 400 ? LogLevel.WARN : 
                  LogLevel.INFO;
    
    logger.log(level, 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length') || 0
    }, requestId);
  });
  
  next();
}