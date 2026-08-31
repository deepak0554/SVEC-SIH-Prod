/**
 * Centralized Error Classes & Sanitization Utilities
 * Enforces standardized error structure:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Invalid request",
 *     "details": [...]
 *   }
 * }
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "PAYMENT_REQUIRED"
  | "PAYMENT_FAILED"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code: ErrorCode = "INTERNAL_ERROR", details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation Error", details?: any) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: any) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required or invalid credentials") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied. Insufficient permissions.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409, "CONFLICT");
  }
}

export class PaymentError extends AppError {
  constructor(message = "Payment processing error", details?: any) {
    super(message, 400, "PAYMENT_FAILED", details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "An unexpected error occurred. Please try again later.") {
    super(message, 500, "INTERNAL_ERROR");
  }
}

/**
 * Sanitizes any string or error message so secrets, passwords, connection strings,
 * and internal filesystem paths are never leaked to clients.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    return "An error occurred";
  }

  let sanitized = rawMessage;

  // 1. Redact database URIs with passwords (postgres://user:pass@host...)
  sanitized = sanitized.replace(/(postgres(?:ql)?|mongodb(?:\+srv)?|mysql):\/\/[^:]+:([^@]+)@/gi, "$1://[REDACTED]:[REDACTED]@");

  // 2. Redact potential JWT tokens (Bearer eyJ...)
  sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/gi, "Bearer [REDACTED_JWT]");

  // 3. Redact API keys / secrets / password params
  sanitized = sanitized.replace(/(?:password|secret|token|apiKey|keySecret|authKey)\s*[:=]\s*['"]?[^'",\s]+['"]?/gi, "[REDACTED_CREDENTIAL]");

  // 4. Redact internal filesystem paths (/workspace/..., /app/node_modules/..., /home/..., /var/...)
  sanitized = sanitized.replace(/(?:\/[a-zA-Z0-9._-]+){2,}\/([a-zA-Z0-9._-]+\.[a-zA-Z0-9]+)/g, "$1");

  return sanitized;
}
