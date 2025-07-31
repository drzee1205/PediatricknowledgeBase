// HIPAA-Compliant Security Middleware and Utilities
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface SecurityConfig {
  enableAuditLogging: boolean;
  enableRateLimit: boolean;
  enableInputValidation: boolean;
  enableEncryption: boolean;
  auditRetentionDays: number;
  maxRequestSize: number;
  allowedOrigins: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: any;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export class SecurityService {
  private config: SecurityConfig;
  private encryptionKey: string;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableAuditLogging: true,
      enableRateLimit: true,
      enableInputValidation: true,
      enableEncryption: true,
      auditRetentionDays: 2555, // 7 years for HIPAA compliance
      maxRequestSize: 10485760, // 10MB
      allowedOrigins: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      ...config,
    };

    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    
    if (!process.env.ENCRYPTION_KEY) {
      console.warn('⚠️  ENCRYPTION_KEY not set in environment variables. Using generated key.');
    }
  }

  /**
   * Generate a secure encryption key
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt sensitive data for storage
   */
  public encryptData(data: string): { encrypted: string; iv: string } {
    if (!this.config.enableEncryption) {
      return { encrypted: data, iv: '' };
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  public decryptData(encrypted: string, iv: string): string {
    if (!this.config.enableEncryption || !iv) {
      return encrypted;
    }

    try {
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Validate and sanitize medical query input
   */
  public validateMedicalInput(input: any): { isValid: boolean; errors: string[]; sanitized?: any } {
    const errors: string[] = [];

    if (!this.config.enableInputValidation) {
      return { isValid: true, errors: [], sanitized: input };
    }

    // Check for potential PHI in queries
    const phiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
      /\b\d{2}\/\d{2}\/\d{4}\b/, // Date of birth pattern
    ];

    if (typeof input.query === 'string') {
      // Check for PHI patterns
      for (const pattern of phiPatterns) {
        if (pattern.test(input.query)) {
          errors.push('Query contains potential personally identifiable information (PHI)');
          break;
        }
      }

      // Check query length
      if (input.query.length > 5000) {
        errors.push('Query exceeds maximum length of 5000 characters');
      }

      // Sanitize query
      input.query = input.query
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .trim();
    }

    // Validate patient data if present
    if (input.patientAge) {
      const age = input.patientAge.toString();
      if (!/^\d+\s*(years?|months?|weeks?|days?)?$/i.test(age)) {
        errors.push('Invalid patient age format');
      }
    }

    if (input.patientWeight) {
      const weight = input.patientWeight.toString();
      if (!/^\d+(\.\d+)?\s*(kg|pounds?|lbs?)?$/i.test(weight)) {
        errors.push('Invalid patient weight format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? input : undefined,
    };
  }

  /**
   * Create audit log entry
   */
  public async createAuditLog(
    action: string,
    resource: string,
    context: SecurityContext,
    success: boolean,
    details?: any
  ): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const auditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: context.timestamp,
      userId: context.userId,
      sessionId: context.sessionId,
      action,
      resource,
      ipAddress: this.hashIP(context.ipAddress),
      userAgent: context.userAgent,
      success,
      details: details ? this.sanitizeDetails(details) : undefined,
      riskLevel: this.assessRiskLevel(action, success, details),
    };

    try {
      // Store audit log (implement based on your storage preference)
      await this.storeAuditLog(auditEntry);
    } catch (error) {
      console.error('Failed to store audit log:', error);
      // Never fail the main operation due to audit logging issues
    }
  }

  /**
   * Hash IP address for privacy while maintaining uniqueness
   */
  private hashIP(ipAddress: string): string {
    return crypto.createHash('sha256').update(ipAddress + this.encryptionKey).digest('hex').substring(0, 16);
  }

  /**
   * Sanitize audit details to remove sensitive information
   */
  private sanitizeDetails(details: any): any {
    const sanitized = { ...details };
    
    // Remove sensitive keys
    const sensitiveKeys = ['password', 'token', 'apiKey', 'ssn', 'email', 'phone'];
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '... [TRUNCATED]';
      }
    });

    return sanitized;
  }

  /**
   * Assess risk level for actions
   */
  private assessRiskLevel(action: string, success: boolean, details?: any): 'low' | 'medium' | 'high' {
    if (!success) {
      return 'medium'; // Failed operations are medium risk
    }

    const highRiskActions = ['login_failure', 'unauthorized_access', 'data_export', 'admin_action'];
    const mediumRiskActions = ['login_success', 'medical_query', 'data_access'];

    if (highRiskActions.includes(action)) {
      return 'high';
    }

    if (mediumRiskActions.includes(action)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Store audit log (implement based on your storage solution)
   */
  private async storeAuditLog(auditEntry: AuditLogEntry): Promise<void> {
    // Implement based on your storage preference:
    // - Database (recommended for production)
    // - File system (for development)
    // - External audit service (for enterprise)
    
    console.log('🔍 Audit Log:', {
      id: auditEntry.id,
      action: auditEntry.action,
      resource: auditEntry.resource,
      success: auditEntry.success,
      riskLevel: auditEntry.riskLevel,
      timestamp: auditEntry.timestamp.toISOString(),
    });

    // In production, store to database:
    // await db.auditLogs.create({ data: auditEntry });
  }

  /**
   * Security middleware for API routes
   */
  public securityMiddleware() {
    return async (req: NextRequest) => {
      const context: SecurityContext = {
        ipAddress: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
      };

      // Check content length
      const contentLength = req.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > this.config.maxRequestSize) {
        await this.createAuditLog(
          'request_rejected',
          req.nextUrl.pathname,
          context,
          false,
          { reason: 'Request size exceeded limit', size: contentLength }
        );
        
        return NextResponse.json(
          { error: 'Request size exceeds maximum allowed limit' },
          { status: 413 }
        );
      }

      // CORS check
      const origin = req.headers.get('origin');
      if (origin && !this.config.allowedOrigins.includes(origin)) {
        await this.createAuditLog(
          'cors_violation',
          req.nextUrl.pathname,
          context,
          false,
          { origin }
        );
        
        return NextResponse.json(
          { error: 'CORS policy violation' },
          { status: 403 }
        );
      }

      // Add security headers
      const response = NextResponse.next();
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      if (req.nextUrl.protocol === 'https:') {
        response.headers.set(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload'
        );
      }

      return response;
    };
  }

  // In-memory rate limiting store (use Redis in production)
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  /**
   * Rate limiting for medical endpoints (Next.js compatible)
   */
  public async checkRateLimit(
    ipAddress: string,
    options: {
      windowMs?: number;
      max?: number;
    } = {}
  ): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    if (!this.config.enableRateLimit) {
      return { allowed: true };
    }

    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    const max = options.max || 100; // 100 requests per window
    const now = Date.now();
    const key = this.hashIP(ipAddress);

    // Clean up expired entries
    this.cleanupRateLimitStore(now);

    const entry = this.rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true, remaining: max - 1 };
    }

    if (entry.count >= max) {
      // Rate limit exceeded
      return {
        allowed: false,
        resetTime: entry.resetTime,
        remaining: 0,
      };
    }

    // Increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: max - entry.count,
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupRateLimitStore(now: number): void {
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Validate environment configuration for security
   */
  public validateSecurityConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required environment variables
    const requiredVars = ['NEXTAUTH_SECRET', 'DATABASE_URL'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Check encryption key strength
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('ENCRYPTION_KEY not set - using generated key (not persistent)');
    } else if (process.env.ENCRYPTION_KEY.length < 32) {
      errors.push('ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Check if running in production without proper security
    if (process.env.NODE_ENV === 'production') {
      if (process.env.NEXTAUTH_URL?.startsWith('http://')) {
        errors.push('Production environment must use HTTPS');
      }
      
      if (!process.env.CORS_ORIGIN) {
        warnings.push('CORS_ORIGIN not configured for production');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Export singleton instance
export const securityService = new SecurityService();

// Export middleware for Next.js middleware.ts
export const withSecurity = securityService.securityMiddleware();

// Export rate limiting helper for API routes
export const checkRateLimit = (ipAddress: string, options?: { windowMs?: number; max?: number }) => 
  securityService.checkRateLimit(ipAddress, options);