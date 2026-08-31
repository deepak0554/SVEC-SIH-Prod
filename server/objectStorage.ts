import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { DATA_DIR, UPLOADS_DIR, CATEGORY_DIR_MAP, UploadCategory } from "./fileUpload";

export interface ObjectStorageConfig {
  driver: "s3" | "r2" | "local";
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrlPrefix?: string;
  forcePathStyle?: boolean;
}

export interface UploadResult {
  key: string;
  url: string;
  driver: "s3" | "r2" | "local";
  size: number;
  contentType: string;
}

export interface StoredObjectMetadata {
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  etag?: string;
}

/**
 * Enterprise Unified Object Storage Service
 * Handles PPT, PDF, images, certificates, and documents.
 * 
 * Supports:
 * 1. AWS S3 / Cloudflare R2 / Supabase Storage / MinIO / GCS S3 API
 * 2. Local filesystem storage (with serverless /tmp fallback and warning)
 */
export class ObjectStorageService {
  private s3Client: S3Client | null = null;
  private config: ObjectStorageConfig;
  private isCloudActive = false;

  constructor() {
    this.config = this.resolveConfig();
    this.initClient();
  }

  private resolveConfig(): ObjectStorageConfig {
    const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.R2_BUCKET;
    const region = process.env.S3_REGION || process.env.AWS_REGION || "auto";
    const endpoint = process.env.S3_ENDPOINT || process.env.R2_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
    const publicUrlPrefix = process.env.S3_PUBLIC_URL_PREFIX || process.env.R2_PUBLIC_URL_PREFIX;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true" || !!endpoint;

    const isCloud = !!(bucket && accessKeyId && secretAccessKey);

    return {
      driver: isCloud ? (endpoint?.includes("r2.cloudflarestorage.com") ? "r2" : "s3") : "local",
      bucket,
      region,
      endpoint,
      accessKeyId,
      secretAccessKey,
      publicUrlPrefix,
      forcePathStyle
    };
  }

  private initClient(): void {
    if (this.config.driver !== "local" && this.config.bucket && this.config.accessKeyId && this.config.secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region: this.config.region || "us-east-1",
          endpoint: this.config.endpoint || undefined,
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey
          },
          forcePathStyle: this.config.forcePathStyle
        });
        this.isCloudActive = true;
        console.log(`✅ [Object Storage] Initialized cloud driver (${this.config.driver.toUpperCase()}) on bucket: ${this.config.bucket}`);
      } catch (err: any) {
        console.error(`❌ [Object Storage Init Error]: ${err.message}. Falling back to local disk.`);
        this.s3Client = null;
        this.isCloudActive = false;
      }
    } else {
      this.isCloudActive = false;
      const isVercel = !!process.env.VERCEL;
      if (isVercel) {
        console.warn("⚠️ [Object Storage Warning] Running on ephemeral serverless environment (/tmp) without cloud Object Storage configured. In production, configure S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.");
      } else {
        console.log("ℹ️ [Object Storage] Using local filesystem storage adapter.");
      }
    }
  }

  public isCloud(): boolean {
    return this.isCloudActive;
  }

  public getDriver(): "s3" | "r2" | "local" {
    return this.isCloudActive ? this.config.driver : "local";
  }

  public getBucketName(): string | undefined {
    return this.config.bucket;
  }

  /**
   * Uploads binary file buffer to Object Storage (or local storage adapter).
   */
  public async upload(options: {
    category: UploadCategory;
    filename: string;
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }): Promise<UploadResult> {
    const { category, filename, buffer, contentType, metadata } = options;
    const objectKey = `${category}/${filename}`;

    if (this.isCloudActive && this.s3Client && this.config.bucket) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
          Body: buffer,
          ContentType: contentType,
          Metadata: metadata || {},
          CacheControl: "public, max-age=31536000, immutable"
        });

        await this.s3Client.send(command);

        let publicUrl: string;
        if (this.config.publicUrlPrefix) {
          const prefix = this.config.publicUrlPrefix.replace(/\/$/, "");
          publicUrl = `${prefix}/${objectKey}`;
        } else if (this.config.endpoint && !this.config.endpoint.includes("amazonaws.com")) {
          publicUrl = `/api/uploads/${category}/${filename}`;
        } else {
          publicUrl = `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${objectKey}`;
        }

        return {
          key: objectKey,
          url: publicUrl,
          driver: this.config.driver,
          size: buffer.length,
          contentType
        };
      } catch (err: any) {
        console.error(`[Object Storage Upload Error] Cloud upload failed for ${objectKey}:`, err.message);
        // Fall through to local storage fallback
      }
    }

    // Local filesystem storage fallback
    const targetDir = CATEGORY_DIR_MAP[category] || UPLOADS_DIR;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, buffer);

    return {
      key: objectKey,
      url: `/api/uploads/${category}/${filename}`,
      driver: "local",
      size: buffer.length,
      contentType
    };
  }

  /**
   * Convenience wrapper for uploading a file buffer.
   */
  public async uploadFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    category: UploadCategory = "abstracts"
  ): Promise<{ success: boolean; url?: string; key?: string; error?: string }> {
    try {
      const ext = path.extname(originalFilename) || "";
      const baseName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
      const uniqueFilename = `${baseName}_${Date.now()}${ext}`;

      const res = await this.upload({
        category,
        filename: uniqueFilename,
        buffer,
        contentType: mimeType
      });

      return { success: true, url: res.url, key: res.key };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to upload file" };
    }
  }

  /**
   * Retrieves object stream and metadata from Object Storage.
   */
  public async getObject(category: UploadCategory, filename: string): Promise<{
    stream: NodeJS.ReadableStream;
    metadata: StoredObjectMetadata;
  } | null> {
    const objectKey = `${category}/${filename}`;

    if (this.isCloudActive && this.s3Client && this.config.bucket) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey
        });

        const response = await this.s3Client.send(command);
        if (response.Body) {
          return {
            stream: response.Body as unknown as NodeJS.ReadableStream,
            metadata: {
              contentType: response.ContentType,
              contentLength: response.ContentLength,
              lastModified: response.LastModified,
              etag: response.ETag
            }
          };
        }
      } catch (err: any) {
        if (err.name !== "NoSuchKey" && err.$metadata?.httpStatusCode !== 404) {
          console.error(`[Object Storage Get Error] ${objectKey}:`, err.message);
        }
      }
    }

    // Fallback: Check local filesystem
    const targetDir = CATEGORY_DIR_MAP[category] || UPLOADS_DIR;
    const targetPath = path.join(targetDir, filename);

    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);
      const stream = fs.createReadStream(targetPath);
      return {
        stream,
        metadata: {
          contentLength: stats.size,
          lastModified: stats.mtime
        }
      };
    }

    return null;
  }

  /**
   * Deletes an object from Object Storage.
   */
  public async deleteObject(category: UploadCategory, filename: string): Promise<boolean> {
    const objectKey = `${category}/${filename}`;

    if (this.isCloudActive && this.s3Client && this.config.bucket) {
      try {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey
        }));
      } catch (err: any) {
        console.error(`[Object Storage Delete Error] ${objectKey}:`, err.message);
      }
    }

    // Delete local copy if present
    const targetDir = CATEGORY_DIR_MAP[category] || UPLOADS_DIR;
    const targetPath = path.join(targetDir, filename);
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (e) {}
    }

    return true;
  }

  /**
   * Generates a temporary presigned download URL for private files.
   */
  public async getPresignedDownloadUrl(category: UploadCategory, filename: string, expiresInSeconds: number = 3600): Promise<string | null> {
    const objectKey = `${category}/${filename}`;

    if (this.isCloudActive && this.s3Client && this.config.bucket) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey
        });
        return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
      } catch (err: any) {
        console.error(`[Object Storage Presign Error] ${objectKey}:`, err.message);
      }
    }

    return `/api/uploads/${category}/${filename}`;
  }
}

export const objectStorage = new ObjectStorageService();
