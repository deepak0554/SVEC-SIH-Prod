import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError, sanitizeErrorMessage, ErrorCode } from "../utils/errors";

/**
 * Centralized Express Error Handling Middleware.
 * Ensures all API errors return a standardized JSON format:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Invalid request",
 *     "details": [...]
 *   },
 *   "message": "Invalid request" // For backward compatibility with legacy consumers
 * }
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // If response headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let errorCode: ErrorCode = "INTERNAL_ERROR";
  let message = "An internal server error occurred.";
  let details: any = undefined;

  // 1. Handled AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // 2. Handled Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = "VALIDATION_ERROR";
    const issues = err.issues.map(i => ({
      field: i.path.join("."),
      message: i.message
    }));
    message = issues[0]?.message ? `Validation Error: ${issues[0].message}` : "Invalid request payload format.";
    details = issues;
  }
  // 3. Handled Express JSON parser syntax errors
  else if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
    statusCode = 400;
    errorCode = "BAD_REQUEST";
    message = "Malformed JSON payload in request body.";
  }
  // 4. Handled Multer / File Upload errors
  else if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    errorCode = "BAD_REQUEST";
    message = "Uploaded file exceeds maximum allowed size limit.";
  }
  // 5. Generic Error handling
  else if (err instanceof Error) {
    // Keep 4xx status if previously set on error object
    if (typeof (err as any).statusCode === "number" && (err as any).statusCode >= 400 && (err as any).statusCode < 500) {
      statusCode = (err as any).statusCode;
      errorCode = "BAD_REQUEST";
      message = err.message;
    } else {
      statusCode = 500;
      errorCode = "INTERNAL_ERROR";
      // In production, mask internal error details
      message = process.env.NODE_ENV === "production" ? "An internal server error occurred." : err.message;
    }
  } else if (typeof err === "string") {
    message = err;
  }

  const cleanMessage = sanitizeErrorMessage(message);

  // Log error on server without leaking sensitive secrets
  if (statusCode >= 500) {
    console.error(`[Server Internal Error] ${req.method} ${req.originalUrl}:`, {
      name: err?.name,
      message: cleanMessage,
      // Stack trace logged server-side only for debugging
      ...(process.env.NODE_ENV !== "production" && err?.stack ? { stack: err.stack } : {})
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: cleanMessage,
      ...(details ? { details } : {})
    },
    // Top-level message for legacy clients expecting res.data.error || res.data.message
    message: cleanMessage
  });
}

/**
 * 404 Handler for undefined API routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `API endpoint ${req.method} ${req.originalUrl} not found.`
    },
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`
  });
}
