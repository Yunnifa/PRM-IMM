import { Context, Next } from 'hono';
import { db } from '../db';
import { apiLogs } from '../db/schema';

/**
 * Middleware untuk mencatat semua API request ke database
 * Best practice: Semua logging di API dan semua request yang masuk dicatat
 */
export const apiLoggerMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();
  
  // Capture request info
  const method = c.req.method;
  const path = c.req.path;
  const userAgent = c.req.header('user-agent') || null;
  const ipAddress = c.req.header('x-forwarded-for') || 
                    c.req.header('x-real-ip') || 
                    'unknown';
  
  // Try to get request body (for POST, PUT, PATCH)
  let requestBody: string | null = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await c.req.raw.clone().json();
      // Mask sensitive fields
      const maskedBody = maskSensitiveData(body);
      requestBody = JSON.stringify(maskedBody);
    } catch {
      // Body might not be JSON or might be empty
      requestBody = null;
    }
  }

  // Get user ID from context if authenticated
  let userId: number | null = null;
  try {
    const user = c.get('user');
    if (user && typeof user === 'object' && 'id' in user) {
      userId = user.id as number;
    }
  } catch {
    // User not in context
  }

  let statusCode: number = 500;
  let errorMessage: string | null = null;

  try {
    // Process request
    await next();
    
    // Capture response status
    statusCode = c.res.status;
  } catch (error) {
    // Capture error
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error; // Re-throw to let error handler deal with it
  } finally {
    const duration = Date.now() - startTime;

    // Log to database (async, don't wait)
    saveLog({
      method,
      path,
      statusCode,
      requestBody,
      userAgent,
      ipAddress,
      userId,
      duration,
      errorMessage,
    }).catch((err) => {
      // Log error to console but don't break the request
      console.error('[API Logger] Failed to save log:', err.message);
    });

    // Also log to console for development
    const logLevel = statusCode >= 400 ? '❌' : '✅';
    console.log(
      `${logLevel} [${new Date().toISOString()}] ${method} ${path} - ${statusCode} (${duration}ms)`
    );
  }
};

/**
 * Mask sensitive data before logging
 */
function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey'];
  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***';
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
}

/**
 * Save log to database
 */
async function saveLog(logData: {
  method: string;
  path: string;
  statusCode: number;
  requestBody: string | null;
  userAgent: string | null;
  ipAddress: string;
  userId: number | null;
  duration: number;
  errorMessage: string | null;
}) {
  try {
    await db.insert(apiLogs).values({
      method: logData.method,
      path: logData.path,
      statusCode: logData.statusCode,
      requestBody: logData.requestBody,
      userAgent: logData.userAgent,
      ipAddress: logData.ipAddress,
      userId: logData.userId,
      duration: logData.duration,
      errorMessage: logData.errorMessage,
    });
  } catch (error) {
    // Don't throw, just log to console
    console.error('[API Logger] Database error:', error);
  }
}

export default apiLoggerMiddleware;
