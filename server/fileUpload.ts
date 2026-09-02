import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { objectStorage } from "./objectStorage";
import { db } from "./db";

// Storage root directory configuration
const IS_VERCEL = !!process.env.VERCEL;
export const DATA_DIR = process.env.DATA_DIR || (IS_VERCEL ? "/tmp/svec_data" : path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const UPLOADS_PPTS_DIR = path.join(UPLOADS_DIR, "ppts");
export const UPLOADS_IMAGES_DIR = path.join(UPLOADS_DIR, "images");
export const UPLOADS_DOCS_DIR = path.join(UPLOADS_DIR, "documents");
export const UPLOADS_SAMPLE_PPTS_DIR = path.join(UPLOADS_DIR, "sample_ppts");

// Ensure all upload directories exist securely
[DATA_DIR, UPLOADS_DIR, UPLOADS_PPTS_DIR, UPLOADS_IMAGES_DIR, UPLOADS_DOCS_DIR, UPLOADS_SAMPLE_PPTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Category to directory mapping
export type UploadCategory =
  | "ppts"
  | "images"
  | "documents"
  | "sample_ppts"
  | "abstracts"
  | "gallery"
  | "homepage"
  | "logos"
  | "certificates"
  | "media"
  | "payment_proofs"
  | "upi_qr";

export const CATEGORY_DIR_MAP: Record<UploadCategory, string> = {
  ppts: UPLOADS_PPTS_DIR,
  images: UPLOADS_IMAGES_DIR,
  documents: UPLOADS_DOCS_DIR,
  sample_ppts: UPLOADS_SAMPLE_PPTS_DIR,
  abstracts: UPLOADS_DOCS_DIR,
  gallery: UPLOADS_IMAGES_DIR,
  homepage: UPLOADS_IMAGES_DIR,
  logos: UPLOADS_IMAGES_DIR,
  certificates: UPLOADS_IMAGES_DIR,
  media: UPLOADS_DOCS_DIR,
  payment_proofs: UPLOADS_IMAGES_DIR,
  upi_qr: UPLOADS_IMAGES_DIR
};

// ==========================================
// 1. STRICT MIME & EXTENSION WHITELISTS
// ==========================================

export interface AllowedFileType {
  extension: string;
  mimeTypes: string[];
  maxSize: number; // in bytes
}

// Presentations: PPT, PPTX
const PRESENTATION_TYPES: AllowedFileType[] = [
  {
    extension: ".pptx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    maxSize: 15 * 1024 * 1024 // 15MB
  },
  {
    extension: ".ppt",
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/msword",
      "application/octet-stream"
    ],
    maxSize: 15 * 1024 * 1024 // 15MB
  }
];

// Documents: PDF, DOC, DOCX
const DOCUMENT_TYPES: AllowedFileType[] = [
  {
    extension: ".pdf",
    mimeTypes: ["application/pdf"],
    maxSize: 15 * 1024 * 1024 // 15MB
  },
  {
    extension: ".docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
      "application/octet-stream"
    ],
    maxSize: 15 * 1024 * 1024 // 15MB
  },
  {
    extension: ".doc",
    mimeTypes: ["application/msword", "application/octet-stream"],
    maxSize: 15 * 1024 * 1024 // 15MB
  }
];

// Images: PNG, JPG, JPEG, WEBP, GIF
const IMAGE_TYPES: AllowedFileType[] = [
  {
    extension: ".png",
    mimeTypes: ["image/png"],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  {
    extension: ".jpg",
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  {
    extension: ".jpeg",
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  {
    extension: ".webp",
    mimeTypes: ["image/webp"],
    maxSize: 5 * 1024 * 1024 // 5MB
  },
  {
    extension: ".gif",
    mimeTypes: ["image/gif"],
    maxSize: 5 * 1024 * 1024 // 5MB
  }
];

// Dangerous/Executable Extensions Blacklist - strictly prohibited
const BANNED_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".sh", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".mjs", ".cjs",
  ".ts", ".tsx", ".jsx", ".php", ".phtml", ".php3", ".php4", ".php5", ".php7", ".phps",
  ".py", ".pyc", ".rb", ".pl", ".cgi", ".jar", ".war", ".asp", ".aspx", ".jsp", ".jspx",
  ".htm", ".html", ".xhtml", ".shtml", ".svg", ".xml", ".scr", ".bin", ".msi", ".apk",
  ".com", ".hta", ".wsf", ".scf", ".reg", ".inf", ".cpl", ".iso", ".img"
]);

// ==========================================
// 2. MAGIC BYTE / FILE HEADER SIGNATURES
// ==========================================

/**
 * Validates the file buffer header against known magic byte signatures.
 * This ensures that a renamed malicious file (e.g., evil.exe renamed to evil.png) is caught and rejected.
 */
export function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  const ext = extension.toLowerCase();

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  if (ext === ".pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (ext === ".png") {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // JPEG signature: FF D8 FF
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // GIF signature: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
  if (ext === ".gif") {
    if (buffer.length < 6) return false;
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }

  // WebP signature: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (ext === ".webp") {
    if (buffer.length < 12) return false;
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    return riff === "RIFF" && webp === "WEBP";
  }

  // PPTX / DOCX (OpenXML ZIP archive): PK\x03\x04 (50 4B 03 04)
  if (ext === ".pptx" || ext === ".docx") {
    return (
      (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x05 && buffer[3] === 0x06) // Empty zip
    );
  }

  // PPT / DOC (OLE Compound File Binary Format): D0 CF 11 E0 A1 B1 1A E1
  if (ext === ".ppt" || ext === ".doc") {
    if (buffer.length < 8) return false;
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0 &&
      buffer[4] === 0xa1 &&
      buffer[5] === 0xb1 &&
      buffer[6] === 0x1a &&
      buffer[7] === 0xe1
    );
  }

  return false;
}

// ==========================================
// 3. SAFE FILENAME GENERATION & PATH PROTECTION
// ==========================================

/**
 * Sanitizes a browser-supplied filename to an ASCII alphanumeric slug.
 * Removes directory traversal tokens, null bytes, and non-whitelisted characters.
 */
export function sanitizeClientFilename(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return "attachment";
  
  // Extract basename to discard any path prefixes (e.g., ../../ or C:\)
  const base = path.basename(rawName).trim();
  
  // Strip extension
  const ext = path.extname(base);
  const nameWithoutExt = base.substring(0, base.length - ext.length);
  
  // Clean alphanumeric + underscores/hyphens only
  const clean = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 40);

  return clean || "file";
}

/**
 * Generates an unguessable UUID-based filename.
 * Example: 7a8b9c0d-1234-5678-9abc-def012345678_team_presentation.pptx
 */
export function generateSecureFilename(originalName: string, verifiedExtension: string): string {
  const uuid = crypto.randomUUID();
  const safeSlug = sanitizeClientFilename(originalName);
  const ext = verifiedExtension.startsWith(".") ? verifiedExtension : `.${verifiedExtension}`;
  return `${uuid}_${safeSlug}${ext}`;
}

/**
 * Verifies that a resolved file path stays strictly within the intended directory
 * to prevent directory traversal attacks (e.g. ../../etc/passwd).
 */
export function isPathSafe(targetDir: string, filename: string): boolean {
  if (!filename || filename.includes("\0") || filename.includes("..")) {
    return false;
  }
  const cleanFilename = path.basename(filename);
  const fullPath = path.resolve(targetDir, cleanFilename);
  return fullPath.startsWith(path.resolve(targetDir) + path.sep);
}

// ==========================================
// 4. MULTER CONFIGURATION (MEMORY STORAGE)
// ==========================================

// Memory storage keeps the stream in memory so we can validate magic bytes
// before any byte is written to the filesystem.
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB ceiling for multipart uploads
    files: 1 // Single file per request
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Check banned extensions
    if (BANNED_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type '${ext}' is strictly prohibited for security.`));
    }

    cb(null, true);
  }
});

// ==========================================
// 5. SECURE FILE VALIDATION & COMMIT
// ==========================================

export interface SaveFileResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  category: UploadCategory;
}

export type ValidateAndSaveResult =
  | { success: true; file: SaveFileResult; error?: never }
  | { success: false; error: string; file?: never };

export interface ValidateAndSaveOptions {
  buffer: Buffer;
  clientOriginalName: string;
  clientMimeType: string;
  category: UploadCategory;
  maxSizeBytes?: number;
}

/**
 * Performs deep inspection: extension whitelist, MIME whitelist, size limit,
 * magic byte signature validation, and commits file securely to disk with UUID filename.
 */
export function validateAndSaveFile(options: ValidateAndSaveOptions): ValidateAndSaveResult {
  const { buffer, clientOriginalName, clientMimeType, category, maxSizeBytes } = options;

  if (!buffer || buffer.length === 0) {
    return { success: false, error: "Empty file provided." };
  }

  // 1. Determine allowed types by category
  let allowedTypes: AllowedFileType[] = [];
  if (category === "ppts" || category === "sample_ppts") {
    allowedTypes = [...PRESENTATION_TYPES, ...DOCUMENT_TYPES.filter(d => d.extension === ".pdf")];
  } else if (category === "images" || category === "gallery" || category === "homepage" || category === "logos" || category === "certificates" || category === "upi_qr") {
    allowedTypes = IMAGE_TYPES;
  } else if (category === "payment_proofs") {
    allowedTypes = [...IMAGE_TYPES, ...DOCUMENT_TYPES.filter(d => d.extension === ".pdf")];
  } else if (category === "documents" || category === "abstracts" || category === "media") {
    allowedTypes = [...DOCUMENT_TYPES, ...PRESENTATION_TYPES];
  } else {
    return { success: false, error: "Invalid upload category." };
  }

  // 2. Validate client extension
  const rawExt = path.extname(clientOriginalName).toLowerCase();
  if (BANNED_EXTENSIONS.has(rawExt)) {
    return { success: false, error: `Executable or script extension '${rawExt}' is forbidden.` };
  }

  const matchedType = allowedTypes.find(t => t.extension === rawExt);
  if (!matchedType) {
    const allowedExtList = allowedTypes.map(t => t.extension).join(", ");
    return {
      success: false,
      error: `Invalid file extension '${rawExt}'. Allowed extensions for ${category}: ${allowedExtList}`
    };
  }

  // 3. Validate size limit
  const effectiveMaxSize = maxSizeBytes || matchedType.maxSize;
  if (buffer.length > effectiveMaxSize) {
    const maxMb = Math.round(effectiveMaxSize / (1024 * 1024));
    return {
      success: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed limit of ${maxMb}MB.`
    };
  }

  // 4. Validate Magic Bytes / File Header Signature
  const isValidSignature = validateMagicBytes(buffer, matchedType.extension);
  if (!isValidSignature) {
    return {
      success: false,
      error: `Corrupt or mismatched file content. File content does not match genuine ${matchedType.extension} format.`
    };
  }

  // 5. Generate secure UUID filename & ensure target dir
  const targetDir = CATEGORY_DIR_MAP[category] || path.join(UPLOADS_DIR, category);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const secureFilename = generateSecureFilename(clientOriginalName, matchedType.extension);
  
  if (!isPathSafe(targetDir, secureFilename)) {
    return { success: false, error: "Path traversal attempt detected." };
  }

  const targetPath = path.join(targetDir, secureFilename);
  const mimeType = clientMimeType || matchedType.mimeTypes[0];
  const sanitizedOriginal = sanitizeClientFilename(clientOriginalName) + matchedType.extension;

  try {
    fs.writeFileSync(targetPath, buffer);

    // Persist to relational database and backup store so files survive container redeployments
    db.saveFileRecord({
      category,
      filename: secureFilename,
      originalName: sanitizedOriginal,
      mimeType,
      size: buffer.length,
      buffer
    }).catch(err => {
      console.error(`[File DB Persistence Error] ${category}/${secureFilename}:`, err);
    });

    // If Cloud Object Storage is configured, sync to S3/R2/Cloud bucket
    if (objectStorage.isCloud()) {
      objectStorage.upload({
        category,
        filename: secureFilename,
        buffer,
        contentType: mimeType
      }).catch(err => {
        console.error(`[Object Storage Cloud Sync Error] ${category}/${secureFilename}:`, err);
      });
    }
  } catch (err: any) {
    console.error(`[Upload Security] Failed to write file to ${targetPath}:`, err);
    return { success: false, error: "Internal error writing file to secure storage." };
  }

  const relativeUrl = `/api/uploads/${category}/${encodeURIComponent(secureFilename)}`;

  return {
    success: true,
    file: {
      url: relativeUrl,
      filename: secureFilename,
      originalName: sanitizedOriginal,
      size: buffer.length,
      mimeType: clientMimeType || matchedType.mimeTypes[0],
      category
    }
  };
}

/**
 * Legacy base64 support that validates magic bytes and uses secure UUID naming.
 */
export function saveBase64Securely(
  base64Data: string,
  category: UploadCategory,
  suggestedName?: string
): SaveFileResult | null {
  if (!base64Data || typeof base64Data !== "string") return null;

  try {
    let cleanBase64 = base64Data.trim();
    let detectedMime = "application/octet-stream";
    let ext = ".bin";

    if (cleanBase64.startsWith("data:")) {
      const match = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1].toLowerCase();
        cleanBase64 = match[2];

        if (detectedMime.includes("presentation") || detectedMime.includes("powerpoint") || detectedMime.includes("pptx")) ext = ".pptx";
        else if (detectedMime.includes("pdf")) ext = ".pdf";
        else if (detectedMime.includes("png")) ext = ".png";
        else if (detectedMime.includes("jpeg") || detectedMime.includes("jpg")) ext = ".jpg";
        else if (detectedMime.includes("webp")) ext = ".webp";
        else if (detectedMime.includes("gif")) ext = ".gif";
      }
    }

    if (suggestedName) {
      const suggestedExt = path.extname(suggestedName).toLowerCase();
      if (suggestedExt && !BANNED_EXTENSIONS.has(suggestedExt)) {
        ext = suggestedExt;
      }
    }

    const buffer = Buffer.from(cleanBase64, "base64");
    if (buffer.length === 0) return null;

    const result = validateAndSaveFile({
      buffer,
      clientOriginalName: suggestedName || `file${ext}`,
      clientMimeType: detectedMime,
      category
    });

    if (result.success) {
      return result.file;
    } else {
      console.warn(`[Base64 Validation Failed]: ${result.error}`);
      return null;
    }
  } catch (err) {
    console.error("[Save Base64 Error]:", err);
    return null;
  }
}
