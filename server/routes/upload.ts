import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { extractUserOptional } from "../auth";
import {
  upload,
  validateAndSaveFile,
  saveBase64Securely,
  isPathSafe,
  resolveUploadDirectory,
  resolveUploadFilePath,
  listUploadedFiles,
  type UploadCategory,
} from "../fileUpload";

export interface UploadRouteDeps {
  readRegistrations: () => any[];
  writeRegistrations: (registrations: any[]) => void;
  readSettings: () => any;
  writeSettings: (settings: any) => void;
  syncRegistrationToExternalDB?: (registration: any) => Promise<{ success: boolean; error?: string }> | Promise<void>;
}

export function registerUploadRoutes(app: express.Express, deps: UploadRouteDeps) {
  const router = express.Router();

  router.post(
    "/upload",
    extractUserOptional,
    upload.single("file"),
    (req: Request, res: Response) => {
      if (req.file) {
        const rawCategory = (req.body.category as UploadCategory) || "documents";
        const validCategories: UploadCategory[] = [
          "ppts",
          "images",
          "documents",
          "sample_ppts",
          "abstracts",
          "gallery",
          "homepage",
          "logos",
          "certificates",
          "media",
          "payment_proofs",
          "upi_qr",
        ];
        const validCategory: UploadCategory = validCategories.includes(rawCategory) ? rawCategory : "documents";

        const isAdmin = (req as any).isAdmin || (req as any).adminRole;
        if (["sample_ppts", "certificates", "upi_qr"].includes(validCategory) && !isAdmin) {
          return res.status(403).json({
            error: "Access Denied: Only administrators can upload official templates, certificates, and payment QR codes.",
          });
        }

        const isAuth = (req as any).studentUser || (req as any).adminUser || (req as any).isAdmin;
        if (["ppts", "documents", "abstracts", "media"].includes(validCategory) && !isAuth) {
          return res.status(401).json({
            error: "Authentication required to upload proposals or project documents.",
          });
        }

        const saveResult = validateAndSaveFile({
          buffer: req.file.buffer,
          clientOriginalName: req.file.originalname,
          clientMimeType: req.file.mimetype,
          category: validCategory,
        });

        if (!saveResult.success) {
          return res.status(400).json({ error: saveResult.error });
        }

        return res.json({ success: true, ...saveResult.file });
      }

      if (req.body && req.body.data) {
        const { data, category, filename } = req.body;
        const validCategories: UploadCategory[] = [
          "ppts",
          "images",
          "documents",
          "sample_ppts",
          "abstracts",
          "gallery",
          "homepage",
          "logos",
          "certificates",
          "media",
        ];
        const rawCat = (category as UploadCategory) || "documents";
        const validCategory: UploadCategory = validCategories.includes(rawCat) ? rawCat : "documents";

        const isAdmin = (req as any).isAdmin || (req as any).adminRole;
        if (["sample_ppts", "certificates"].includes(validCategory) && !isAdmin) {
          return res.status(403).json({
            error: "Access Denied: Only administrators can upload official templates and certificates.",
          });
        }

        const saveResult = saveBase64Securely(data, validCategory, filename);
        if (!saveResult) {
          return res.status(400).json({ error: "Failed to process file. Signature mismatch or unsupported file type." });
        }

        return res.json({ success: true, ...saveResult });
      }

      return res.status(400).json({
        error: "No file provided. Please send multipart/form-data with the 'file' field.",
      });
    }
  );

  router.get("/uploads/list", extractUserOptional, (req: Request, res: Response) => {
    const rawCategory = (req.query.category as string) || "images";
    const validCategories: UploadCategory[] = [
      "ppts",
      "images",
      "documents",
      "sample_ppts",
      "abstracts",
      "gallery",
      "homepage",
      "logos",
      "certificates",
      "media",
      "payment_proofs",
      "upi_qr",
    ];

    const category = validCategories.includes(rawCategory as UploadCategory) ? (rawCategory as UploadCategory) : "images";
    const files = listUploadedFiles(category).map((file) => ({
      filename: file.filename,
      url: file.url,
      size: file.size,
    }));

    return res.json({ success: true, category, files });
  });

  router.delete("/uploads/:category/:filename", extractUserOptional, async (req: Request, res: Response) => {
    const { category, filename } = req.params;
    const validCategories: UploadCategory[] = [
      "ppts",
      "images",
      "documents",
      "sample_ppts",
      "abstracts",
      "gallery",
      "homepage",
      "logos",
      "certificates",
      "media",
      "payment_proofs",
      "upi_qr",
    ];

    if (!validCategories.includes(category as UploadCategory)) {
      return res.status(400).json({ success: false, error: "Invalid upload category." });
    }

    const isAdmin = Boolean((req as any).isAdmin || (req as any).adminRole || (req as any).adminUser);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Admin access required to delete uploaded media." });
    }

    const cleanFilename = path.basename(filename);
    const targetDir = resolveUploadDirectory(category as UploadCategory);
    const filePath = path.join(targetDir, cleanFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File not found." });
    }

    try {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: "Uploaded media deleted successfully." });
    } catch (error: any) {
      console.error("Upload delete failed:", error);
      return res.status(500).json({ success: false, error: error.message || "Failed to delete uploaded media." });
    }
  });

  router.post(
    "/test/upload-image-url",
    extractUserOptional,
    upload.single("file"),
    async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({
          error: "No file provided. Please send multipart/form-data with the 'file' field.",
        });
      }

      const saveResult = validateAndSaveFile({
        buffer: req.file.buffer,
        clientOriginalName: req.file.originalname,
        clientMimeType: req.file.mimetype,
        category: "images",
      });

      if (!saveResult.success) {
        return res.status(400).json({ error: saveResult.error });
      }

      const storedPath = resolveUploadFilePath("images", saveResult.file.filename);
      const existsOnDisk = fs.existsSync(storedPath);
      const absoluteUrl = `http://127.0.0.1:${process.env.PORT || 3000}${saveResult.file.url}`;

      try {
        const probe = await fetch(absoluteUrl, { method: "GET" });
        const contentType = probe.headers.get("content-type") || "";
        const isImageResponse = contentType.startsWith("image/") || saveResult.file.url.toLowerCase().endsWith(".svg");

        return res.json({
          success: true,
          file: saveResult.file,
          storedPath,
          existsOnDisk,
          absoluteUrl,
          served: {
            ok: probe.ok,
            status: probe.status,
            contentType,
            isImageResponse,
          },
        });
      } catch (error: any) {
        return res.status(500).json({
          success: false,
          error: `Upload saved, but URL probe failed: ${error.message}`,
          file: saveResult.file,
          storedPath,
          existsOnDisk,
          absoluteUrl,
        });
      }
    }
  );

  app.use("/api", router);
}
