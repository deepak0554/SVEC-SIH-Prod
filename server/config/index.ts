import path from "path";

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const IS_VERCEL = !!process.env.VERCEL;
export const NODE_ENV = process.env.NODE_ENV || "development";

// Upload and data directories
export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
export const UPLOADS_PPTS_DIR = path.join(UPLOADS_DIR, "ppts");
export const UPLOADS_IMAGES_DIR = path.join(UPLOADS_DIR, "images");
export const UPLOADS_DOCS_DIR = path.join(UPLOADS_DIR, "documents");
export const UPLOADS_SAMPLE_PPTS_DIR = path.join(UPLOADS_DIR, "sample_ppts");

export const MASKED_SECRET = "••••••••";
