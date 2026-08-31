import { Request, Response, NextFunction } from "express";
import { sanitizeErrorMessage, ErrorCode } from "../utils/errors";

function getCodeForStatus(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "TOO_MANY_REQUESTS";
    default:
      return statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
  }
}

/**
 * Standardizes all outgoing JSON error responses to ensure universal consistency across all APIs.
 * Guarantees every error payload conforms to:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Invalid request",
 *     "details": [...]
 *   },
 *   "message": "Invalid request"
 * }
 */
export function standardizeResponseMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    if (res.statusCode >= 400 && body && typeof body === "object") {
      // If response has an error string e.g. { error: "Something went wrong" }
      if (typeof body.error === "string") {
        const cleanMsg = sanitizeErrorMessage(body.error);
        const code = body.code || getCodeForStatus(res.statusCode);
        const standardized = {
          success: false,
          error: {
            code,
            message: cleanMsg,
            ...(body.details ? { details: body.details } : {})
          },
          message: cleanMsg
        };
        return originalJson(standardized);
      }

      // If response has { success: false, error: { ... } } ensure message is sanitized
      if (body.error && typeof body.error === "object" && body.error.message) {
        body.error.message = sanitizeErrorMessage(body.error.message);
        if (!body.message) {
          body.message = body.error.message;
        }
        if (body.success === undefined) {
          body.success = false;
        }
        return originalJson(body);
      }

      // If response has message string on error status e.g. { message: "Error message" }
      if (typeof body.message === "string" && !body.error && !body.success) {
        const cleanMsg = sanitizeErrorMessage(body.message);
        const code = body.code || getCodeForStatus(res.statusCode);
        const standardized = {
          success: false,
          error: {
            code,
            message: cleanMsg,
            ...(body.details ? { details: body.details } : {})
          },
          message: cleanMsg
        };
        return originalJson(standardized);
      }
    }

    return originalJson(body);
  };

  next();
}
