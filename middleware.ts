import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { securityService } from '@/lib/security';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply security middleware to all API routes
  if (pathname.startsWith('/api/')) {
    // Create security context
    const context = {
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date(),
      sessionId: request.headers.get('x-session-id') || undefined,
      userId: request.headers.get('x-user-id') || undefined,
    };

    // Audit API access
    await securityService.createAuditLog(
      'api_access',
      pathname,
      context,
      true,
      {
        method: request.method,
        hasBody: request.headers.get('content-length') !== '0',
      }
    );

    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10485760) { // 10MB limit
      await securityService.createAuditLog(
        'request_rejected',
        pathname,
        context,
        false,
        { reason: 'Request size exceeded limit', size: contentLength }
      );

      return NextResponse.json(
        { error: 'Request size exceeds maximum allowed limit' },
        { status: 413 }
      );
    }

    // Validate medical input for RAG endpoints
    if (pathname.startsWith('/api/rag/') && request.method === 'POST') {
      try {
        const body = await request.json();
        const validation = securityService.validateMedicalInput(body);
        
        if (!validation.isValid) {
          await securityService.createAuditLog(
            'input_validation_failed',
            pathname,
            context,
            false,
            { errors: validation.errors }
          );

          return NextResponse.json(
            { 
              error: 'Input validation failed',
              details: validation.errors 
            },
            { status: 400 }
          );
        }

        // Create new request with sanitized body
        const sanitizedRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(validation.sanitized),
        });

        // Continue with sanitized request
        return NextResponse.next({
          request: sanitizedRequest,
        });
      } catch (error) {
        await securityService.createAuditLog(
          'request_parsing_failed',
          pathname,
          context,
          false,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );

        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add HSTS header for HTTPS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    const origin = request.headers.get('origin');
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID, X-User-ID');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except static files and images
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.json).*)',
  ],
};