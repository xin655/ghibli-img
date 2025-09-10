import { NextRequest, NextResponse } from 'next/server';
import { logger, LogCategory } from './Logger';
import { v4 as uuidv4 } from 'uuid';

export interface ApiLogContext {
  requestId: string;
  method: string;
  url: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
}

export class ApiLogger {
  private static requestContexts = new Map<string, ApiLogContext>();

  public static startRequest(request: NextRequest, userId?: string): string {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    const context: ApiLogContext = {
      requestId,
      method: request.method,
      url: request.url,
      userId,
      sessionId: request.headers.get('x-session-id') || undefined,
      ip: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      startTime
    };

    this.requestContexts.set(requestId, context);

    // Log request start
    logger.info(LogCategory.API, `Request started: ${request.method} ${request.url}`, {
      requestId,
      method: request.method,
      url: request.url,
      headers: this.getSafeHeaders(request.headers),
      query: Object.fromEntries(request.nextUrl.searchParams)
    }, {
      requestId,
      userId,
      sessionId: context.sessionId,
      ip: context.ip,
      userAgent: context.userAgent
    });

    return requestId;
  }

  public static endRequest(requestId: string, response: NextResponse, error?: Error): void {
    const context = this.requestContexts.get(requestId);
    if (!context) return;

    const duration = Date.now() - context.startTime;
    const statusCode = response.status;

    // Log response
    logger.logApiRequest(
      context.method,
      context.url,
      statusCode,
      duration,
      {
        requestId,
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent
      }
    );

    // Log error if present
    if (error) {
      logger.logError(error, LogCategory.API, {
        requestId,
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent
      });
    }

    // Log performance if slow
    if (duration > 3000) {
      logger.logPerformance(
        `${context.method} ${context.url}`,
        duration,
        { statusCode },
        {
          requestId,
          userId: context.userId,
          sessionId: context.sessionId,
          ip: context.ip,
          userAgent: context.userAgent
        }
      );
    }

    // Clean up
    this.requestContexts.delete(requestId);
  }

  public static logApiError(requestId: string, error: Error, additionalData?: any): void {
    const context = this.requestContexts.get(requestId);
    
    logger.logError(error, LogCategory.API, {
      requestId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      ip: context?.ip,
      userAgent: context?.userAgent,
      data: additionalData
    });
  }

  public static logApiSuccess(requestId: string, message: string, data?: any): void {
    const context = this.requestContexts.get(requestId);
    
    logger.info(LogCategory.API, message, data, {
      requestId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      ip: context?.ip,
      userAgent: context?.userAgent
    });
  }

  public static logApiWarning(requestId: string, message: string, data?: any): void {
    const context = this.requestContexts.get(requestId);
    
    logger.warn(LogCategory.API, message, data, {
      requestId,
      userId: context?.userId,
      sessionId: context?.sessionId,
      ip: context?.ip,
      userAgent: context?.userAgent
    });
  }

  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return 'unknown';
  }

  private static getSafeHeaders(headers: Headers): Record<string, string> {
    const safeHeaders: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    headers.forEach((value, key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        safeHeaders[key] = '[REDACTED]';
      } else {
        safeHeaders[key] = value;
      }
    });
    
    return safeHeaders;
  }
}

// Higher-order function to wrap API routes with logging
export function withApiLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = ApiLogger.startRequest(request);
    
    try {
      const response = await handler(request, ...args);
      ApiLogger.endRequest(requestId, response);
      return response;
    } catch (error) {
      const response = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      ApiLogger.endRequest(requestId, response, error as Error);
      throw error;
    }
  };
}

// Middleware for Next.js middleware
export function createApiLoggingMiddleware() {
  return (request: NextRequest) => {
    const requestId = ApiLogger.startRequest(request);
    
    // Add request ID to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  };
}
