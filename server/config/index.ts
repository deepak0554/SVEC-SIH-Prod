import "dotenv/config";
import path from "path";

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const IS_VERCEL = !!process.env.VERCEL;
export const NODE_ENV = process.env.NODE_ENV || "development";

const normalizedUploadsDir = process.env.UPLOADS_DIR?.trim();
const normalizedDataDir = process.env.DATA_DIR?.trim();

// Upload and data directories
export const DATA_DIR = normalizedDataDir || (normalizedUploadsDir ? path.dirname(normalizedUploadsDir) : path.join(process.cwd(), "data"));
export const UPLOADS_DIR = normalizedUploadsDir || path.join(DATA_DIR, "uploads");
export const UPLOADS_PPTS_DIR = path.join(UPLOADS_DIR, "ppts");
export const UPLOADS_IMAGES_DIR = path.join(UPLOADS_DIR, "images");
export const UPLOADS_DOCS_DIR = path.join(UPLOADS_DIR, "documents");
export const UPLOADS_SAMPLE_PPTS_DIR = path.join(UPLOADS_DIR, "sample_ppts");

export const MASKED_SECRET = "••••••••";
