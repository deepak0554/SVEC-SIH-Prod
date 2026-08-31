/**
 * Centralized API Client
 * - Configured base URL & timeout abort handling
 * - Unified JWT and Admin Passcode authentication injection
 * - Safe error parsing & standardized error object responses
 * - Idempotency-aware protection: Mutations & Payments are NEVER blindly retried
 * - Request Cancellation / AbortController support
 */

import { getErrorMessage } from "../utils/error";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: any;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, status = 500, code = "INTERNAL_ERROR", details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  requestId?: string;
}

const DEFAULT_TIMEOUT_MS = 30000;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // 1. Check for Admin token / passcode in sessionStorage
    const adminToken = sessionStorage.getItem("svec_sih_admin_token");
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
      headers["x-admin-passcode"] = adminToken;
    }

    // 2. Check for Student token in localStorage
    if (!adminToken) {
      try {
        const savedStudent = localStorage.getItem("svec_sih_student");
        if (savedStudent) {
          const parsed = JSON.parse(savedStudent);
          if (parsed.token) {
            headers["Authorization"] = `Bearer ${parsed.token}`;
          }
        }
      } catch {
        // ignore parse failure
      }
    }

    return headers;
  }

  public async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT_MS,
      params,
      headers: customHeaders,
      skipAuth = false,
      requestId,
      ...customOptions
    } = options;

    let url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      ...(skipAuth ? {} : this.getAuthHeaders()),
      ...(requestId ? { "x-request-id": requestId } : {}),
      ...(customHeaders as Record<string, string> || {})
    };

    // Auto add application/json if sending JSON string or plain object
    if (
      customOptions.body &&
      typeof customOptions.body === "string" &&
      !headers["Content-Type"]
    ) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        ...customOptions,
        headers,
        signal: customOptions.signal || controller.signal
      });

      clearTimeout(timer);

      // Parse JSON response safely
      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const errorMsg = getErrorMessage(data, `Request failed with status ${response.status}`);
        const errorCode = data?.error?.code || (response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : "API_ERROR");
        throw new ApiError(errorMsg, response.status, errorCode, data?.error?.details || data?.details);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        throw new ApiError(`Request timed out after ${timeout / 1000}s`, 408, "TIMEOUT");
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(err?.message || "Network error occurred", 0, "NETWORK_ERROR");
    }
  }

  // Convenient HTTP Verb methods
  public get<T = any>(endpoint: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: isFormData ? body : (typeof body === "object" ? JSON.stringify(body) : body)
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: isFormData ? body : (typeof body === "object" ? JSON.stringify(body) : body)
    });
  }

  public patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: isFormData ? body : (typeof body === "object" ? JSON.stringify(body) : body)
    });
  }

  public delete<T = any>(endpoint: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient();
export default api;
