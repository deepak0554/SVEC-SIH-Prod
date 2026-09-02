/**
 * Helper to safely extract error message from API responses or exceptions
 * Handles:
 * - { success: false, error: { code: "...", message: "..." } }
 * - { error: { code: "...", message: "..." } }
 * - { code: "...", message: "..." }
 * - { error: "string" }
 * - { message: "string" }
 * - Error instance / string / unknown
 */
export function getErrorMessage(error: any, fallback = "An unexpected error occurred. Please try again."): string {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  if (error instanceof Error && typeof error.message === "string" && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "object") {
    // If error.error is an object with message
    if (error.error && typeof error.error === "object" && error.error.message) {
      return String(error.error.message);
    }
    // If error.error is a string
    if (typeof error.error === "string" && error.error.trim().length > 0) {
      return error.error;
    }
    // If error.message is a string
    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message;
    }
    // If error has a code and message directly
    if (typeof error.message === "string") {
      return error.message;
    }
  }

  return fallback;
}

