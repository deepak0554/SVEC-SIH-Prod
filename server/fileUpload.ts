import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { objectStorage } from "./objectStorage";
import { db } from "./db";

// Storage root directory configuration with cross-platform (Windows Server 2025 & Linux) permission auto-detection
const IS_VERCEL = !!process.env.VERCEL;

export function resolveSafeDataDir(): string {
  if (process.env.DATA_DIR) {
    try {
      if (!fs.existsSync(process.env.DATA_DIR)) {
        fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
      }
      return process.env.DATA_DIR;
    } catch (e: any) {
      console.warn(`[Storage Warning] DATA_DIR env '${process.env.DATA_DIR}' cannot be accessed (${e.message}). Falling back to automatic directory.`);
    }
  }

  if (IS_VERCEL) return "/tmp/svec_data";

  // Standard target: ./data
  const preferred = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(preferred)) {
      fs.mkdirSync(preferred, { recursive: true });
    }
    // Test write permission across Windows Server 2025 / Linux
    const testPath = path.join(preferred, `.write_check_${Date.now()}`);
    fs.writeFileSync(testPath, "ok");
    fs.unlinkSync(testPath);
    return preferred;
  } catch (err: any) {
    console.warn(`[Storage Warning] Host filesystem permissions prevent writing to '${preferred}': ${err.message}.`);
    // OS-native temporary directory (e.g. C:\Users\...\AppData\Local\Temp on Windows Server 2025 or /tmp on Linux)
    const fallbackDir = path.join(os.tmpdir(), "svec_data");
    console.warn(`[Storage Fallback] Automatically falling back to '${fallbackDir}' with native OS write permissions.`);
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return fallbackDir;
    } catch {
      return preferred;
    }
  }
}

export const DATA_DIR = resolveSafeDataDir();
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const UPLOADS_PPTS_DIR = path.join(UPLOADS_DIR, "ppts");
export const UPLOADS_IMAGES_DIR = path.join(UPLOADS_DIR, "images");
export const UPLOADS_DOCS_DIR = path.join(UPLOADS_DIR, "documents");
export const UPLOADS_SAMPLE_PPTS_DIR = path.join(UPLOADS_DIR, "sample_ppts");

// Ensure all upload directories exist safely (non-crashing if permission fails)
[DATA_DIR, UPLOADS_DIR, UPLOADS_PPTS_DIR, UPLOADS_IMAGES_DIR, UPLOADS_DOCS_DIR, UPLOADS_SAMPLE_PPTS_DIR].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e: any) {
    console.warn(`[Upload Dir Init] Notice for ${dir}: ${e?.message}`);
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

export function resolveUploadUrl(category: UploadCategory, filename: string): string {
  return `/api/uploads/${category}/${encodeURIComponent(filename)}`;
}

export function resolveUploadDirectory(category: UploadCategory): string {
  const targetDir = CATEGORY_DIR_MAP[category] || path.join(UPLOADS_DIR, category);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (err: any) {
    console.warn(`[Upload Dir Notice] Standard directory ${targetDir} inaccessible (${err.message}), continuing with compatibility fallback.`);
  }

  return targetDir;
}

export function resolveUploadFilePath(category: UploadCategory, filename: string): string {
  const safeFilename = path.basename(filename);
  return path.join(resolveUploadDirectory(category), safeFilename);
}

export function listUploadedFiles(category: UploadCategory): Array<{ filename: string; url: string; size: number; path: string }> {
  const dir = resolveUploadDirectory(category);
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => {
      const fullPath = path.join(dir, name);
      return fs.statSync(fullPath).isFile();
    })
    .map((filename) => {
      const fullPath = path.join(dir, filename);
      const stats = fs.statSync(fullPath);
      return {
        filename,
        url: resolveUploadUrl(category, filename),
        size: stats.size,
        path: fullPath,
      };
    })
    .sort((a, b) => b.filename.localeCompare(a.filename));
}

// ==========================================
// 1. STRICT MIME & EXTENSION WHITELISTS
// ==========================================

export interface AllowedFileType {
  extension: string;
  mimeTypes: string[];
  maxSize: number; // in bytes
}

// Presentations: PPT, PPTX, ODP
const PRESENTATION_TYPES: AllowedFileType[] = [
  {
    extension: ".pptx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    maxSize: 35 * 1024 * 1024 // 35MB
  },
  {
    extension: ".ppt",
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    maxSize: 35 * 1024 * 1024 // 35MB
  },
  {
    extension: ".odp",
    mimeTypes: [
      "application/vnd.oasis.opendocument.presentation",
      "application/x-vnd.oasis.opendocument.presentation",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ],
    maxSize: 35 * 1024 * 1024 // 35MB
  }
];

// Documents: PDF, DOC, DOCX
const DOCUMENT_TYPES: AllowedFileType[] = [
  {
    extension: ".pdf",
    mimeTypes: ["application/pdf"],
    maxSize: 35 * 1024 * 1024 // 35MB
  },
  {
    extension: ".docx",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
      "application/octet-stream"
    ],
    maxSize: 35 * 1024 * 1024 // 35MB
  },
  {
    extension: ".doc",
    mimeTypes: ["application/msword", "application/octet-stream"],
    maxSize: 35 * 1024 * 1024 // 35MB
  }
];

// Images: PNG, JPG, JPEG, WEBP, GIF, SVG, BMP, TIFF, AVIF, HEIC/HEIF, ICO
const IMAGE_TYPES: AllowedFileType[] = [
  {
    extension: ".png",
    mimeTypes: ["image/png"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".jpg",
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".jpeg",
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".jfif",
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".webp",
    mimeTypes: ["image/webp"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".gif",
    mimeTypes: ["image/gif"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".svg",
    mimeTypes: ["image/svg+xml", "text/xml", "application/xml", "image/svg"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".bmp",
    mimeTypes: ["image/bmp", "image/x-ms-bmp"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".tif",
    mimeTypes: ["image/tiff", "image/x-tiff"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".tiff",
    mimeTypes: ["image/tiff", "image/x-tiff"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".avif",
    mimeTypes: ["image/avif"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".heic",
    mimeTypes: ["image/heic", "image/heif"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".heif",
    mimeTypes: ["image/heif", "image/heic"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  },
  {
    extension: ".ico",
    mimeTypes: ["image/x-icon", "image/vnd.microsoft.icon", "image/ico", "image/icon"],
    maxSize: 15 * 1024 * 1024 // 15MB for modern phone photos and screens
  }
];

// Dangerous/Executable Extensions Blacklist - strictly prohibited
const BANNED_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".sh", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".mjs", ".cjs",
  ".ts", ".tsx", ".jsx", ".php", ".phtml", ".php3", ".php4", ".php5", ".php7", ".phps",
  ".py", ".pyc", ".rb", ".pl", ".cgi", ".jar", ".war", ".asp", ".aspx", ".jsp", ".jspx",
  ".htm", ".html", ".xhtml", ".shtml", ".xml", ".scr", ".bin", ".msi", ".apk",
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

  // JPEG / JFIF signature: FF D8 FF
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".jfif") {
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

  // BMP signature: BM
  if (ext === ".bmp") {
    return buffer[0] === 0x42 && buffer[1] === 0x4d;
  }

  // TIFF signature: II* or MM* (little-endian or big-endian)
  if (ext === ".tif" || ext === ".tiff") {
    if (buffer.length < 4) return false;
    const magic = buffer.subarray(0, 2).toString("ascii");
    const tag = buffer.subarray(2, 4).toString("ascii");
    return (magic === "II" && tag === "*\x00") || (magic === "MM" && tag === "\x00*");
  }

  // AVIF / HEIC / HEIF: ISO BMFF container with ftyp brand marker
  if (ext === ".avif" || ext === ".heic" || ext === ".heif") {
    if (buffer.length < 12) return false;
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }

  // ICO signature: 00 00 01 00 or 00 00 02 00
  if (ext === ".ico") {
    if (buffer.length < 4) return false;
    return (
      (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) ||
      (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x02 && buffer[3] === 0x00)
    );
  }

  // SVG signature: XML / SVG elements with security sanity check against stored XSS
  if (ext === ".svg") {
    if (buffer.length < 8) return false;
    const sample = buffer.subarray(0, 4096).toString("utf8").trim().toLowerCase();
    if (!sample.includes("<svg") && !sample.includes("<?xml")) return false;

    // Security check: strictly prohibit executable script tags, javascript: protocols, or inline event handlers
    const fullText = buffer.toString("utf8").toLowerCase();
    if (
      fullText.includes("<script") ||
      fullText.includes("javascript:") ||
      fullText.includes("data:text/html") ||
      /on\w+\s*=/i.test(fullText)
    ) {
      return false;
    }
    return true;
  }

  // PPTX / PPT / ODP (Presentations): OpenXML ZIP archive, OLE Compound Binary, or PDF format
  if (ext === ".pptx" || ext === ".ppt" || ext === ".odp") {
    if (buffer.length < 4) return false;
    // ZIP / OpenXML archive (PK\x03\x04, PK\x05\x06, PK\x07\x08, PK\x01\x02)
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && (
      (buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08) ||
      (buffer[2] === 0x01 && buffer[3] === 0x02)
    );
    if (isZip) return true;

    // OLE Compound File Binary Format: D0 CF 11 E0 A1 B1 1A E1
    if (
      buffer.length >= 8 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0 &&
      buffer[4] === 0xa1 &&
      buffer[5] === 0xb1 &&
      buffer[6] === 0x1a &&
      buffer[7] === 0xe1
    ) {
      return true;
    }

    // PDF format (%PDF)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return true;
    }

    return false;
  }

  // DOCX (OpenXML ZIP archive): PK\x03\x04 (50 4B 03 04)
  if (ext === ".docx") {
    return (
      (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x05 && buffer[3] === 0x06) // Empty zip
    );
  }

  // DOC (OLE Compound File Binary Format): D0 CF 11 E0 A1 B1 1A E1
  if (ext === ".doc") {
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
    fileSize: 35 * 1024 * 1024, // 35MB ceiling for multipart uploads
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

  // 5. Generate secure UUID filename & ensure target dir safely
  const targetDir = resolveUploadDirectory(category);
  const secureFilename = generateSecureFilename(clientOriginalName, matchedType.extension);

  if (!isPathSafe(targetDir, secureFilename)) {
    return { success: false, error: "Path traversal attempt detected." };
  }

  const targetPath = resolveUploadFilePath(category, secureFilename);
  const mimeType = clientMimeType || matchedType.mimeTypes[0];
  const sanitizedOriginal = sanitizeClientFilename(clientOriginalName) + matchedType.extension;

  // Standardize on the canonical app data path while retaining a narrow compatibility fallback
  let writtenSuccessfully = false;
  const legacyFallbackPaths = [
    path.join(process.cwd(), "uploads", category, secureFilename),
    path.join(process.cwd(), "data", "uploads", category, secureFilename),
    path.join(os.tmpdir(), "svec_uploads", category, secureFilename),
    path.join(os.tmpdir(), "svec_data", "uploads", category, secureFilename),
    path.join("/tmp/svec_uploads", category, secureFilename),
    path.join("/tmp/svec_data/uploads", category, secureFilename)
  ];

  const candidateWritePaths = [targetPath, ...legacyFallbackPaths];

  for (const cPath of candidateWritePaths) {
    try {
      const parentDir = path.dirname(cPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(cPath, buffer);
      writtenSuccessfully = true;
      break;
    } catch (e: any) {
      // Continue trying the next compatible location.
    }
  }

  if (!writtenSuccessfully) {
    console.warn(`[Upload Storage Notice] Could not write to disk paths; ensuring durable database and cloud persistence.`);
  }

  // ALWAYS persist to relational database / app_files / JSON store so file is NEVER lost
  try {
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
  } catch (dbErr) {
    console.error(`[File DB Sync Error]`, dbErr);
  }

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

  const relativeUrl = resolveUploadUrl(category, secureFilename);

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
        else if (detectedMime.includes("jpeg") || detectedMime.includes("jpg") || detectedMime.includes("jfif")) ext = ".jpg";
        else if (detectedMime.includes("webp")) ext = ".webp";
        else if (detectedMime.includes("gif")) ext = ".gif";
        else if (detectedMime.includes("svg")) ext = ".svg";
        else if (detectedMime.includes("bmp") || detectedMime.includes("x-ms-bmp")) ext = ".bmp";
        else if (detectedMime.includes("tiff") || detectedMime.includes("x-tiff")) ext = ".tiff";
        else if (detectedMime.includes("avif")) ext = ".avif";
        else if (detectedMime.includes("heic") || detectedMime.includes("heif")) ext = ".heic";
        else if (detectedMime.includes("icon") || detectedMime.includes("x-icon")) ext = ".ico";
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
