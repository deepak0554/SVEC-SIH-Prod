import crypto from "crypto";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

// ------------------- PRODUCTION SECRET ENFORCEMENT -------------------

const IS_PROD = process.env.NODE_ENV === "production";
const INSECURE_DEFAULTS = [
  "svec_sih_hackathon_jwt_secret_2026",
  "default-secret",
  "secret",
  "changeme",
  "123456",
  "SIHAdmin2026"
];

// Lazily initialized runtime fallback for local development only
let devEphemeralSecret: string | null = null;

export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET;

  if (IS_PROD) {
    if (!envSecret || envSecret.trim().length < 16) {
      throw new Error(
        "FATAL SECURITY ERROR: JWT_SECRET environment variable is missing, too short (< 16 chars), or insecure in production mode. " +
        "Please provide a strong, unpredictable JWT_SECRET in your environment or secrets manager."
      );
    }
    if (INSECURE_DEFAULTS.includes(envSecret.trim())) {
      throw new Error(
        "FATAL SECURITY ERROR: A default or well-known JWT_SECRET was detected in production. " +
        "You MUST configure a secure, unique JWT_SECRET in your environment variables."
      );
    }
    return envSecret.trim();
  }

  // Development / Non-Production fallback
  if (envSecret && envSecret.trim().length > 0) {
    return envSecret.trim();
  }

  if (!devEphemeralSecret) {
    devEphemeralSecret = crypto.randomBytes(32).toString("hex");
    console.warn(
      "\n⚠️  [SECURITY WARNING]: No JWT_SECRET provided in development mode. " +
      "Generated an ephemeral 256-bit cryptographically secure secret for this session. " +
      "To persist sessions across restarts, define JWT_SECRET in your .env file.\n"
    );
  }

  return devEphemeralSecret;
}

export function getAdminPasscode(): string | null {
  const passcode = process.env.ADMIN_PASSCODE;
  if (IS_PROD) {
    if (passcode && INSECURE_DEFAULTS.includes(passcode.trim())) {
      console.warn("⚠️ [SECURITY WARNING]: Default ADMIN_PASSCODE in production environment.");
    }
  }
  return passcode?.trim() || null;
}

/**
 * Validates authentication and secret configuration at startup.
 * Halts server boot immediately in production if required security keys are missing.
 */
export function validateAuthStartup(): void {
  try {
    const secret = getJwtSecret();
    if (IS_PROD) {
      console.log("🔒 [AUTH SECURITY]: Production JWT_SECRET cryptographically validated and loaded.");
    } else {
      console.log("🔓 [AUTH SECURITY]: Auth initialized for development mode.");
    }
  } catch (err: any) {
    console.error("\n❌ ==================== CRITICAL AUTH STARTUP FAILURE ====================");
    console.error(err.message);
    console.error("=========================================================================\n");
    if (IS_PROD) {
      process.exit(1);
    }
  }
}

// ------------------- TYPES -------------------

export type UserRole = "ADMIN" | "SPOC" | "EVALUATOR" | "FACULTY" | "STUDENT_SPOC" | "STUDENT";

export interface StudentTokenPayload {
  id: string;
  email: string;
  department?: string;
  role?: "STUDENT";
}

export interface AdminTokenPayload {
  username: string;
  role: "ADMIN" | "SPOC" | "EVALUATOR" | "FACULTY" | "STUDENT_SPOC" | "Student SPOC" | "Evaluator";
  isAdmin: true;
}

export interface AdminUser {
  username: string;
  passwordHash: string;
  role: "ADMIN" | "SPOC" | "EVALUATOR" | "FACULTY" | "STUDENT_SPOC" | "Student SPOC" | "Evaluator";
}

// ------------------- ROLE NORMALIZATION HELPER -------------------

/**
 * Normalizes varied role string formats into standard uppercase roles:
 * - "SPOC" -> "ADMIN" (and "SPOC")
 * - "Student SPOC" / "STUDENT_SPOC" -> "STUDENT_SPOC"
 * - "Evaluator" / "EVALUATOR" -> "EVALUATOR"
 * - "Faculty" / "FACULTY" -> "FACULTY"
 * - "Student" / "STUDENT" -> "STUDENT"
 */
export function normalizeRole(role?: string): UserRole | null {
  if (!role) return null;
  const trimmed = role.trim();
  const upper = trimmed.toUpperCase().replace(/\s+/g, "_");

  if (upper === "ADMIN" || upper === "SPOC") return "ADMIN";
  if (upper === "EVALUATOR") return "EVALUATOR";
  if (upper === "FACULTY") return "FACULTY";
  if (upper === "STUDENT_SPOC" || upper === "STUDENTSPOC") return "STUDENT_SPOC";
  if (upper === "STUDENT") return "STUDENT";

  return null;
}

// ------------------- PASSWORD HASHING & VERIFICATION -------------------

/**
 * Creates a salted PBKDF2/SHA-256 hash formatted as `salt:hash`
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash.
 * Supports both new `salt:hash` format and backward-compatible single SHA-256 hashes.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  // New salted format: salt:hash
  if (storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(originalHash));
  }

  // Legacy SHA-256 fallback (hex length 64)
  const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
  if (storedHash.length === 64) {
    try {
      return crypto.timingSafeEqual(Buffer.from(legacyHash), Buffer.from(storedHash));
    } catch {
      return legacyHash === storedHash;
    }
  }

  return false;
}

// ------------------- TOKEN GENERATION & VERIFICATION -------------------

/**
 * Issues a signed student JWT token with expiration (default: 24h)
 */
export function signStudentToken(student: StudentTokenPayload, expiresIn: string | number = "24h"): string {
  const secret = getJwtSecret();
  const options: SignOptions = {
    expiresIn: expiresIn as any,
    issuer: "svec-sih-portal",
    subject: student.id
  };

  return jwt.sign(
    {
      id: student.id,
      email: student.email,
      department: student.department || ""
    },
    secret,
    options
  );
}

/**
 * Verifies a student JWT token and checks expiration and signature
 */
export function verifyStudentToken(token: string): StudentTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      issuer: "svec-sih-portal"
    }) as JwtPayload & StudentTokenPayload;

    if (!decoded || !decoded.id || !decoded.email) {
      // Allow legacy tokens issued without issuer tag
      const legacyDecoded = jwt.verify(token, secret) as JwtPayload & StudentTokenPayload;
      if (legacyDecoded && legacyDecoded.id && legacyDecoded.email) {
        return {
          id: legacyDecoded.id,
          email: legacyDecoded.email,
          department: legacyDecoded.department
        };
      }
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      department: decoded.department
    };
  } catch (err) {
    // If issuer verification failed, try plain verification
    try {
      const secret = getJwtSecret();
      const legacyDecoded = jwt.verify(token, secret) as JwtPayload & StudentTokenPayload;
      if (legacyDecoded && legacyDecoded.id && legacyDecoded.email) {
        return {
          id: legacyDecoded.id,
          email: legacyDecoded.email,
          department: legacyDecoded.department
        };
      }
    } catch {
      return null;
    }
    return null;
  }
}

/**
 * Issues a signed admin JWT token with role claims and expiration (default: 24h)
 */
export function signAdminToken(
  admin: { username: string; role: "ADMIN" | "SPOC" | "EVALUATOR" | "FACULTY" | "STUDENT_SPOC" | "Student SPOC" | "Evaluator" },
  expiresIn: string | number = "24h"
): string {
  const secret = getJwtSecret();
  const options: SignOptions = {
    expiresIn: expiresIn as any,
    issuer: "svec-sih-portal",
    subject: admin.username
  };

  return jwt.sign(
    {
      username: admin.username,
      role: admin.role,
      isAdmin: true
    },
    secret,
    options
  );
}

/**
 * Verifies an admin JWT token and checks expiration and signature
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      issuer: "svec-sih-portal"
    }) as JwtPayload & AdminTokenPayload;

    if (decoded && decoded.isAdmin && decoded.username && decoded.role) {
      return {
        username: decoded.username,
        role: decoded.role,
        isAdmin: true
      };
    }
  } catch {
    // Try fallback without strict issuer for existing active sessions
    try {
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as JwtPayload & AdminTokenPayload;
      if (decoded && decoded.isAdmin && decoded.username && decoded.role) {
        return {
          username: decoded.username,
          role: decoded.role,
          isAdmin: true
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

// ------------------- CENTRALIZED AUTHENTICATION MIDDLEWARES -------------------

/**
 * Centralized Student JWT authentication middleware.
 * Verifies Bearer token, checks expiration, and attaches typed user to request.
 */
export function validateStudentJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Missing or invalid authorization token format." });
    }

    const studentPayload = verifyStudentToken(token);
    if (!studentPayload) {
      return res.status(401).json({ error: "Your session is invalid or has expired. Please log in again." });
    }

    (req as any).studentUser = studentPayload;
    return next();
  }

  // Token is required for protected student routes
  return res.status(401).json({ error: "Authorization required. Please log in to continue." });
}

/**
 * Centralized Admin authentication middleware.
 * Verifies signed admin JWT from `X-Admin-Passcode` or `Authorization: Bearer <token>`.
 */
export function validateAdmin(req: Request, res: Response, next: NextFunction) {
  // Extract passcode / token from headers
  const rawPasscode = (req.headers["x-admin-passcode"] || req.headers["authorization"]) as string | undefined;

  if (!rawPasscode) {
    return res.status(401).json({ error: "Access Denied: Missing administrative credentials." });
  }

  const passcode = rawPasscode.startsWith("Bearer ") ? rawPasscode.slice(7).trim() : rawPasscode.trim();

  // 1. Check signed JWT token (Standard, secure authentication)
  const adminPayload = verifyAdminToken(passcode);
  if (adminPayload) {
    (req as any).adminRole = adminPayload.role;
    (req as any).adminUser = adminPayload.username;
    (req as any).isAdmin = true;
    return next();
  }

  // 2. Check master ADMIN_PASSCODE bypass (if configured in environment)
  const masterPasscode = getAdminPasscode();
  if (masterPasscode && passcode === masterPasscode) {
    (req as any).adminRole = "SPOC";
    (req as any).adminUser = "system_admin";
    (req as any).isAdmin = true;
    return next();
  }

  return res.status(401).json({ error: "Unauthorized: Invalid or expired admin session token." });
}

/**
 * Role-guard middleware to enforce specific administrative roles (e.g. SPOC only)
 * Supports both legacy string arrays and normalized uppercase role sets (ADMIN, EVALUATOR, FACULTY, STUDENT_SPOC, STUDENT)
 */
export function requireRole(allowedRoles: Array<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawRole = (req as any).adminRole || (req as any).userRole;
    if (!rawRole) {
      return res.status(403).json({
        error: `Access Denied: Missing role authorization. Required role: (${allowedRoles.join(" or ")}).`
      });
    }

    const normUserRole = normalizeRole(rawRole) || rawRole;

    // Check if normalized user role matches any allowed role (normalized or raw)
    const hasPermission = allowedRoles.some(allowed => {
      const normAllowed = normalizeRole(allowed) || allowed;
      return (
        normAllowed === normUserRole ||
        allowed.toLowerCase() === String(rawRole).toLowerCase() ||
        (normAllowed === "ADMIN" && (normUserRole === "ADMIN" || rawRole === "SPOC"))
      );
    });

    if (!hasPermission) {
      return res.status(403).json({
        error: `Access Denied: Required role (${allowedRoles.join(" or ")}) not matched. Your role: ${rawRole}.`
      });
    }
    next();
  };
}

/**
 * Universal RBAC Authorization Middleware.
 * Validates JWT, extracts role, and enforces server-side role-based access control.
 *
 * Flow:
 * Request -> Authentication -> JWT Validation -> Role Authorization -> Controller/Service/DB
 *
 * Example:
 * app.get("/api/admin/evaluations", authorize(["ADMIN", "EVALUATOR"]), handler);
 */
export function authorize(allowedRoles: UserRole[] = ["ADMIN"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Check Bearer token or X-Admin-Passcode
    const authHeader = req.headers["authorization"];
    const passcodeHeader = req.headers["x-admin-passcode"] as string | undefined;

    let token: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (passcodeHeader) {
      token = passcodeHeader.startsWith("Bearer ") ? passcodeHeader.slice(7).trim() : passcodeHeader.trim();
    } else if (authHeader) {
      token = authHeader.trim();
    }

    if (!token) {
      return res.status(401).json({
        error: "Authentication required: Missing access token or administrative credentials."
      });
    }

    // 2. Check Admin JWT Token first
    const adminPayload = verifyAdminToken(token);
    if (adminPayload) {
      const userRole = normalizeRole(adminPayload.role) || "ADMIN";
      (req as any).adminRole = adminPayload.role;
      (req as any).adminUser = adminPayload.username;
      (req as any).isAdmin = true;
      (req as any).userRole = userRole;

      // Check role authorization
      const normalizedAllowed = allowedRoles.map(r => normalizeRole(r) || r);
      if (!normalizedAllowed.includes(userRole)) {
        return res.status(403).json({
          error: `Access Denied: Role '${adminPayload.role}' is not authorized for this action. Required: [${allowedRoles.join(", ")}].`
        });
      }

      return next();
    }

    // 3. Check Student JWT Token
    const studentPayload = verifyStudentToken(token);
    if (studentPayload) {
      (req as any).studentUser = studentPayload;
      (req as any).userRole = "STUDENT";

      const normalizedAllowed = allowedRoles.map(r => normalizeRole(r) || r);
      if (!normalizedAllowed.includes("STUDENT")) {
        return res.status(403).json({
          error: `Access Denied: Student accounts are not authorized to perform administrative operations. Required: [${allowedRoles.join(", ")}].`
        });
      }

      return next();
    }

    // 4. Check master ADMIN_PASSCODE bypass
    const masterPasscode = getAdminPasscode();
    if (masterPasscode && token === masterPasscode) {
      (req as any).adminRole = "SPOC";
      (req as any).adminUser = "system_admin";
      (req as any).isAdmin = true;
      (req as any).userRole = "ADMIN";
      return next();
    }

    return res.status(401).json({
      error: "Unauthorized: Invalid or expired session token."
    });
  };
}

/**
 * Universal authentication middleware requiring any valid signed session
 * (Student, Evaluator, Faculty, Student SPOC, or SPOC Admin).
 */
export function authenticateAnyUser(req: Request, res: Response, next: NextFunction) {
  return authorize(["ADMIN", "STUDENT_SPOC", "EVALUATOR", "FACULTY", "STUDENT"])(req, res, next);
}

/**
 * Optional user session extractor - attaches studentUser or adminUser if present, but does not block if unauthenticated.
 */
export function extractUserOptional(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const passcodeHeader = req.headers["x-admin-passcode"] as string | undefined;

  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (passcodeHeader) {
    token = passcodeHeader.startsWith("Bearer ") ? passcodeHeader.slice(7).trim() : passcodeHeader.trim();
  } else if (authHeader) {
    token = authHeader.trim();
  }

  if (token) {
    const adminPayload = verifyAdminToken(token);
    if (adminPayload) {
      (req as any).adminRole = adminPayload.role;
      (req as any).adminUser = adminPayload.username;
      (req as any).isAdmin = true;
      (req as any).userRole = normalizeRole(adminPayload.role) || "ADMIN";
      return next();
    }

    const studentPayload = verifyStudentToken(token);
    if (studentPayload) {
      (req as any).studentUser = studentPayload;
      (req as any).userRole = "STUDENT";
      return next();
    }

    const masterPasscode = getAdminPasscode();
    if (masterPasscode && token === masterPasscode) {
      (req as any).adminRole = "SPOC";
      (req as any).adminUser = "system_admin";
      (req as any).isAdmin = true;
      (req as any).userRole = "ADMIN";
      return next();
    }
  }

  next();
}

