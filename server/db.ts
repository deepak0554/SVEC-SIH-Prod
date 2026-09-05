import fs from "fs";
import path from "path";
import { 
  ProblemStatement, 
  Registration, 
  Student, 
  FeeConfig, 
  HomepageContent, 
  CustomPage, 
  MenuItem, 
  LiveUpdate,
  EvaluationCriterion
} from "../src/types";
import { AdminUser, hashPassword } from "./auth";

export interface TeamEvaluation {
  id: string;
  registrationId: string;
  evaluatorUsername: string;
  scores: Record<string, number>;
  totalScore: number;
  notes?: string;
  status: "pending" | "completed";
  evaluatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  registrationId: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed" | "refunded";
  paymentMethod?: string;
  signature?: string;
  studentEmail?: string;
  createdAt: string;
  rawResponse?: string;
}

export interface BroadcastLog {
  id: string;
  channel: "email" | "sms" | "whatsapp" | "Email" | "SMS" | "WhatsApp";
  recipient?: string;
  recipientGroup?: string;
  recipientCount?: number;
  teamName?: string;
  subject?: string;
  message?: string;
  preview?: string;
  sender?: string;
  status: "pending" | "sent" | "failed" | "completed" | "queued";
  timestamp: string;
  error?: string;
}

const IS_VERCEL = !!process.env.VERCEL;
export const DATA_DIR = process.env.DATA_DIR || (IS_VERCEL ? "/tmp/svec_data" : path.join(process.cwd(), "data"));

// Default initializers
export const defaultCriteria: EvaluationCriterion[] = [
  { id: "c1", name: "Problem Understanding & Approach", maxScore: 10, description: "Clarity of the selected SIH problem statement and innovativeness of proposed solution." },
  { id: "c2", name: "Technical Feasibility & Architecture", maxScore: 10, description: "Tech stack, system design, hardware/software specifications and viable execution steps." },
  { id: "c3", name: "Originality & Innovation", maxScore: 10, description: "Novelty, USP compared to existing solutions in market/industry." },
  { id: "c4", name: "Presentation & PPT Quality", maxScore: 10, description: "Slide clarity, workflow diagram quality, structured deliverable explanation." },
  { id: "c5", name: "Q&A and Team Coordination", maxScore: 10, description: "Defense of methodology, answer precision, member participation." }
];

export const defaultStatements: ProblemStatement[] = [
  { id: "1", code: "SIH1627", title: "Automated Crop Disease Detection & Advisory System using Drone Imaging and Edge AI", category: "Software", organization: "Ministry of Agriculture & Farmers Welfare" },
  { id: "2", code: "SIH1628", title: "Smart IoT-based Underground Pipeline Leakage & Contamination Monitoring", category: "Hardware", organization: "Ministry of Jal Shakti" },
  { id: "3", code: "SIH1629", title: "Decentralized Blockchain-Powered Academic Credential Verification System", category: "Software", organization: "AICTE / Ministry of Education" },
  { id: "4", code: "SIH1630", title: "AI-Powered Adaptive Traffic Management System for Emergency Vehicles", category: "Hardware", organization: "Ministry of Road Transport and Highways" },
  { id: "5", code: "SIH1631", title: "Autonomous Solar-Powered Marine Debris & Plastic Cleanup Rover", category: "Hardware", organization: "Ministry of Earth Sciences" },
  { id: "6", code: "SIH1632", title: "Real-Time Disaster Relief Logistics Optimization & Offline Mesh Network", category: "Software", organization: "National Disaster Management Authority (NDMA)" }
];

export const defaultHomepageContent: HomepageContent = {
  sihDetails: {
    title: "Smart India Hackathon 2026",
    description: "The Sri Vasavi Engineering College (SVEC) Internal Hackathon 2026 is the premier institutional hackathon designed to shortlist, mentor, and nominate the top innovative teams to represent SVEC at the Smart India Hackathon (SIH 2026) organized by the Ministry of Education & AICTE.",
    slogan: "Innovate for India",
    dates: "August 20, 2026 - September 15, 2026",
    bannerUrl: ""
  },
  sponsors: [],
  patrons: [
    { id: "p1", name: "Sri G. Satyanarayana", position: "President", imageUrl: "" },
    { id: "p2", name: "Sri Ch. V. V. Subba Rao", position: "Secretary", imageUrl: "" },
    { id: "p3", name: "Sri K. Venkateswara Rao", position: "Technical Director", imageUrl: "" },
    { id: "p4", name: "Dr. Ch. Rambabu", position: "Principal", imageUrl: "" }
  ],
  studentSpocs: [],
  collegeSpocs: [],
  previousPhotos: []
};

export const defaultCustomPages: CustomPage[] = [
  {
    id: "guidelines",
    title: "SIH Guidelines & Rules",
    slug: "guidelines",
    content: "<h2>Official SIH 2026 Guidelines</h2><p>Welcome to the SVEC Internal Hackathon portal. Please adhere to the team composition mandates and submission deadlines strictly.</p>",
    published: true,
    createdAt: new Date().toISOString()
  }
];

export const defaultMenuItems: MenuItem[] = [
  { id: "m1", label: "Home", type: "system", target: "home", order: 0 },
  { id: "m2", label: "Problem Statements", type: "system", target: "statements", order: 1 },
  { id: "m3", label: "Register Team", type: "system", target: "register", order: 2 },
  { id: "m4", label: "Student Login", type: "system", target: "student-portal", order: 3 },
  { id: "m5", label: "Selected Teams", type: "system", target: "selected-teams", order: 4 },
  { id: "m6", label: "FAQ & Contact", type: "system", target: "faq", order: 5 }
];

export const defaultDefaultAdmins: AdminUser[] = [
  {
    username: "Deepak0554",
    passwordHash: hashPassword("SIH@2026"),
    role: "SPOC"
  },
  {
    username: "studentspoc",
    passwordHash: hashPassword("studpassword"),
    role: "Student SPOC"
  }
];

/**
 * Production Unified PostgreSQL Database Manager
 * Serves as the Single Source of Truth for all relational and structured data.
 */
class DatabaseManager {
  private pgPool: any = null;
  private mongoClient: any = null;
  private mongoDb: any = null;
  private isInitialized = false;
  private isPostgresActive = false;
  private isMongoActive = false;
  private readonly cacheTtlMs = {
    settings: 2 * 60 * 1000,
    homepage: 5 * 60 * 1000,
    customPages: 5 * 60 * 1000,
    menuItems: 5 * 60 * 1000,
    liveUpdates: 2 * 60 * 1000,
    problemStatements: 5 * 60 * 1000,
    evaluationCriteria: 5 * 60 * 1000
  } as const;
  private readonly cache = new Map<string, { value: any; expiresAt: number }>();

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private async getCachedValue<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    const now = Date.now();

    if (existing && existing.expiresAt > now) {
      return existing.value as T;
    }

    if (existing && existing.expiresAt <= now) {
      const staleWindowMs = Math.max(ttlMs, 30000);
      if (now - existing.expiresAt < staleWindowMs) {
        void factory()
          .then((value) => {
            this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
          })
          .catch(() => {
            // Keep the stale value if the refresh fails; do not break the request flow.
          });
        return existing.value as T;
      }
    }

    const value = await factory();
    this.cache.set(key, { value, expiresAt: now + ttlMs });
    return value;
  }

  private invalidateCacheKeys(...keys: string[]): void {
    for (const key of keys) {
      this.cache.delete(key);
    }
  }

  public clearPublicCache(): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith("public:")) {
        this.cache.delete(key);
      }
    }
  }

  public isPostgres(): boolean {
    return this.isPostgresActive;
  }

  public isMongo(): boolean {
    return this.isMongoActive;
  }

  public buildMongoUri(config?: Partial<FeeConfig>): string {
    if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
    const host = (config?.dbHost || process.env.DB_HOST || "").trim();
    if (host.startsWith("mongodb://") || host.startsWith("mongodb+srv://")) {
      return host;
    }
    const port = config?.dbPort ? Number(config.dbPort) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 27017);
    const dbName = (config?.dbName || process.env.DB_NAME || "svec_sih").trim();
    const user = (config?.dbUsername || process.env.DB_USERNAME || "").trim();
    const pass = (config?.dbPassword || process.env.DB_PASSWORD || "").trim();

    if (host.includes(".mongodb.net")) {
      return user && pass
        ? `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}/${dbName}?retryWrites=true&w=majority`
        : `mongodb+srv://${host}/${dbName}?retryWrites=true&w=majority`;
    }

    if (user && pass) {
      return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host || "localhost"}:${port}/${dbName}`;
    } else if (user) {
      return `mongodb://${encodeURIComponent(user)}@${host || "localhost"}:${port}/${dbName}`;
    } else {
      return `mongodb://${host || "localhost"}:${port}/${dbName}`;
    }
  }

  public async init(config?: Partial<FeeConfig>): Promise<{ success: boolean; message: string; dbType: string }> {
    try {
      const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      const envPgHost = process.env.PG_HOST || process.env.DB_HOST;
      const envPgPort = process.env.PG_PORT || process.env.DB_PORT;
      const envPgUser = process.env.PG_USER || process.env.DB_USERNAME || process.env.DB_USER;
      const envPgPass = process.env.PG_PASSWORD || process.env.DB_PASSWORD || process.env.DB_PASS;
      const envPgDb = process.env.PG_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE;

      const rawDbType = (config?.dbType || "").toLowerCase();
      const hostInput = (config?.dbHost || "").trim();
      const isSqlExplicit = rawDbType === "sql" || rawDbType === "postgres" || rawDbType === "postgresql";
      const isMongoExplicit = !isSqlExplicit && (
        rawDbType === "mongodb" ||
        (!rawDbType && !!process.env.MONGODB_URI) ||
        hostInput.startsWith("mongodb://") ||
        hostInput.startsWith("mongodb+srv://") ||
        hostInput.includes(".mongodb.net")
      );

      // By default enable DB sync if configured or if dbEnabled is not explicitly set to false
      const isDbEnabled = config?.dbEnabled !== undefined ? config.dbEnabled : true;

      // 1. MONGODB INITIALIZATION
      if (isDbEnabled && isMongoExplicit) {
        if (hostInput.includes("supabase") || config?.dbPort === 5432 || config?.dbPort === 6543) {
          throw new Error("Specified database endpoint is a Supabase / PostgreSQL host. Please set Database Type to 'PostgreSQL / Supabase / SQL' or provide a valid MongoDB connection string.");
        }

        const { MongoClient } = await import("mongodb");
        const mongoUrl = this.buildMongoUri(config);

        if (this.mongoClient) {
          try { await this.mongoClient.close(); } catch (e) {}
          this.mongoClient = null;
          this.mongoDb = null;
        }
        if (this.pgPool) {
          try { await this.pgPool.end(); } catch (e) {}
          this.pgPool = null;
        }

        const client = new MongoClient(mongoUrl, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });

        try {
          await client.connect();
          const dbName = (config?.dbName || process.env.DB_NAME || "svec_sih").trim();
          const mongoDb = client.db(dbName || "svec_sih");
          await mongoDb.command({ ping: 1 });

          this.mongoClient = client;
          this.mongoDb = mongoDb;
          this.isMongoActive = true;
          this.isPostgresActive = false;
          this.isInitialized = true;

          await this.createMongoIndexes();
          await this.bootstrapMongoData();

          try {
            await this.syncDatabaseStateToLocalDisk();
          } catch (syncErr: any) {
            console.log("[MongoDB State Sync Notice]:", syncErr?.message || syncErr);
          }

          console.log("✅ [Database] MongoDB is active as the Single Source of Truth.");
          return { success: true, message: "MongoDB connected, indexes verified, and state synced.", dbType: "mongodb" };
        } catch (mongoErr: any) {
          try { await client.close(); } catch (e) {}
          const rawMsg = mongoErr?.message || "Could not connect to MongoDB cluster";
          const cleanMongoMsg = rawMsg
            .replace(/^MongoServerSelectionError:\s*/i, "")
            .replace(/^connect\s*/i, "")
            .replace(/.*SSL alert number \d+.*/i, "TLS/SSL negotiation rejected by host. Please verify database protocol and SSL settings.")
            .replace(/[0-9A-Fa-f]{10,}:error:[^:]+:[^:]+:[^:]+:[^:]+:\d+:[^\n]+/g, "SSL handshake error")
            .trim();
          throw new Error(`MongoDB connection notice: ${cleanMongoMsg}`);
        }
      }

      // 2. POSTGRESQL INITIALIZATION
      const isSqlConfigured = !!(
        (isDbEnabled && (isSqlExplicit || !isMongoExplicit) && (connStr || envPgHost || config?.dbHost)) ||
        connStr ||
        envPgHost
      );

      if (isSqlConfigured && !isMongoExplicit) {
        const { default: pg } = await import("pg");
        
        let initialHost = (config?.dbHost || envPgHost || "localhost").trim();
        let initialPort = config?.dbPort ? Number(config.dbPort) : (envPgPort ? Number(envPgPort) : 5432);
        let initialUser = (config?.dbUsername || envPgUser || "postgres").trim();
        let initialPass = (config?.dbPassword || envPgPass || "").trim();
        let initialDb = (config?.dbName || envPgDb || "postgres").trim();

        if (this.pgPool) {
          try { await this.pgPool.end(); } catch (e) {}
          this.pgPool = null;
        }

        const isSupabasePooler = initialHost && initialHost.includes("pooler.supabase.com");
        const isSupabaseDirect = initialHost && !isSupabasePooler && (
          /db\.([a-z0-9_-]+)\.supabase\.co/i.test(initialHost) ||
          initialHost.includes("supabase.co")
        );

        let connectedClient: any = null;
        let activePool: any = null;

        if (isSupabaseDirect) {
          // Direct db.<ref>.supabase.co host only resolves to IPv6, which is unreachable in IPv4-only container environments.
          // Directly auto-route to official Supabase IPv4 Pooler (Supavisor) across all global AWS regions concurrently.
          const match = initialHost.match(/db\.([a-z0-9_-]+)\.supabase\.co/i);
          const projectRef = match ? match[1] : initialHost.replace(/^db\./, "").replace(/\.supabase\.co$/, "");
          const tenantUser = projectRef ? (initialUser.includes(".") ? initialUser : `postgres.${projectRef}`) : initialUser;
          
          const knownRegions = [
            "ap-southeast-1", "ap-south-1", "ap-northeast-1", "ap-northeast-2", "ap-southeast-2",
            "us-east-1", "us-east-2", "us-west-1", "us-west-2",
            "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
            "ca-central-1", "sa-east-1", "me-central-1", "af-south-1"
          ];

          let authFailedError: string | null = null;
          const candidates: { host: string; port: number }[] = [];
          for (const reg of knownRegions) {
            for (const poolerPort of [6543, 5432]) {
              candidates.push({ host: `aws-0-${reg}.pooler.supabase.com`, port: poolerPort });
            }
          }

          const candidateChecks = candidates.map(async ({ host: poolerHost, port: poolerPort }) => {
            const candidatePool = new pg.Pool({
              host: poolerHost,
              port: poolerPort,
              database: initialDb || "postgres",
              user: tenantUser,
              password: initialPass,
              max: 5,
              idleTimeoutMillis: 15000,
              connectionTimeoutMillis: 3500,
              ssl: { rejectUnauthorized: false }
            });

            try {
              const client = await candidatePool.connect();
              return { poolerHost, poolerPort, pool: candidatePool, client };
            } catch (candidateErr: any) {
              await candidatePool.end().catch(() => {});
              const errMsg = candidateErr?.message || "";
              if (errMsg.includes("password authentication failed")) {
                return { poolerHost, poolerPort, authFailed: true, error: errMsg };
              }
              return null;
            }
          });

          const results = await Promise.all(candidateChecks);
          for (const res of results) {
            if (res && res.client && res.pool) {
              if (!connectedClient) {
                connectedClient = res.client;
                activePool = res.pool;
                console.log(`✅ [Database] Connected to Supabase IPv4 Pooler (${res.poolerHost}:${res.poolerPort})`);
              } else {
                res.client.release();
                await res.pool.end().catch(() => {});
              }
            } else if (res && res.authFailed && !authFailedError) {
              authFailedError = `Supabase IPv4 Pooler reached (${res.poolerHost}:${res.poolerPort}), but password authentication failed for user '${tenantUser}'. Please verify your database password in Admin Settings.`;
            }
          }

          if (authFailedError && !activePool) {
            throw new Error(authFailedError);
          }

          if (!activePool) {
            throw new Error(`Supabase project '${projectRef}' could not be resolved on standard IPv4 poolers. Please verify the project reference ID or specify the direct pooler host in Admin Settings.`);
          }
        } else {
          // Standard PostgreSQL host (non-Supabase direct)
          let poolConfig: any;
          if (connStr) {
            poolConfig = {
              connectionString: connStr,
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
              ssl: (connStr.includes("localhost") || connStr.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false }
            };
          } else {
            poolConfig = {
              host: initialHost,
              port: initialPort,
              database: initialDb,
              user: initialUser,
              password: initialPass,
              max: 20,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
              ssl: (initialHost.includes("localhost") || initialHost.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false }
            };
          }

          activePool = new pg.Pool(poolConfig);
          try {
            connectedClient = await activePool.connect();
          } catch (initialErr: any) {
            await activePool.end();
            if (initialErr?.message && (initialErr.message.includes("SSL") || initialErr.message.includes("alert"))) {
              throw new Error(`PostgreSQL SSL handshake error with ${initialHost}:${initialPort}. Please check database SSL configuration and credentials.`);
            }
            throw initialErr;
          }
        }

        if (connectedClient) {
          connectedClient.release();
        }

        this.pgPool = activePool;
        
        // Run tables creation and migrations
        await this.createPostgresTables();
        
        // Bootstrap initial baseline data if tables are empty
        await this.bootstrapPostgresData();

        this.isPostgresActive = true;
        this.isInitialized = true;

        // Synchronize and hydrate full database state (settings, designs, pages, announcements, files) to local cache
        try {
          await this.syncDatabaseStateToLocalDisk();
        } catch (syncErr: any) {
          console.warn("[Database State Sync Notice]:", syncErr.message);
        }

        console.log("✅ [Database] PostgreSQL is active as the Single Source of Truth.");
        return { success: true, message: "PostgreSQL connected and schema verified.", dbType: "sql" };
      }

      // Local storage fallback for dev/testing when no external DB credentials exist
      if (this.pgPool) {
        try { await this.pgPool.end(); } catch (e) {}
        this.pgPool = null;
      }
      if (this.mongoClient) {
        try { await this.mongoClient.close(); } catch (e) {}
        this.mongoClient = null;
        this.mongoDb = null;
      }
      this.isPostgresActive = false;
      this.isMongoActive = false;
      this.isInitialized = true;
      if (IS_VERCEL) {
        console.warn("⚠️ [Storage Warning] Running on serverless /tmp. Configure DATABASE_URL or MONGODB_URI for permanent storage.");
      } else {
        console.log("ℹ️ [Database] Running on local storage adapter.");
      }
      return { success: true, message: "Operating on local storage adapter.", dbType: "local" };
    } catch (err: any) {
      const cleanMessage = (err?.message || "Database connection notice")
        .replace(/^Database initialization failed:\s*/i, "")
        .replace(/[0-9A-Fa-f]{10,}:error:[^:]+:[^:]+:[^:]+:[^:]+:\d+:[^\n]+/g, "SSL handshake error")
        .replace(/.*SSL alert number \d+.*/i, "Database SSL negotiation error: invalid TLS/SSL handshake with host")
        .trim();
      const statusNotice = cleanMessage.includes("local storage adapter") 
        ? cleanMessage 
        : `${cleanMessage} (Operating on local storage adapter)`;
      console.log("ℹ️ [Database Notice]:", statusNotice);
      if (this.pgPool) {
        try { await this.pgPool.end(); } catch (e) {}
        this.pgPool = null;
      }
      if (this.mongoClient) {
        try { await this.mongoClient.close(); } catch (e) {}
        this.mongoClient = null;
        this.mongoDb = null;
      }
      this.isPostgresActive = false;
      this.isMongoActive = false;
      this.isInitialized = true;
      return { success: false, message: cleanMessage, dbType: "local" };
    }
  }

  // Ensure MongoDB indexes across all collections
  private async createMongoIndexes(): Promise<void> {
    if (!this.mongoDb) return;
    try {
      const regColl = this.mongoDb.collection("registrations");
      await regColl.createIndex({ id: 1 }, { unique: true });
      await regColl.createIndex({ registrationId: 1 });
      await regColl.createIndex({ submittedAt: -1 });

      const studColl = this.mongoDb.collection("students");
      await studColl.createIndex({ email: 1 }, { unique: true });

      const setColl = this.mongoDb.collection("app_settings");
      await setColl.createIndex({ id: 1 }, { unique: true });

      const fileColl = this.mongoDb.collection("app_files");
      await fileColl.createIndex({ id: 1 }, { unique: true });
      await fileColl.createIndex({ filename: 1 });

      const psColl = this.mongoDb.collection("problem_statements");
      await psColl.createIndex({ id: 1 }, { unique: true });

      const critColl = this.mongoDb.collection("evaluation_criteria");
      await critColl.createIndex({ id: 1 }, { unique: true });

      const evalColl = this.mongoDb.collection("team_evaluations");
      await evalColl.createIndex({ id: 1 }, { unique: true });
      await evalColl.createIndex({ registrationId: 1 });

      const payColl = this.mongoDb.collection("payment_transactions");
      await payColl.createIndex({ id: 1 }, { unique: true });
      await payColl.createIndex({ registrationId: 1 });

      const pageColl = this.mongoDb.collection("custom_pages");
      await pageColl.createIndex({ id: 1 }, { unique: true });
      await pageColl.createIndex({ slug: 1 });

      const menuColl = this.mongoDb.collection("menu_items");
      await menuColl.createIndex({ id: 1 }, { unique: true });

      const updateColl = this.mongoDb.collection("live_updates");
      await updateColl.createIndex({ id: 1 }, { unique: true });

      const bcastColl = this.mongoDb.collection("broadcast_logs");
      await bcastColl.createIndex({ id: 1 }, { unique: true });

      const adminColl = this.mongoDb.collection("admins");
      await adminColl.createIndex({ username: 1 }, { unique: true });
    } catch (err: any) {
      console.warn("[MongoDB Index Notice]:", err.message);
    }
  }

  // Bootstrap initial baseline data into MongoDB if collections are empty
  private async bootstrapMongoData(): Promise<void> {
    if (!this.mongoDb) return;
    try {
      // 1. Settings
      const setColl = this.mongoDb.collection("app_settings");
      const existingSettings = await setColl.findOne({ $or: [{ id: "main" }, { id: "system_settings" }, { id: "global_settings" }] });
      if (!existingSettings) {
        const localSettings = this.readLocalFile<FeeConfig>("settings.json", {} as any);
        if (localSettings && Object.keys(localSettings).length > 0) {
          await setColl.updateOne(
            { id: "main" },
            { $set: { id: "main", settings_json: JSON.stringify(localSettings), ...localSettings, updatedAt: new Date().toISOString() } },
            { upsert: true }
          );
          await setColl.updateOne(
            { id: "system_settings" },
            { $set: { id: "system_settings", settings_json: JSON.stringify(localSettings), ...localSettings, updatedAt: new Date().toISOString() } },
            { upsert: true }
          );
        }
      }

      // 2. Homepage Content
      const hpColl = this.mongoDb.collection("homepage_content");
      const existingHp = await hpColl.findOne({ id: "main" });
      if (!existingHp) {
        const localHp = this.readLocalFile<HomepageContent>("homepage_content.json", defaultHomepageContent);
        await hpColl.updateOne(
          { id: "main" },
          { $set: { id: "main", content_json: JSON.stringify(localHp), ...localHp, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }

      // 3. Problem Statements
      const psColl = this.mongoDb.collection("problem_statements");
      const countPs = await psColl.countDocuments();
      if (countPs === 0) {
        const localPs = this.readLocalFile<ProblemStatement[]>("problem_statements.json", defaultStatements);
        if (localPs.length > 0) {
          await psColl.insertMany(localPs.map((s, idx) => ({ ...s, sortOrder: idx })));
        }
      }

      // 4. Evaluation Criteria
      const critColl = this.mongoDb.collection("evaluation_criteria");
      const countCrit = await critColl.countDocuments();
      if (countCrit === 0) {
        const localCrit = this.readLocalFile<EvaluationCriterion[]>("evaluation_criteria.json", defaultCriteria);
        if (localCrit.length > 0) {
          await critColl.insertMany(localCrit.map((c, idx) => ({ ...c, sortOrder: idx })));
        }
      }

      // 5. Custom Pages
      const cpColl = this.mongoDb.collection("custom_pages");
      const countCp = await cpColl.countDocuments();
      if (countCp === 0) {
        const localCp = this.readLocalFile<CustomPage[]>("custom_pages.json", defaultCustomPages);
        if (localCp.length > 0) {
          await cpColl.insertMany(localCp);
        }
      }

      // 6. Menu Items
      const mColl = this.mongoDb.collection("menu_items");
      const countM = await mColl.countDocuments();
      if (countM === 0) {
        const localM = this.readLocalFile<MenuItem[]>("menu_items.json", defaultMenuItems);
        if (localM.length > 0) {
          await mColl.insertMany(localM);
        }
      }

      // 7. Admins
      const admColl = this.mongoDb.collection("admins");
      const countAdm = await admColl.countDocuments();
      if (countAdm === 0) {
        const localAdm = this.readLocalFile<AdminUser[]>("admins.json", defaultDefaultAdmins);
        if (localAdm.length > 0) {
          await admColl.insertMany(localAdm);
        }
      }
    } catch (err: any) {
      console.warn("[MongoDB Bootstrap Notice]:", err.message);
    }
  }

  // Create tables and execute safe idempotent migrations
  private async createPostgresTables(): Promise<void> {
    if (!this.pgPool) return;

    const safeExecute = async (query: string, label: string) => {
      try {
        await this.pgPool.query(query);
      } catch (err: any) {
        console.warn(`[DB Schema] ${label} note: ${err.message}`);
      }
    };

    const tables = [
      {
        label: "users",
        query: `CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT,
          role VARCHAR(50) DEFAULT 'student',
          name VARCHAR(255),
          mobile VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "students",
        query: `CREATE TABLE IF NOT EXISTS students (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          roll_number VARCHAR(100),
          name VARCHAR(255),
          gender VARCHAR(50),
          department VARCHAR(100),
          mobile VARCHAR(50),
          academic_year VARCHAR(50),
          created_at VARCHAR(100),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "problem_statements",
        query: `CREATE TABLE IF NOT EXISTS problem_statements (
          id VARCHAR(255) PRIMARY KEY,
          code VARCHAR(100) NOT NULL,
          title TEXT NOT NULL,
          category VARCHAR(50) NOT NULL,
          organization TEXT NOT NULL,
          description TEXT DEFAULT '',
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "teams",
        query: `CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(100) UNIQUE NOT NULL,
          team_name VARCHAR(255) NOT NULL,
          lead_student_id VARCHAR(255),
          lead_name VARCHAR(255) NOT NULL,
          lead_department VARCHAR(100) NOT NULL,
          lead_mobile VARCHAR(50) NOT NULL,
          lead_gender VARCHAR(50),
          lead_academic_year VARCHAR(50),
          has_female_member BOOLEAN DEFAULT FALSE,
          mentor_name VARCHAR(255),
          problem_statement_id VARCHAR(255),
          submitted_at VARCHAR(100),
          student_email VARCHAR(255),
          payment_status VARCHAR(50) DEFAULT 'free',
          payment_id VARCHAR(255),
          order_id VARCHAR(255),
          amount_paid NUMERIC,
          approval_status VARCHAR(50) DEFAULT 'pending',
          approval_notes TEXT,
          verified_at VARCHAR(100),
          verified_by VARCHAR(255),
          is_final_selected BOOLEAN DEFAULT FALSE,
          selection_notes TEXT,
          assigned_evaluator VARCHAR(255),
          evaluation_status VARCHAR(50) DEFAULT 'pending',
          total_score NUMERIC DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "team_members",
        query: `CREATE TABLE IF NOT EXISTS team_members (
          id VARCHAR(255) PRIMARY KEY,
          team_id VARCHAR(255) NOT NULL,
          student_id VARCHAR(255),
          member_index INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          gender VARCHAR(50),
          email VARCHAR(255),
          phone VARCHAR(50),
          academic_year VARCHAR(50),
          is_lead BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "submissions",
        query: `CREATE TABLE IF NOT EXISTS submissions (
          id VARCHAR(255) PRIMARY KEY,
          team_id VARCHAR(255) UNIQUE NOT NULL,
          abstract TEXT,
          implementation_steps TEXT,
          ppt_file_name VARCHAR(255),
          ppt_file_url TEXT,
          ppt_base64 TEXT,
          proposal_status VARCHAR(50) DEFAULT 'saved',
          submitted_at VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "evaluation_criteria",
        query: `CREATE TABLE IF NOT EXISTS evaluation_criteria (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          max_score INT DEFAULT 10,
          description TEXT,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "evaluations",
        query: `CREATE TABLE IF NOT EXISTS evaluations (
          id VARCHAR(255) PRIMARY KEY,
          team_id VARCHAR(255) NOT NULL,
          evaluator_username VARCHAR(255) NOT NULL,
          total_score NUMERIC DEFAULT 0,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'completed',
          evaluated_at VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "evaluation_scores",
        query: `CREATE TABLE IF NOT EXISTS evaluation_scores (
          id VARCHAR(255) PRIMARY KEY,
          evaluation_id VARCHAR(255) NOT NULL,
          criterion_id VARCHAR(255) NOT NULL,
          score NUMERIC NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "payments",
        query: `CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(255) PRIMARY KEY,
          team_id VARCHAR(255) NOT NULL,
          order_id VARCHAR(255) NOT NULL,
          payment_id VARCHAR(255),
          amount NUMERIC NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          status VARCHAR(50) DEFAULT 'created',
          payment_method VARCHAR(50),
          signature TEXT,
          student_email VARCHAR(255),
          raw_response TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "notifications",
        query: `CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(255) PRIMARY KEY,
          channel VARCHAR(50) NOT NULL,
          recipient VARCHAR(255) NOT NULL,
          recipient_group VARCHAR(100),
          recipient_count INT DEFAULT 1,
          team_name VARCHAR(255),
          subject VARCHAR(255),
          message TEXT,
          preview TEXT,
          status VARCHAR(50) NOT NULL,
          error TEXT,
          sender VARCHAR(255),
          timestamp VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "audit_logs",
        query: `CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          username VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255),
          details_json TEXT,
          ip_address VARCHAR(100),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "registrations",
        query: `CREATE TABLE IF NOT EXISTS registrations (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(100) UNIQUE NOT NULL,
          team_name VARCHAR(255) NOT NULL,
          lead_name VARCHAR(255) NOT NULL,
          lead_department VARCHAR(100) NOT NULL,
          lead_mobile VARCHAR(50) NOT NULL,
          lead_gender VARCHAR(50),
          lead_academic_year VARCHAR(50),
          member1 VARCHAR(255),
          member1_gender VARCHAR(50),
          member1_email VARCHAR(255),
          member1_phone VARCHAR(50),
          member1_academic_year VARCHAR(50),
          member2 VARCHAR(255),
          member2_gender VARCHAR(50),
          member2_email VARCHAR(255),
          member2_phone VARCHAR(50),
          member2_academic_year VARCHAR(50),
          member3 VARCHAR(255),
          member3_gender VARCHAR(50),
          member3_email VARCHAR(255),
          member3_phone VARCHAR(50),
          member3_academic_year VARCHAR(50),
          member4 VARCHAR(255),
          member4_gender VARCHAR(50),
          member4_email VARCHAR(255),
          member4_phone VARCHAR(50),
          member4_academic_year VARCHAR(50),
          member5 VARCHAR(255),
          member5_gender VARCHAR(50),
          member5_email VARCHAR(255),
          member5_phone VARCHAR(50),
          member5_academic_year VARCHAR(50),
          has_female_member BOOLEAN DEFAULT FALSE,
          mentor_name VARCHAR(255),
          problem_statement_id VARCHAR(100),
          submitted_at VARCHAR(100),
          student_email VARCHAR(255),
          payment_status VARCHAR(50) DEFAULT 'free',
          payment_id VARCHAR(255),
          order_id VARCHAR(255),
          amount_paid NUMERIC,
          abstract TEXT,
          implementation_steps TEXT,
          ppt_file_name VARCHAR(255),
          ppt_file_url TEXT,
          ppt_base64 TEXT,
          proposal_status VARCHAR(50) DEFAULT 'saved',
          approval_status VARCHAR(50) DEFAULT 'pending',
          approval_notes TEXT,
          verified_at VARCHAR(100),
          verified_by VARCHAR(255),
          is_final_selected BOOLEAN DEFAULT FALSE,
          selection_notes TEXT,
          assigned_evaluator VARCHAR(255),
          evaluator_scores TEXT,
          evaluation_notes TEXT,
          evaluation_status VARCHAR(50) DEFAULT 'pending',
          total_score NUMERIC DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "admins",
        query: `CREATE TABLE IF NOT EXISTS admins (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role VARCHAR(50) NOT NULL,
          department VARCHAR(100) DEFAULT '',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT '';`
      },
      {
        label: "team_evaluations",
        query: `CREATE TABLE IF NOT EXISTS team_evaluations (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(255) NOT NULL,
          evaluator_username VARCHAR(255) NOT NULL,
          scores_json TEXT NOT NULL,
          total_score NUMERIC DEFAULT 0,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'completed',
          evaluated_at VARCHAR(100)
        );`
      },
      {
        label: "payment_transactions",
        query: `CREATE TABLE IF NOT EXISTS payment_transactions (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(255) NOT NULL,
          order_id VARCHAR(255) NOT NULL,
          payment_id VARCHAR(255),
          amount NUMERIC NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          status VARCHAR(50) DEFAULT 'created',
          payment_method VARCHAR(50),
          signature TEXT,
          student_email VARCHAR(255),
          raw_response TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "app_settings",
        query: `CREATE TABLE IF NOT EXISTS app_settings (
          id VARCHAR(255) PRIMARY KEY,
          settings_json TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "homepage_content",
        query: `CREATE TABLE IF NOT EXISTS homepage_content (
          id VARCHAR(255) PRIMARY KEY,
          content_json TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      },
      {
        label: "custom_pages",
        query: `CREATE TABLE IF NOT EXISTS custom_pages (
          id VARCHAR(255) PRIMARY KEY,
          slug VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          published BOOLEAN DEFAULT TRUE,
          created_at VARCHAR(100)
        );`
      },
      {
        label: "menu_items",
        query: `CREATE TABLE IF NOT EXISTS menu_items (
          id VARCHAR(255) PRIMARY KEY,
          label VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          target VARCHAR(255) NOT NULL,
          sort_order INT DEFAULT 0
        );`
      },
      {
        label: "live_updates",
        query: `CREATE TABLE IF NOT EXISTS live_updates (
          id VARCHAR(255) PRIMARY KEY,
          text TEXT NOT NULL,
          is_important BOOLEAN DEFAULT FALSE,
          created_at VARCHAR(100)
        );`
      },
      {
        label: "broadcast_logs",
        query: `CREATE TABLE IF NOT EXISTS broadcast_logs (
          id VARCHAR(255) PRIMARY KEY,
          channel VARCHAR(50) NOT NULL,
          recipient VARCHAR(255) NOT NULL,
          team_name VARCHAR(255),
          subject VARCHAR(255),
          preview TEXT,
          status VARCHAR(50) NOT NULL,
          timestamp VARCHAR(100),
          error TEXT
        );`
      },
      {
        label: "app_files",
        query: `CREATE TABLE IF NOT EXISTS app_files (
          id VARCHAR(255) PRIMARY KEY,
          category VARCHAR(50) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255),
          mime_type VARCHAR(100) NOT NULL,
          size INT NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`
      }
    ];

    for (const t of tables) {
      await safeExecute(t.query, `Create table ${t.label}`);
    }

    // Proactive schema column migrations to ensure existing tables have all modern columns
    const columnMigrations = [
      `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE admins ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT '';`,
      `ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS assigned_evaluator VARCHAR(255);`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS evaluation_status VARCHAR(50) DEFAULT 'pending';`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS total_score NUMERIC DEFAULT 0;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ppt_base64 TEXT;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ppt_file_url TEXT;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ppt_file_name VARCHAR(255);`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS abstract TEXT;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS implementation_steps TEXT;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_final_selected BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS selection_notes TEXT;`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS verified_at VARCHAR(100);`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';`,
      `ALTER TABLE registrations ADD COLUMN IF NOT EXISTS approval_notes TEXT;`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
      `ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`
    ];

    for (const migration of columnMigrations) {
      await safeExecute(migration, "Migrate schema columns");
    }

    // Normalized Indexes & Foreign Keys
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,
      `CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`,
      `CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_reg_id ON teams(registration_id);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_student_email ON teams(student_email);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_problem_id ON teams(problem_statement_id);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_approval_status ON teams(approval_status);`,
      `CREATE INDEX IF NOT EXISTS idx_teams_assigned_evaluator ON teams(assigned_evaluator);`,
      `CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);`,
      `CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);`,
      `CREATE INDEX IF NOT EXISTS idx_team_members_student_id ON team_members(student_id);`,
      `CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions(team_id);`,
      `CREATE INDEX IF NOT EXISTS idx_evaluations_team_id ON evaluations(team_id);`,
      `CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_username);`,
      `CREATE INDEX IF NOT EXISTS idx_eval_scores_eval_id ON evaluation_scores(evaluation_id);`,
      `CREATE INDEX IF NOT EXISTS idx_eval_scores_crit_id ON evaluation_scores(criterion_id);`,
      `CREATE INDEX IF NOT EXISTS idx_payments_team_id ON payments(team_id);`,
      `CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_problem_stmt ON registrations(problem_statement_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_student_email ON registrations(student_email);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_approval_status ON registrations(approval_status);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_assigned_evaluator ON registrations(assigned_evaluator);`,
      `CREATE INDEX IF NOT EXISTS idx_eval_reg_id ON team_evaluations(registration_id);`,
      `CREATE INDEX IF NOT EXISTS idx_eval_evaluator ON team_evaluations(evaluator_username);`,
      `CREATE INDEX IF NOT EXISTS idx_payments_reg_id ON payment_transactions(registration_id);`,
      `CREATE INDEX IF NOT EXISTS idx_app_files_cat ON app_files(category);`,
      `CREATE INDEX IF NOT EXISTS idx_app_files_name ON app_files(filename);`
    ];

    for (const idx of indexes) {
      await safeExecute(idx, "Create index");
    }

    // Execute automated data migration from legacy tables to normalized tables
    await this.migrateLegacyDataToNormalizedTables();
  }

  /**
   * Migrate existing registrations and evaluations into normalized tables idempotently
   * without destroying or duplicating any data.
   */
  private async migrateLegacyDataToNormalizedTables(): Promise<void> {
    if (!this.pgPool) return;

    try {
      // 1. Check if legacy registrations exist
      const regRes = await this.pgPool.query(`SELECT * FROM registrations`);
      if (regRes.rows && regRes.rows.length > 0) {
        for (const row of regRes.rows) {
          // Upsert into normalized 'teams' table
          await this.pgPool.query(`
            INSERT INTO teams (
              id, registration_id, team_name, lead_name, lead_department, lead_mobile, lead_gender, lead_academic_year,
              has_female_member, mentor_name, problem_statement_id, submitted_at, student_email, payment_status,
              payment_id, order_id, amount_paid, approval_status, approval_notes, verified_at, verified_by,
              is_final_selected, selection_notes, assigned_evaluator, evaluation_status, total_score, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, $19, $20, $21,
              $22, $23, $24, $25, $26, NOW()
            ) ON CONFLICT (id) DO UPDATE SET
              registration_id = EXCLUDED.registration_id,
              team_name = EXCLUDED.team_name,
              lead_name = EXCLUDED.lead_name,
              lead_department = EXCLUDED.lead_department,
              lead_mobile = EXCLUDED.lead_mobile,
              lead_gender = EXCLUDED.lead_gender,
              lead_academic_year = EXCLUDED.lead_academic_year,
              has_female_member = EXCLUDED.has_female_member,
              mentor_name = EXCLUDED.mentor_name,
              problem_statement_id = EXCLUDED.problem_statement_id,
              submitted_at = EXCLUDED.submitted_at,
              student_email = EXCLUDED.student_email,
              payment_status = EXCLUDED.payment_status,
              payment_id = EXCLUDED.payment_id,
              order_id = EXCLUDED.order_id,
              amount_paid = EXCLUDED.amount_paid,
              approval_status = EXCLUDED.approval_status,
              approval_notes = EXCLUDED.approval_notes,
              verified_at = EXCLUDED.verified_at,
              verified_by = EXCLUDED.verified_by,
              is_final_selected = EXCLUDED.is_final_selected,
              selection_notes = EXCLUDED.selection_notes,
              assigned_evaluator = EXCLUDED.assigned_evaluator,
              evaluation_status = EXCLUDED.evaluation_status,
              total_score = EXCLUDED.total_score,
              updated_at = NOW();
          `, [
            row.id, row.registration_id, row.team_name, row.lead_name, row.lead_department, row.lead_mobile,
            row.lead_gender || "", row.lead_academic_year || "", !!row.has_female_member, row.mentor_name || "",
            row.problem_statement_id || "", row.submitted_at || new Date().toISOString(), row.student_email || "",
            row.payment_status || "free", row.payment_id || "", row.order_id || "", row.amount_paid || null,
            row.approval_status || "pending", row.approval_notes || "", row.verified_at || "", row.verified_by || "",
            !!row.is_final_selected, row.selection_notes || "", row.assigned_evaluator || "",
            row.evaluation_status || "pending", row.total_score || 0
          ]);

          // Upsert team leader as team member index 0
          await this.pgPool.query(`
            INSERT INTO team_members (id, team_id, member_index, name, gender, email, phone, academic_year, is_lead, updated_at)
            VALUES ($1, $2, 0, $3, $4, $5, $6, $7, TRUE, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              gender = EXCLUDED.gender,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              academic_year = EXCLUDED.academic_year;
          `, [
            `tm_${row.id}_lead`, row.id, row.lead_name, row.lead_gender || "", row.student_email || "", row.lead_mobile, row.lead_academic_year || ""
          ]);

          // Upsert members 1 to 5 into team_members table
          for (let m = 1; m <= 5; m++) {
            const mName = row[`member${m}`];
            if (mName && mName.trim()) {
              const mGender = row[`member${m}_gender`] || "";
              const mEmail = row[`member${m}_email`] || "";
              const mPhone = row[`member${m}_phone`] || "";
              const mYear = row[`member${m}_academic_year`] || "";
              await this.pgPool.query(`
                INSERT INTO team_members (id, team_id, member_index, name, gender, email, phone, academic_year, is_lead, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  gender = EXCLUDED.gender,
                  email = EXCLUDED.email,
                  phone = EXCLUDED.phone,
                  academic_year = EXCLUDED.academic_year;
              `, [
                `tm_${row.id}_${m}`, row.id, m, mName.trim(), mGender, mEmail, mPhone, mYear
              ]);
            }
          }

          // Upsert submission details into 'submissions' table
          await this.pgPool.query(`
            INSERT INTO submissions (id, team_id, abstract, implementation_steps, ppt_file_name, ppt_file_url, ppt_base64, proposal_status, submitted_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (team_id) DO UPDATE SET
              abstract = EXCLUDED.abstract,
              implementation_steps = EXCLUDED.implementation_steps,
              ppt_file_name = EXCLUDED.ppt_file_name,
              ppt_file_url = EXCLUDED.ppt_file_url,
              ppt_base64 = EXCLUDED.ppt_base64,
              proposal_status = EXCLUDED.proposal_status,
              submitted_at = EXCLUDED.submitted_at,
              updated_at = NOW();
          `, [
            `sub_${row.id}`, row.id, row.abstract || "", row.implementation_steps || "",
            row.ppt_file_name || "", row.ppt_file_url || "", row.ppt_base64 || "",
            row.proposal_status || "saved", row.submitted_at || new Date().toISOString()
          ]);
        }
        console.log(`✅ [DB Migration] Migrated ${regRes.rows.length} registrations to normalized teams, team_members, and submissions tables.`);
      }

      // 2. Migrate students into users table if not already present
      const studRes = await this.pgPool.query(`SELECT * FROM students`);
      if (studRes.rows && studRes.rows.length > 0) {
        for (const s of studRes.rows) {
          await this.pgPool.query(`
            INSERT INTO users (id, email, password_hash, role, name, mobile, created_at)
            VALUES ($1, $2, $3, 'student', $4, $5, NOW())
            ON CONFLICT (email) DO UPDATE SET
              password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
              mobile = COALESCE(EXCLUDED.mobile, users.mobile);
          `, [s.id, s.email.toLowerCase(), s.password_hash || "", s.email.split("@")[0], s.mobile || ""]);
        }
      }

      // 3. Migrate team_evaluations into evaluations & evaluation_scores
      const evalRes = await this.pgPool.query(`SELECT * FROM team_evaluations`);
      if (evalRes.rows && evalRes.rows.length > 0) {
        for (const ev of evalRes.rows) {
          await this.pgPool.query(`
            INSERT INTO evaluations (id, team_id, evaluator_username, total_score, notes, status, evaluated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              total_score = EXCLUDED.total_score,
              notes = EXCLUDED.notes,
              status = EXCLUDED.status,
              evaluated_at = EXCLUDED.evaluated_at;
          `, [
            ev.id, ev.registration_id, ev.evaluator_username, ev.total_score || 0,
            ev.notes || "", ev.status || "completed", ev.evaluated_at || new Date().toISOString()
          ]);

          const scores = typeof ev.scores_json === "string" ? JSON.parse(ev.scores_json || "{}") : (ev.scores_json || {});
          for (const [critId, scoreVal] of Object.entries(scores)) {
            await this.pgPool.query(`
              INSERT INTO evaluation_scores (id, evaluation_id, criterion_id, score)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score;
            `, [`score_${ev.id}_${critId}`, ev.id, critId, Number(scoreVal) || 0]);
          }
        }
      }

      // 4. Migrate payment_transactions into payments
      const payRes = await this.pgPool.query(`SELECT * FROM payment_transactions`);
      if (payRes.rows && payRes.rows.length > 0) {
        for (const p of payRes.rows) {
          await this.pgPool.query(`
            INSERT INTO payments (id, team_id, order_id, payment_id, amount, currency, status, payment_method, signature, student_email, raw_response, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              payment_id = EXCLUDED.payment_id;
          `, [
            p.id, p.registration_id, p.order_id, p.payment_id || null, Number(p.amount) || 0,
            p.currency || "INR", p.status || "created", p.payment_method || null, p.signature || null,
            p.student_email || null, p.raw_response || null, p.created_at || new Date()
          ]);
        }
      }

      // 5. Migrate broadcast_logs into notifications
      const logRes = await this.pgPool.query(`SELECT * FROM broadcast_logs`);
      if (logRes.rows && logRes.rows.length > 0) {
        for (const l of logRes.rows) {
          await this.pgPool.query(`
            INSERT INTO notifications (id, channel, recipient, team_name, subject, preview, status, error, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
          `, [
            l.id, l.channel, l.recipient, l.team_name || null, l.subject || null,
            l.preview || null, l.status || "sent", l.error || null, l.timestamp || new Date().toISOString()
          ]);
        }
      }

      // 6. Ensure problem_statements columns allow long titles and organizations
      try {
        await this.pgPool.query(`ALTER TABLE problem_statements ALTER COLUMN title TYPE TEXT;`);
        await this.pgPool.query(`ALTER TABLE problem_statements ALTER COLUMN organization TYPE TEXT;`);
        await this.pgPool.query(`ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';`);
        await this.pgPool.query(`ALTER TABLE problem_statements ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;`);
      } catch (colErr: any) {
        // Safe if already TEXT or columns already exist
      }
    } catch (err: any) {
      console.warn("[DB Migration Notice]:", err.message);
    }
  }

  // Seed default data if PostgreSQL tables are brand new and empty
  private async bootstrapPostgresData(): Promise<void> {
    if (!this.pgPool) return;

    try {
      // 1. Problem Statements (Resilient: never overwrite customized statements with defaults)
      const psRes = await this.pgPool.query(`SELECT COUNT(*) as count FROM problem_statements`);
      if (parseInt(psRes.rows[0].count, 10) === 0) {
        const localFilePath = path.join(DATA_DIR, "problem_statements.json");
        const localStatements = fs.existsSync(localFilePath)
          ? this.readLocalFile<ProblemStatement[]>("problem_statements.json", [])
          : [];
        const localSettings = this.readLocalFile<any>("settings.json", {});

        const candidateStatements = Array.isArray(localStatements) && localStatements.length > 0
          ? localStatements
          : (Array.isArray(localSettings?.savedProblemStatements) && localSettings.savedProblemStatements.length > 0
              ? localSettings.savedProblemStatements
              : (fs.existsSync(localFilePath) || Array.isArray(localSettings?.savedProblemStatements)
                  ? []
                  : defaultStatements));

        for (let i = 0; i < candidateStatements.length; i++) {
          const ps = candidateStatements[i];
          await this.pgPool.query(
            `INSERT INTO problem_statements (id, code, title, category, organization, description, sort_order) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             ON CONFLICT (id) DO UPDATE SET 
               code = EXCLUDED.code, 
               title = EXCLUDED.title, 
               category = EXCLUDED.category, 
               organization = EXCLUDED.organization,
               description = EXCLUDED.description,
               sort_order = EXCLUDED.sort_order`,
            [ps.id || `ps_${i + 1}`, ps.code, ps.title, ps.category, ps.organization, (ps as any).description || "", i]
          );
        }
      }

      // 2. Evaluation Criteria (Resilient: preserve customized criteria)
      const critRes = await this.pgPool.query(`SELECT COUNT(*) as count FROM evaluation_criteria`);
      if (parseInt(critRes.rows[0].count, 10) === 0) {
        const localCriteria = this.readLocalFile<EvaluationCriterion[]>("evaluation_criteria.json", []);
        const candidateCriteria = (localCriteria && localCriteria.length > 0) ? localCriteria : defaultCriteria;
        for (let i = 0; i < candidateCriteria.length; i++) {
          const c = candidateCriteria[i];
          await this.pgPool.query(
            `INSERT INTO evaluation_criteria (id, name, max_score, description, sort_order) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (id) DO UPDATE SET 
               name = EXCLUDED.name, 
               max_score = EXCLUDED.max_score, 
               description = EXCLUDED.description, 
               sort_order = EXCLUDED.sort_order`,
            [c.id, c.name, c.maxScore || 10, c.description || "", i]
          );
        }
      }

      // 3. Default Admins
      const adminRes = await this.pgPool.query(`SELECT COUNT(*) as count FROM admins`);
      if (parseInt(adminRes.rows[0].count, 10) === 0) {
        for (const a of defaultDefaultAdmins) {
          await this.pgPool.query(
            `INSERT INTO admins (id, username, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
            [a.username.toLowerCase(), a.username, a.passwordHash, a.role]
          );
        }
      }

      // 4. Homepage Content
      const hpRes = await this.pgPool.query(`SELECT COUNT(*) as count FROM homepage_content WHERE id = 'main'`);
      if (parseInt(hpRes.rows[0].count, 10) === 0) {
        await this.pgPool.query(
          `INSERT INTO homepage_content (id, content_json) VALUES ('main', $1) ON CONFLICT DO NOTHING`,
          [JSON.stringify(defaultHomepageContent)]
        );
      }

      // 5. Custom Pages
      const cpRes = await this.pgPool.query(`SELECT COUNT(*) as count FROM custom_pages`);
      if (parseInt(cpRes.rows[0].count, 10) === 0) {
        for (const cp of defaultCustomPages) {
          await this.pgPool.query(
            `INSERT INTO custom_pages (id, slug, title, content, published, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [cp.id, cp.slug, cp.title, cp.content, cp.published ?? true, cp.createdAt]
          );
        }
      }

      // 6. Menu Items
      const menuRes = await this.pgPool.query(`SELECT COUNT(*) as count FROM menu_items`);
      if (parseInt(menuRes.rows[0].count, 10) === 0) {
        for (const m of defaultMenuItems) {
          await this.pgPool.query(
            `INSERT INTO menu_items (id, label, type, target, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            [m.id, m.label, m.type, m.target, m.order]
          );
        }
      }
    } catch (err: any) {
      console.warn("[DB Bootstrap note]:", err.message);
    }
  }

  // ===================== REGISTRATIONS / TEAMS =====================

  public async getRegistrations(): Promise<Registration[]> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("registrations");
        const docs = await coll.find({}).sort({ submittedAt: -1 }).toArray();
        if (docs && docs.length > 0) {
          return docs.map(({ _id, ...rest }) => rest as Registration);
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getRegistrations:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM registrations ORDER BY created_at DESC`);
        return res.rows.map(this.mapSqlRowToRegistration);
      } catch (err) {
        console.error("[PostgreSQL Query Error] getRegistrations:", err);
      }
    }
    return this.readLocalFile<Registration[]>("registrations.json", []);
  }

  public async getRegistrationById(id: string): Promise<Registration | null> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("registrations");
        const doc = await coll.findOne({ $or: [{ id }, { registrationId: id }] });
        if (doc) {
          const { _id, ...rest } = doc;
          return rest as Registration;
        }
        return null;
      } catch (err) {
        console.error("[MongoDB Query Error] getRegistrationById:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(
          `SELECT * FROM registrations WHERE id = $1 OR registration_id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) {
          return this.mapSqlRowToRegistration(res.rows[0]);
        }
        return null;
      } catch (err) {
        console.error("[PostgreSQL Query Error] getRegistrationById:", err);
      }
    }
    const local = this.readLocalFile<Registration[]>("registrations.json", []);
    return local.find(r => r.id === id || r.registrationId === id) || null;
  }

  public async saveRegistration(reg: Registration): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("registrations");
        await coll.updateOne(
          { id: reg.id },
          { $set: { ...reg, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        if (reg.pptBase64) {
          const filename = reg.pptFileName || `${reg.teamName.replace(/[^a-zA-Z0-9_-]/g, "_")}_presentation.pptx`;
          const cleanBase64 = reg.pptBase64.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(cleanBase64, "base64");
          await this.saveFileRecord({
            category: "ppts",
            filename,
            originalName: reg.pptFileName || filename,
            mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            size: buffer.length,
            buffer
          });
        }
      } catch (err) {
        console.error("[MongoDB Save Error] saveRegistration:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const sql = `
          INSERT INTO registrations (
            id, registration_id, team_name, lead_name, lead_department, lead_mobile, lead_gender, lead_academic_year,
            member1, member1_gender, member1_email, member1_phone, member1_academic_year,
            member2, member2_gender, member2_email, member2_phone, member2_academic_year,
            member3, member3_gender, member3_email, member3_phone, member3_academic_year,
            member4, member4_gender, member4_email, member4_phone, member4_academic_year,
            member5, member5_gender, member5_email, member5_phone, member5_academic_year,
            has_female_member, mentor_name, problem_statement_id, submitted_at, student_email,
            payment_status, payment_id, order_id, amount_paid, abstract, implementation_steps,
            ppt_file_name, ppt_file_url, ppt_base64, proposal_status, approval_status, approval_notes,
            verified_at, verified_by, is_final_selected, selection_notes, assigned_evaluator,
            evaluator_scores, evaluation_notes, evaluation_status, total_score, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23,
            $24, $25, $26, $27, $28,
            $29, $30, $31, $32, $33,
            $34, $35, $36, $37, $38,
            $39, $40, $41, $42, $43, $44,
            $45, $46, $47, $48, $49, $50,
            $51, $52, $53, $54, $55,
            $56, $57, $58, $59, NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            registration_id = EXCLUDED.registration_id,
            team_name = EXCLUDED.team_name,
            lead_name = EXCLUDED.lead_name,
            lead_department = EXCLUDED.lead_department,
            lead_mobile = EXCLUDED.lead_mobile,
            lead_gender = EXCLUDED.lead_gender,
            lead_academic_year = EXCLUDED.lead_academic_year,
            member1 = EXCLUDED.member1,
            member1_gender = EXCLUDED.member1_gender,
            member1_email = EXCLUDED.member1_email,
            member1_phone = EXCLUDED.member1_phone,
            member1_academic_year = EXCLUDED.member1_academic_year,
            member2 = EXCLUDED.member2,
            member2_gender = EXCLUDED.member2_gender,
            member2_email = EXCLUDED.member2_email,
            member2_phone = EXCLUDED.member2_phone,
            member2_academic_year = EXCLUDED.member2_academic_year,
            member3 = EXCLUDED.member3,
            member3_gender = EXCLUDED.member3_gender,
            member3_email = EXCLUDED.member3_email,
            member3_phone = EXCLUDED.member3_phone,
            member3_academic_year = EXCLUDED.member3_academic_year,
            member4 = EXCLUDED.member4,
            member4_gender = EXCLUDED.member4_gender,
            member4_email = EXCLUDED.member4_email,
            member4_phone = EXCLUDED.member4_phone,
            member4_academic_year = EXCLUDED.member4_academic_year,
            member5 = EXCLUDED.member5,
            member5_gender = EXCLUDED.member5_gender,
            member5_email = EXCLUDED.member5_email,
            member5_phone = EXCLUDED.member5_phone,
            member5_academic_year = EXCLUDED.member5_academic_year,
            has_female_member = EXCLUDED.has_female_member,
            mentor_name = EXCLUDED.mentor_name,
            problem_statement_id = EXCLUDED.problem_statement_id,
            submitted_at = EXCLUDED.submitted_at,
            student_email = EXCLUDED.student_email,
            payment_status = EXCLUDED.payment_status,
            payment_id = EXCLUDED.payment_id,
            order_id = EXCLUDED.order_id,
            amount_paid = EXCLUDED.amount_paid,
            abstract = EXCLUDED.abstract,
            implementation_steps = EXCLUDED.implementation_steps,
            ppt_file_name = EXCLUDED.ppt_file_name,
            ppt_file_url = EXCLUDED.ppt_file_url,
            ppt_base64 = EXCLUDED.ppt_base64,
            proposal_status = EXCLUDED.proposal_status,
            approval_status = EXCLUDED.approval_status,
            approval_notes = EXCLUDED.approval_notes,
            verified_at = EXCLUDED.verified_at,
            verified_by = EXCLUDED.verified_by,
            is_final_selected = EXCLUDED.is_final_selected,
            selection_notes = EXCLUDED.selection_notes,
            assigned_evaluator = EXCLUDED.assigned_evaluator,
            evaluator_scores = EXCLUDED.evaluator_scores,
            evaluation_notes = EXCLUDED.evaluation_notes,
            evaluation_status = EXCLUDED.evaluation_status,
            total_score = EXCLUDED.total_score,
            updated_at = NOW();
        `;

        const totalScore = reg.evaluatorScores ? Object.values(reg.evaluatorScores).reduce((a, b) => Number(a) + Number(b), 0) : 0;

        const values = [
          reg.id, reg.registrationId, reg.teamName, reg.leadName, reg.leadDepartment, reg.leadMobile, reg.leadGender || "", reg.leadAcademicYear || "",
          reg.member1 || "", reg.member1Gender || "", reg.member1Email || "", reg.member1Phone || "", reg.member1AcademicYear || "",
          reg.member2 || "", reg.member2Gender || "", reg.member2Email || "", reg.member2Phone || "", reg.member2AcademicYear || "",
          reg.member3 || "", reg.member3Gender || "", reg.member3Email || "", reg.member3Phone || "", reg.member3AcademicYear || "",
          reg.member4 || "", reg.member4Gender || "", reg.member4Email || "", reg.member4Phone || "", reg.member4AcademicYear || "",
          reg.member5 || "", reg.member5Gender || "", reg.member5Email || "", reg.member5Phone || "", reg.member5AcademicYear || "",
          !!reg.hasFemaleMember, reg.mentorName || "", reg.problemStatementId || "", reg.submittedAt || new Date().toISOString(), reg.studentEmail || "",
          reg.paymentStatus || "free", reg.paymentId || "", reg.orderId || "", reg.amountPaid !== undefined ? reg.amountPaid : null,
          reg.abstract || "", reg.implementationSteps || "", reg.pptFileName || "", reg.pptFileUrl || "", reg.pptBase64 || "",
          reg.proposalStatus || "saved", reg.approvalStatus || "pending", reg.approvalNotes || "", reg.verifiedAt || "", reg.verifiedBy || "",
          !!reg.isFinalSelected, reg.selectionNotes || "", reg.assignedEvaluator || "",
          reg.evaluatorScores ? JSON.stringify(reg.evaluatorScores) : "", reg.evaluationNotes || "", reg.evaluationStatus || "pending",
          totalScore
        ];

        await this.pgPool.query(sql, values);

        // Sync into normalized 'teams' table
        await this.pgPool.query(`
          INSERT INTO teams (
            id, registration_id, team_name, lead_name, lead_department, lead_mobile, lead_gender, lead_academic_year,
            has_female_member, mentor_name, problem_statement_id, submitted_at, student_email, payment_status,
            payment_id, order_id, amount_paid, approval_status, approval_notes, verified_at, verified_by,
            is_final_selected, selection_notes, assigned_evaluator, evaluation_status, total_score, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21,
            $22, $23, $24, $25, $26, NOW()
          ) ON CONFLICT (id) DO UPDATE SET
            registration_id = EXCLUDED.registration_id,
            team_name = EXCLUDED.team_name,
            lead_name = EXCLUDED.lead_name,
            lead_department = EXCLUDED.lead_department,
            lead_mobile = EXCLUDED.lead_mobile,
            lead_gender = EXCLUDED.lead_gender,
            lead_academic_year = EXCLUDED.lead_academic_year,
            has_female_member = EXCLUDED.has_female_member,
            mentor_name = EXCLUDED.mentor_name,
            problem_statement_id = EXCLUDED.problem_statement_id,
            submitted_at = EXCLUDED.submitted_at,
            student_email = EXCLUDED.student_email,
            payment_status = EXCLUDED.payment_status,
            payment_id = EXCLUDED.payment_id,
            order_id = EXCLUDED.order_id,
            amount_paid = EXCLUDED.amount_paid,
            approval_status = EXCLUDED.approval_status,
            approval_notes = EXCLUDED.approval_notes,
            verified_at = EXCLUDED.verified_at,
            verified_by = EXCLUDED.verified_by,
            is_final_selected = EXCLUDED.is_final_selected,
            selection_notes = EXCLUDED.selection_notes,
            assigned_evaluator = EXCLUDED.assigned_evaluator,
            evaluation_status = EXCLUDED.evaluation_status,
            total_score = EXCLUDED.total_score,
            updated_at = NOW();
        `, [
          reg.id, reg.registrationId, reg.teamName, reg.leadName, reg.leadDepartment, reg.leadMobile,
          reg.leadGender || "", reg.leadAcademicYear || "", !!reg.hasFemaleMember, reg.mentorName || "",
          reg.problemStatementId || "", reg.submittedAt || new Date().toISOString(), reg.studentEmail || "",
          reg.paymentStatus || "free", reg.paymentId || "", reg.orderId || "", reg.amountPaid !== undefined ? reg.amountPaid : null,
          reg.approvalStatus || "pending", reg.approvalNotes || "", reg.verifiedAt || "", reg.verifiedBy || "",
          !!reg.isFinalSelected, reg.selectionNotes || "", reg.assignedEvaluator || "",
          reg.evaluationStatus || "pending", totalScore
        ]);

        // Sync lead in team_members
        await this.pgPool.query(`
          INSERT INTO team_members (id, team_id, member_index, name, gender, email, phone, academic_year, is_lead, updated_at)
          VALUES ($1, $2, 0, $3, $4, $5, $6, $7, TRUE, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            gender = EXCLUDED.gender,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            academic_year = EXCLUDED.academic_year;
        `, [
          `tm_${reg.id}_lead`, reg.id, reg.leadName, reg.leadGender || "", reg.studentEmail || "", reg.leadMobile, reg.leadAcademicYear || ""
        ]);

        // Sync members 1-5 in team_members
        const memberList = [
          { name: reg.member1, gender: reg.member1Gender, email: reg.member1Email, phone: reg.member1Phone, year: reg.member1AcademicYear },
          { name: reg.member2, gender: reg.member2Gender, email: reg.member2Email, phone: reg.member2Phone, year: reg.member2AcademicYear },
          { name: reg.member3, gender: reg.member3Gender, email: reg.member3Email, phone: reg.member3Phone, year: reg.member3AcademicYear },
          { name: reg.member4, gender: reg.member4Gender, email: reg.member4Email, phone: reg.member4Phone, year: reg.member4AcademicYear },
          { name: reg.member5, gender: reg.member5Gender, email: reg.member5Email, phone: reg.member5Phone, year: reg.member5AcademicYear }
        ];

        for (let idx = 0; idx < memberList.length; idx++) {
          const m = memberList[idx];
          const mIndex = idx + 1;
          const memberId = `tm_${reg.id}_${mIndex}`;
          if (m.name && m.name.trim()) {
            await this.pgPool.query(`
              INSERT INTO team_members (id, team_id, member_index, name, gender, email, phone, academic_year, is_lead, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                gender = EXCLUDED.gender,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                academic_year = EXCLUDED.academic_year;
            `, [
              memberId, reg.id, mIndex, m.name.trim(), m.gender || "", m.email || "", m.phone || "", m.year || ""
            ]);
          } else {
            await this.pgPool.query(`DELETE FROM team_members WHERE id = $1`, [memberId]);
          }
        }

        // Sync submissions table
        await this.pgPool.query(`
          INSERT INTO submissions (id, team_id, abstract, implementation_steps, ppt_file_name, ppt_file_url, ppt_base64, proposal_status, submitted_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (team_id) DO UPDATE SET
            abstract = EXCLUDED.abstract,
            implementation_steps = EXCLUDED.implementation_steps,
            ppt_file_name = EXCLUDED.ppt_file_name,
            ppt_file_url = EXCLUDED.ppt_file_url,
            ppt_base64 = EXCLUDED.ppt_base64,
            proposal_status = EXCLUDED.proposal_status,
            submitted_at = EXCLUDED.submitted_at,
            updated_at = NOW();
        `, [
          `sub_${reg.id}`, reg.id, reg.abstract || "", reg.implementationSteps || "",
          reg.pptFileName || "", reg.pptFileUrl || "", reg.pptBase64 || "",
          reg.proposalStatus || "saved", reg.submittedAt || new Date().toISOString()
        ]);

        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveRegistration:", err);
      }
    }

    const local = this.readLocalFile<Registration[]>("registrations.json", []);
    const idx = local.findIndex(r => r.id === reg.id);
    if (idx >= 0) local[idx] = reg;
    else local.push(reg);
    this.writeLocalFile("registrations.json", local);
    return true;
  }

  public async saveRegistrations(regs: Registration[]): Promise<boolean> {
    for (const r of regs) {
      await this.saveRegistration(r);
    }
    return true;
  }

  public async deleteRegistration(id: string): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("registrations");
        await coll.deleteOne({ $or: [{ id }, { registrationId: id }] });
      } catch (err) {
        console.error("[MongoDB Delete Error] deleteRegistration:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM registrations WHERE id = $1 OR registration_id = $1`, [id]);
        await this.pgPool.query(`DELETE FROM teams WHERE id = $1 OR registration_id = $1`, [id]);
        return true;
      } catch (err) {
        console.error("[PostgreSQL Delete Error] deleteRegistration:", err);
      }
    }
    const local = this.readLocalFile<Registration[]>("registrations.json", []);
    const filtered = local.filter(r => r.id !== id && r.registrationId !== id);
    this.writeLocalFile("registrations.json", filtered);
    return true;
  }

  // ===================== STUDENTS =====================

  public async getStudents(): Promise<Student[]> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("students");
        const docs = await coll.find({}).toArray();
        if (docs && docs.length > 0) {
          return docs.map(({ _id, ...rest }) => rest as Student);
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getStudents:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM students ORDER BY created_at DESC`);
        return res.rows.map(r => ({
          id: r.id,
          email: r.email,
          passwordHash: r.password_hash,
          gender: r.gender,
          department: r.department,
          mobile: r.mobile,
          createdAt: r.created_at
        }));
      } catch (err) {
        console.error("[PostgreSQL Query Error] getStudents:", err);
      }
    }
    return this.readLocalFile<Student[]>("students.json", []);
  }

  public async getStudentByEmail(email: string): Promise<Student | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("students");
        const doc = await coll.findOne({ email: cleanEmail });
        if (doc) {
          const { _id, ...rest } = doc;
          return rest as Student;
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getStudentByEmail:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM students WHERE LOWER(email) = $1 LIMIT 1`, [cleanEmail]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            email: r.email,
            passwordHash: r.password_hash,
            gender: r.gender,
            department: r.department,
            mobile: r.mobile,
            createdAt: r.created_at
          };
        }
        return null;
      } catch (err) {
        console.error("[PostgreSQL Query Error] getStudentByEmail:", err);
      }
    }
    const local = this.readLocalFile<Student[]>("students.json", []);
    return local.find(s => s.email.toLowerCase() === cleanEmail) || null;
  }

  public async saveStudent(student: Student): Promise<boolean> {
    const cleanEmail = (student.email || "").toLowerCase().trim();
    if (!cleanEmail) return false;

    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("students");
        await coll.updateOne(
          { email: cleanEmail },
          { $set: { ...student, email: cleanEmail, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveStudent:", err);
      }
    }

    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO students (id, email, password_hash, gender, department, mobile, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email) DO UPDATE SET
            password_hash = CASE WHEN EXCLUDED.password_hash <> '' THEN EXCLUDED.password_hash ELSE students.password_hash END,
            gender = COALESCE(NULLIF(EXCLUDED.gender, ''), students.gender),
            department = COALESCE(NULLIF(EXCLUDED.department, ''), students.department),
            mobile = COALESCE(NULLIF(EXCLUDED.mobile, ''), students.mobile),
            updated_at = NOW();
        `, [
          student.id || `student-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          cleanEmail,
          student.passwordHash || "",
          student.gender || "",
          student.department || "",
          student.mobile || "",
          student.createdAt || new Date().toISOString()
        ]);

        if (student.passwordHash) {
          await this.pgPool.query(`
            INSERT INTO users (id, email, password_hash, role, name, mobile, created_at)
            VALUES ($1, $2, $3, 'student', $4, $5, NOW())
            ON CONFLICT (email) DO UPDATE SET
              password_hash = EXCLUDED.password_hash,
              mobile = COALESCE(NULLIF(EXCLUDED.mobile, ''), users.mobile),
              updated_at = NOW();
          `, [student.id, cleanEmail, student.passwordHash, cleanEmail.split("@")[0], student.mobile || ""]).catch(() => {});
        }

        return true;
      } catch (err: any) {
        console.error("[PostgreSQL Save Error] saveStudent:", err.message || err);
      }
    }
    const local = this.readLocalFile<Student[]>("students.json", []);
    const idx = local.findIndex(s => (student.id && s.id === student.id) || (cleanEmail && s.email.toLowerCase().trim() === cleanEmail));
    if (idx >= 0) local[idx] = { ...local[idx], ...student, email: cleanEmail };
    else local.push({ ...student, email: cleanEmail });
    this.writeLocalFile("students.json", local);
    return true;
  }

  public async saveStudents(students: Student[]): Promise<boolean> {
    for (const s of students) {
      await this.saveStudent(s);
    }
    return true;
  }

  public async deleteStudent(id: string): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("students");
        await coll.deleteOne({ $or: [{ id }, { email: id.toLowerCase() }] });
      } catch (err) {
        console.error("[MongoDB Delete Error] deleteStudent:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM students WHERE id = $1 OR email = $1`, [id]);
        return true;
      } catch (e) {}
    }
    const local = this.readLocalFile<Student[]>("students.json", []);
    const filtered = local.filter(s => s.id !== id && s.email.toLowerCase() !== id.toLowerCase());
    this.writeLocalFile("students.json", filtered);
    return true;
  }

  // ===================== ADMINS =====================

  public async getAdmins(): Promise<AdminUser[]> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("admins");
        const docs = await coll.find({}).sort({ username: 1 }).toArray();
        if (docs && docs.length > 0) {
          return docs.map(({ _id, ...rest }) => rest as AdminUser);
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getAdmins:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT username, password_hash, role, department FROM admins ORDER BY username ASC`);
        if (res.rows.length > 0) {
          return res.rows.map(r => ({
            username: r.username,
            passwordHash: r.password_hash,
            role: r.role as any,
            department: r.department || ""
          }));
        }
      } catch (err) {
        console.error("[PostgreSQL Query Error] getAdmins:", err);
      }
    }
    return this.readLocalFile<AdminUser[]>("admins.json", defaultDefaultAdmins);
  }

  public async getAdminByUsername(username: string): Promise<AdminUser | null> {
    const clean = username.trim().toLowerCase();
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("admins");
        const doc = await coll.findOne({ $or: [{ username }, { username: clean }, { id: clean }] });
        if (doc) {
          const { _id, ...rest } = doc;
          return rest as AdminUser;
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getAdminByUsername:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT username, password_hash, role, department FROM admins WHERE LOWER(username) = $1 LIMIT 1`, [clean]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            username: r.username,
            passwordHash: r.password_hash,
            role: r.role as any,
            department: r.department || ""
          };
        }
        return null;
      } catch (err) {
        console.error("[PostgreSQL Query Error] getAdminByUsername:", err);
      }
    }
    const admins = await this.getAdmins();
    return admins.find(a => a.username.toLowerCase() === clean) || null;
  }

  public async saveAdmin(admin: AdminUser): Promise<boolean> {
    const id = admin.username.toLowerCase();
    const dept = admin.department || "";
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("admins");
        await coll.updateOne(
          { username: admin.username },
          { $set: { ...admin, department: dept, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveAdmin:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO admins (id, username, password_hash, role, department, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            updated_at = NOW();
        `, [id, admin.username, admin.passwordHash, admin.role, dept]);
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveAdmin:", err);
      }
    }
    const local = this.readLocalFile<AdminUser[]>("admins.json", defaultDefaultAdmins);
    const idx = local.findIndex(a => a.username.toLowerCase() === id);
    if (idx >= 0) local[idx] = { ...admin, department: dept };
    else local.push({ ...admin, department: dept });
    this.writeLocalFile("admins.json", local);
    return true;
  }

  public async saveAdmins(admins: AdminUser[]): Promise<boolean> {
    for (const a of admins) {
      await this.saveAdmin(a);
    }
    return true;
  }

  public async deleteAdmin(username: string): Promise<boolean> {
    const id = username.toLowerCase();
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("admins");
        await coll.deleteOne({ $or: [{ username }, { username: id }, { id }] });
      } catch (err) {
        console.error("[MongoDB Delete Error] deleteAdmin:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM admins WHERE id = $1 OR LOWER(username) = $1`, [id]);
        return true;
      } catch (err) {
        console.error("[PostgreSQL Delete Error] deleteAdmin:", err);
      }
    }
    const local = this.readLocalFile<AdminUser[]>("admins.json", defaultDefaultAdmins);
    const filtered = local.filter(a => a.username.toLowerCase() !== id);
    this.writeLocalFile("admins.json", filtered);
    return true;
  }

  // ===================== EVALUATIONS =====================

  public async saveEvaluation(evaluation: TeamEvaluation): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("team_evaluations");
        await coll.updateOne(
          { id: evaluation.id },
          { $set: { ...evaluation, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
        const regColl = this.mongoDb.collection("registrations");
        await regColl.updateOne(
          { $or: [{ id: evaluation.registrationId }, { registrationId: evaluation.registrationId }] },
          {
            $set: {
              evaluatorScores: evaluation.scores,
              evaluationNotes: evaluation.notes,
              evaluationStatus: evaluation.status,
              totalScore: evaluation.totalScore,
              updatedAt: new Date().toISOString()
            }
          }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveEvaluation:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const sql = `
          INSERT INTO team_evaluations (id, registration_id, evaluator_username, scores_json, total_score, notes, status, evaluated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            scores_json = EXCLUDED.scores_json,
            total_score = EXCLUDED.total_score,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status,
            evaluated_at = EXCLUDED.evaluated_at;
        `;
        await this.pgPool.query(sql, [
          evaluation.id,
          evaluation.registrationId,
          evaluation.evaluatorUsername,
          JSON.stringify(evaluation.scores),
          evaluation.totalScore,
          evaluation.notes || "",
          evaluation.status,
          evaluation.evaluatedAt
        ]);

        await this.pgPool.query(`
          UPDATE registrations 
          SET evaluator_scores = $1, evaluation_notes = $2, evaluation_status = $3, total_score = $4, updated_at = NOW()
          WHERE id = $5 OR registration_id = $5;
        `, [
          JSON.stringify(evaluation.scores),
          evaluation.notes || "",
          evaluation.status,
          evaluation.totalScore,
          evaluation.registrationId
        ]);
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveEvaluation:", err);
      }
    }

    const local = this.readLocalFile<Registration[]>("registrations.json", []);
    const idx = local.findIndex(r => r.id === evaluation.registrationId || r.registrationId === evaluation.registrationId);
    if (idx >= 0) {
      local[idx].evaluatorScores = evaluation.scores;
      local[idx].evaluationNotes = evaluation.notes;
      local[idx].evaluationStatus = evaluation.status;
      this.writeLocalFile("registrations.json", local);
    }
    return true;
  }

  public async getEvaluations(registrationId?: string): Promise<TeamEvaluation[]> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("team_evaluations");
        const query: any = {};
        if (registrationId) {
          query.registrationId = registrationId;
        }
        const docs = await coll.find(query).sort({ evaluatedAt: -1 }).toArray();
        if (docs && docs.length > 0) {
          return docs.map(({ _id, ...rest }) => rest as TeamEvaluation);
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getEvaluations:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        let sql = `SELECT * FROM team_evaluations`;
        const params: any[] = [];
        if (registrationId) {
          sql += ` WHERE registration_id = $1`;
          params.push(registrationId);
        }
        sql += ` ORDER BY evaluated_at DESC;`;
        const res = await this.pgPool.query(sql, params);
        return res.rows.map(r => ({
          id: r.id,
          registrationId: r.registration_id,
          evaluatorUsername: r.evaluator_username,
          scores: typeof r.scores_json === "string" ? JSON.parse(r.scores_json) : (r.scores_json || {}),
          totalScore: Number(r.total_score || 0),
          notes: r.notes || "",
          status: r.status || "completed",
          evaluatedAt: r.evaluated_at
        }));
      } catch (err) {
        console.error("[PostgreSQL Query Error] getEvaluations:", err);
      }
    }

    const regs = this.readLocalFile<Registration[]>("registrations.json", []);
    const evals: TeamEvaluation[] = [];
    for (const r of regs) {
      if (registrationId && r.id !== registrationId && r.registrationId !== registrationId) continue;
      if (r.evaluatorScores && Object.keys(r.evaluatorScores).length > 0) {
        const total = Object.values(r.evaluatorScores).reduce((a, b) => Number(a) + (Number(b) || 0), 0);
        evals.push({
          id: `eval_${r.id}`,
          registrationId: r.id,
          evaluatorUsername: r.assignedEvaluator || "Evaluator",
          scores: r.evaluatorScores,
          totalScore: total,
          notes: r.evaluationNotes || "",
          status: r.evaluationStatus || "completed",
          evaluatedAt: new Date().toISOString()
        });
      }
    }
    return evals;
  }

  // ===================== PAYMENTS =====================

  public async savePaymentTransaction(payment: PaymentTransaction): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("payment_transactions");
        await coll.updateOne(
          { id: payment.id },
          { $set: { ...payment, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] savePaymentTransaction:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO payment_transactions (id, registration_id, order_id, payment_id, amount, currency, status, payment_method, signature, student_email, raw_response, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (id) DO UPDATE SET
            payment_id = EXCLUDED.payment_id,
            status = EXCLUDED.status,
            signature = EXCLUDED.signature,
            raw_response = EXCLUDED.raw_response;
        `, [
          payment.id,
          payment.registrationId,
          payment.orderId,
          payment.paymentId || null,
          payment.amount,
          payment.currency || "INR",
          payment.status || "created",
          payment.paymentMethod || null,
          payment.signature || null,
          payment.studentEmail || null,
          payment.rawResponse || null
        ]);
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] savePaymentTransaction:", err);
      }
    }
    const local = this.readLocalFile<PaymentTransaction[]>("payments.json", []);
    const idx = local.findIndex(p => p.id === payment.id);
    if (idx >= 0) local[idx] = payment;
    else local.push(payment);
    this.writeLocalFile("payments.json", local);
    return true;
  }

  public async getPaymentTransactions(registrationId?: string): Promise<PaymentTransaction[]> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("payment_transactions");
        const query: any = {};
        if (registrationId) query.registrationId = registrationId;
        const docs = await coll.find(query).sort({ createdAt: -1 }).toArray();
        if (docs && docs.length > 0) {
          return docs.map(({ _id, ...rest }) => rest as PaymentTransaction);
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getPaymentTransactions:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        let sql = `SELECT * FROM payment_transactions`;
        const params: any[] = [];
        if (registrationId) {
          sql += ` WHERE registration_id = $1`;
          params.push(registrationId);
        }
        sql += ` ORDER BY created_at DESC;`;
        const res = await this.pgPool.query(sql, params);
        return res.rows.map(r => ({
          id: r.id,
          registrationId: r.registration_id,
          orderId: r.order_id,
          paymentId: r.payment_id,
          amount: Number(r.amount),
          currency: r.currency,
          status: r.status,
          paymentMethod: r.payment_method,
          signature: r.signature,
          studentEmail: r.student_email,
          createdAt: r.created_at,
          rawResponse: r.raw_response
        }));
      } catch (err) {
        console.error("[PostgreSQL Query Error] getPaymentTransactions:", err);
      }
    }
    const local = this.readLocalFile<PaymentTransaction[]>("payments.json", []);
    if (registrationId) return local.filter(p => p.registrationId === registrationId);
    return local;
  }

  // ===================== PROBLEM STATEMENTS =====================

  public async getProblemStatements(): Promise<ProblemStatement[]> {
    const cacheKey = "public:problem_statements";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.problemStatements, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("problem_statements");
          const docs = await coll.find({}).sort({ sortOrder: 1, id: 1 }).toArray();
          if (docs && docs.length > 0) {
            const statements = docs.map(({ _id, sortOrder, ...rest }) => rest as ProblemStatement);
            this.writeLocalFile("problem_statements.json", statements);
            return statements;
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getProblemStatements:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          let res: any;
          try {
            res = await this.pgPool.query(`SELECT * FROM problem_statements ORDER BY sort_order ASC, id ASC`);
          } catch {
            res = await this.pgPool.query(`SELECT * FROM problem_statements ORDER BY id ASC`);
          }
          if (res.rows && res.rows.length > 0) {
            const statements: ProblemStatement[] = res.rows.map((r: any) => ({
              id: r.id,
              code: r.code,
              title: r.title,
              category: r.category as any,
              organization: r.organization,
              description: r.description || ""
            }));
            this.writeLocalFile("problem_statements.json", statements);
            return statements;
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getProblemStatements:", err);
        }
      }
      const local = this.readLocalFile<ProblemStatement[] | undefined>("problem_statements.json", undefined as any);
      if (Array.isArray(local)) {
        return local;
      }
      const settings = this.readLocalFile<any>("settings.json", {});
      if (Array.isArray(settings?.savedProblemStatements)) {
        this.writeLocalFile("problem_statements.json", settings.savedProblemStatements);
        return settings.savedProblemStatements;
      }
      return defaultStatements;
    });
  }

  public async saveProblemStatements(statements: ProblemStatement[]): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("problem_statements");
        await coll.deleteMany({});
        if (statements.length > 0) {
          await coll.insertMany(statements.map((ps, idx) => ({ ...ps, sortOrder: idx })));
        }
        const metaColl = this.mongoDb.collection("app_metadata");
        await metaColl.updateOne(
          { key: "problem_statements" },
          { $set: { key: "problem_statements", data: statements, updatedAt: new Date().toISOString() } },
          { upsert: true }
        ).catch(() => {});
      } catch (err) {
        console.error("[MongoDB Save Error] saveProblemStatements:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM problem_statements`);
        for (let i = 0; i < statements.length; i++) {
          const ps = statements[i];
          await client.query(`
            INSERT INTO problem_statements (id, code, title, category, organization, description, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [ps.id || `ps_${i + 1}`, ps.code, ps.title, ps.category, ps.organization, (ps as any).description || "", i]);
        }
        await client.query(`
          INSERT INTO app_settings (id, settings_json, updated_at)
          VALUES ('problem_statements_backup', $1, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET settings_json = EXCLUDED.settings_json, updated_at = CURRENT_TIMESTAMP;
        `, [JSON.stringify(statements)]).catch(() => {});
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("[PostgreSQL Save Error] saveProblemStatements:", err);
        throw err;
      } finally {
        client.release();
      }
    }
    // Redundant backup to local file and settings.json so redeployment restarts never lose items
    this.writeLocalFile("problem_statements.json", statements);
    this.invalidateCacheKeys("public:problem_statements");
    try {
      const currentSettings = this.readLocalFile<any>("settings.json", {});
      currentSettings.savedProblemStatements = statements;
      this.writeLocalFile("settings.json", currentSettings);
    } catch (e) {}
    return true;
  }

  // ===================== EVALUATION CRITERIA =====================

  public async getEvaluationCriteria(): Promise<EvaluationCriterion[]> {
    const cacheKey = "public:evaluation_criteria";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.evaluationCriteria, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("evaluation_criteria");
          const docs = await coll.find({}).sort({ sortOrder: 1, id: 1 }).toArray();
          if (docs && docs.length > 0) {
            return docs.map(({ _id, sortOrder, ...rest }) => rest as EvaluationCriterion);
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getEvaluationCriteria:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT * FROM evaluation_criteria ORDER BY sort_order ASC`);
          if (res.rows && res.rows.length > 0) {
            return res.rows.map(r => ({
              id: r.id,
              name: r.name,
              maxScore: r.max_score,
              description: r.description
            }));
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getEvaluationCriteria:", err);
        }
      }
      return this.readLocalFile<EvaluationCriterion[]>("evaluation_criteria.json", defaultCriteria);
    });
  }

  public async saveEvaluationCriteria(criteria: EvaluationCriterion[]): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("evaluation_criteria");
        await coll.deleteMany({});
        if (criteria.length > 0) {
          await coll.insertMany(criteria.map((c, idx) => ({ ...c, sortOrder: idx })));
        }
      } catch (err) {
        console.error("[MongoDB Save Error] saveEvaluationCriteria:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`DELETE FROM evaluation_criteria`);
        for (let i = 0; i < criteria.length; i++) {
          const c = criteria[i];
          await client.query(`
            INSERT INTO evaluation_criteria (id, name, max_score, description, sort_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [c.id, c.name, c.maxScore || 10, c.description || "", i]);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("[PostgreSQL Save Error] saveEvaluationCriteria:", err);
        throw err;
      } finally {
        client.release();
      }
    }
    this.writeLocalFile("evaluation_criteria.json", criteria);
    this.invalidateCacheKeys("public:evaluation_criteria");
    try {
      const currentSettings = this.readLocalFile<any>("settings.json", {});
      currentSettings.savedEvaluationCriteria = criteria;
      this.writeLocalFile("settings.json", currentSettings);
    } catch (e) {}
    return true;
  }

  // ===================== SETTINGS & METADATA =====================

  public async getSettings(): Promise<FeeConfig> {
    const cacheKey = "public:settings";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.settings, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("app_settings");
          const doc = await coll.findOne({ $or: [{ id: "main" }, { id: "system_settings" }, { id: "global_settings" }] });
          if (doc) {
            const { _id, id, ...rest } = doc;
            let parsed: any = rest;
            if (rest.settings_json) {
              parsed = typeof rest.settings_json === "string" ? JSON.parse(rest.settings_json) : rest.settings_json;
            }
            return parsed as FeeConfig;
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getSettings:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT settings_json FROM app_settings WHERE id = 'main' LIMIT 1`);
          if (res.rows.length > 0 && res.rows[0].settings_json) {
            return JSON.parse(res.rows[0].settings_json) as FeeConfig;
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getSettings:", err);
        }
      }
      return this.readLocalFile<FeeConfig>("settings.json", {
        feeEnabled: false,
        feeAmount: 499,
        razorpayKeyId: "",
        razorpayKeySecret: "",
        jwtEnabled: false
      });
    });
  }

  public async saveSettings(settings: FeeConfig): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("app_settings");
        await coll.updateOne(
          { id: "main" },
          { $set: { id: "main", ...settings, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveSettings:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO app_settings (id, settings_json, updated_at)
          VALUES ('main', $1, NOW())
          ON CONFLICT (id) DO UPDATE SET
            settings_json = EXCLUDED.settings_json,
            updated_at = NOW();
        `, [JSON.stringify(settings)]);
        this.invalidateCacheKeys("public:settings");
        return true;
      } catch (err: any) {
        // Self-heal if updated_at column is missing on legacy table
        if (err && (err.message?.includes("updated_at") || err.code === "42703")) {
          try {
            await this.pgPool.query(`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
            await this.pgPool.query(`
              INSERT INTO app_settings (id, settings_json, updated_at)
              VALUES ('main', $1, NOW())
              ON CONFLICT (id) DO UPDATE SET
                settings_json = EXCLUDED.settings_json,
                updated_at = NOW();
            `, [JSON.stringify(settings)]);
            this.invalidateCacheKeys("public:settings");
            return true;
          } catch (retryErr) {
            console.error("[PostgreSQL Retry Save Error] saveSettings:", retryErr);
          }
        }
        console.error("[PostgreSQL Save Error] saveSettings:", err);
      }
    }
    this.writeLocalFile("settings.json", settings);
    this.invalidateCacheKeys("public:settings");
    return true;
  }

  // ===================== HOMEPAGE CONTENT =====================

  public async getHomepageContent(): Promise<HomepageContent> {
    const cacheKey = "public:homepage";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.homepage, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("homepage_content");
          const doc = await coll.findOne({ id: "main" });
          if (doc) {
            const { _id, id, updatedAt, ...rest } = doc;
            const parsed = rest.content_json ? (typeof rest.content_json === "string" ? JSON.parse(rest.content_json) : rest.content_json) : rest;
            if (parsed && (parsed.sihDetails || parsed.heroTitle || parsed.heroSubtitle)) {
              return parsed as HomepageContent;
            }
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getHomepageContent:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT content_json FROM homepage_content WHERE id = 'main' LIMIT 1`);
          if (res.rows.length > 0 && res.rows[0].content_json) {
            return JSON.parse(res.rows[0].content_json) as HomepageContent;
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getHomepageContent:", err);
        }
      }
      return this.readLocalFile<HomepageContent>("homepage_content.json", defaultHomepageContent);
    });
  }

  public async saveHomepageContent(content: HomepageContent): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("homepage_content");
        await coll.updateOne(
          { id: "main" },
          { $set: { id: "main", ...content, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveHomepageContent:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO homepage_content (id, content_json, updated_at)
          VALUES ('main', $1, NOW())
          ON CONFLICT (id) DO UPDATE SET
            content_json = EXCLUDED.content_json,
            updated_at = NOW();
        `, [JSON.stringify(content)]);
        this.invalidateCacheKeys("public:homepage");
        return true;
      } catch (err: any) {
        if (err && (err.message?.includes("updated_at") || err.code === "42703")) {
          try {
            await this.pgPool.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
            await this.pgPool.query(`
              INSERT INTO homepage_content (id, content_json, updated_at)
              VALUES ('main', $1, NOW())
              ON CONFLICT (id) DO UPDATE SET
                content_json = EXCLUDED.content_json,
                updated_at = NOW();
            `, [JSON.stringify(content)]);
            this.invalidateCacheKeys("public:homepage");
            return true;
          } catch (retryErr) {
            console.error("[PostgreSQL Retry Save Error] saveHomepageContent:", retryErr);
          }
        }
        console.error("[PostgreSQL Save Error] saveHomepageContent:", err);
      }
    }
    this.writeLocalFile("homepage_content.json", content);
    this.invalidateCacheKeys("public:homepage");
    return true;
  }

  // ===================== CUSTOM PAGES =====================

  public async getCustomPages(): Promise<CustomPage[]> {
    const cacheKey = "public:custom_pages";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.customPages, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("custom_pages");
          const docs = await coll.find({}).sort({ createdAt: 1 }).toArray();
          if (docs && docs.length > 0) {
            return docs.map(({ _id, ...rest }) => rest as CustomPage);
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getCustomPages:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT * FROM custom_pages ORDER BY created_at ASC`);
          if (res.rows && res.rows.length > 0) {
            return res.rows.map(r => ({
              id: r.id,
              slug: r.slug,
              title: r.title,
              content: r.content,
              published: r.published !== false,
              createdAt: r.created_at
            }));
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getCustomPages:", err);
        }
      }
      return this.readLocalFile<CustomPage[]>("custom_pages.json", defaultCustomPages);
    });
  }

  public async saveCustomPages(pages: CustomPage[]): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("custom_pages");
        await coll.deleteMany({});
        if (pages.length > 0) {
          await coll.insertMany(pages.map(p => ({ ...p })));
        }
      } catch (err) {
        console.error("[MongoDB Save Error] saveCustomPages:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM custom_pages`);
        for (const p of pages) {
          await this.pgPool.query(`
            INSERT INTO custom_pages (id, slug, title, content, published, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [p.id, p.slug, p.title, p.content, p.published ?? true, p.createdAt || new Date().toISOString()]);
        }
        this.invalidateCacheKeys("public:custom_pages");
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveCustomPages:", err);
      }
    }
    this.writeLocalFile("custom_pages.json", pages);
    this.invalidateCacheKeys("public:custom_pages");
    return true;
  }

  public async saveCustomPage(page: CustomPage): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("custom_pages");
        await coll.updateOne(
          { id: page.id },
          { $set: { ...page, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveCustomPage:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO custom_pages (id, slug, title, content, published, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            published = EXCLUDED.published;
        `, [page.id, page.slug, page.title, page.content, page.published ?? true, page.createdAt || new Date().toISOString()]);
        this.invalidateCacheKeys("public:custom_pages");
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveCustomPage:", err);
      }
    }
    const local = this.readLocalFile<CustomPage[]>("custom_pages.json", defaultCustomPages);
    const idx = local.findIndex(p => p.id === page.id);
    if (idx >= 0) local[idx] = page;
    else local.push(page);
    this.writeLocalFile("custom_pages.json", local);
    this.invalidateCacheKeys("public:custom_pages");
    return true;
  }

  public async deleteCustomPage(id: string): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("custom_pages");
        await coll.deleteOne({ $or: [{ id }, { slug: id }] });
      } catch (err) {
        console.error("[MongoDB Delete Error] deleteCustomPage:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM custom_pages WHERE id = $1 OR slug = $1`, [id]);
        this.invalidateCacheKeys("public:custom_pages");
        return true;
      } catch (err) {
        console.error("[PostgreSQL Delete Error] deleteCustomPage:", err);
      }
    }
    const local = this.readLocalFile<CustomPage[]>("custom_pages.json", defaultCustomPages);
    const filtered = local.filter(p => p.id !== id && p.slug !== id);
    this.writeLocalFile("custom_pages.json", filtered);
    this.invalidateCacheKeys("public:custom_pages");
    return true;
  }

  // ===================== MENU ITEMS =====================

  public async getMenuItems(): Promise<MenuItem[]> {
    const cacheKey = "public:menu_items";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.menuItems, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("menu_items");
          const docs = await coll.find({}).sort({ order: 1, sort_order: 1 }).toArray();
          if (docs && docs.length > 0) {
            return docs.map(({ _id, ...rest }) => rest as MenuItem);
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getMenuItems:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT * FROM menu_items ORDER BY sort_order ASC`);
          if (res.rows && res.rows.length > 0) {
            return res.rows.map(r => ({
              id: r.id,
              label: r.label,
              type: r.type as any,
              target: r.target,
              order: r.sort_order
            }));
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getMenuItems:", err);
        }
      }
      return this.readLocalFile<MenuItem[]>("menu_items.json", defaultMenuItems);
    });
  }

  public async saveMenuItems(items: MenuItem[]): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("menu_items");
        await coll.deleteMany({});
        if (items.length > 0) {
          await coll.insertMany(items.map((m, idx) => ({ ...m, order: idx })));
        }
      } catch (err) {
        console.error("[MongoDB Save Error] saveMenuItems:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM menu_items`);
        for (let i = 0; i < items.length; i++) {
          const m = items[i];
          await this.pgPool.query(`
            INSERT INTO menu_items (id, label, type, target, sort_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [m.id, m.label, m.type, m.target, i]);
        }
        this.invalidateCacheKeys("public:menu_items");
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveMenuItems:", err);
      }
    }
    this.writeLocalFile("menu_items.json", items);
    this.invalidateCacheKeys("public:menu_items");
    return true;
  }

  // ===================== LIVE UPDATES =====================

  public async getLiveUpdates(): Promise<LiveUpdate[]> {
    const cacheKey = "public:live_updates";
    return this.getCachedValue(cacheKey, this.cacheTtlMs.liveUpdates, async () => {
      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("live_updates");
          const docs = await coll.find({}).sort({ createdAt: -1 }).toArray();
          if (docs && docs.length > 0) {
            return docs.map(({ _id, ...rest }) => rest as LiveUpdate);
          }
        } catch (err) {
          console.error("[MongoDB Query Error] getLiveUpdates:", err);
        }
      }
      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT * FROM live_updates ORDER BY created_at DESC`);
          if (res.rows && res.rows.length > 0) {
            return res.rows.map(r => ({
              id: r.id,
              text: r.text,
              isImportant: !!r.is_important,
              createdAt: r.created_at
            }));
          }
        } catch (err) {
          console.error("[PostgreSQL Query Error] getLiveUpdates:", err);
        }
      }
      return this.readLocalFile<LiveUpdate[]>("updates.json", [
        { id: "1", text: "Registrations are now open for Sri Vasavi Internal Hackathon 2026!", createdAt: new Date().toISOString(), isImportant: true },
        { id: "2", text: "Important: Every team must have at least one female member.", createdAt: new Date().toISOString(), isImportant: false },
        { id: "3", text: "All teams must submit their abstract PPT before the deadline.", createdAt: new Date().toISOString(), isImportant: false }
      ]);
    });
  }

  public async saveLiveUpdates(updates: LiveUpdate[]): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("live_updates");
        await coll.deleteMany({});
        if (updates.length > 0) {
          await coll.insertMany(updates.map(u => ({ ...u })));
        }
      } catch (err) {
        console.error("[MongoDB Save Error] saveLiveUpdates:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM live_updates`);
        for (const u of updates) {
          await this.pgPool.query(`
            INSERT INTO live_updates (id, text, is_important, created_at)
            VALUES ($1, $2, $3, $4)
          `, [u.id, u.text, !!u.isImportant, u.createdAt || new Date().toISOString()]);
        }
        this.invalidateCacheKeys("public:live_updates");
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveLiveUpdates:", err);
      }
    }
    this.writeLocalFile("updates.json", updates);
    this.invalidateCacheKeys("public:live_updates");
    return true;
  }

  // ===================== BROADCAST LOGS =====================

  public async getBroadcastLogs(): Promise<BroadcastLog[]> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("broadcast_logs");
        const docs = await coll.find({}).sort({ timestamp: -1 }).limit(500).toArray();
        if (docs && docs.length > 0) {
          return docs.map(({ _id, ...rest }) => rest as BroadcastLog);
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getBroadcastLogs:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM broadcast_logs ORDER BY timestamp DESC LIMIT 500`);
        return res.rows.map(r => ({
          id: r.id,
          channel: r.channel as any,
          recipient: r.recipient,
          teamName: r.team_name,
          subject: r.subject,
          preview: r.preview,
          status: r.status as any,
          timestamp: r.timestamp,
          error: r.error
        }));
      } catch (err) {
        console.error("[PostgreSQL Query Error] getBroadcastLogs:", err);
      }
    }
    return this.readLocalFile<BroadcastLog[]>("broadcast_logs.json", []);
  }

  public async saveBroadcastLog(log: BroadcastLog): Promise<boolean> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("broadcast_logs");
        await coll.updateOne(
          { id: log.id },
          { $set: { ...log } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveBroadcastLog:", err);
      }
    }
    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO broadcast_logs (id, channel, recipient, team_name, subject, preview, status, timestamp, error)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING;
        `, [log.id, log.channel, log.recipient, log.teamName || null, log.subject || null, log.preview, log.status, log.timestamp, log.error || null]);
        return true;
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveBroadcastLog:", err);
      }
    }
    const local = this.readLocalFile<BroadcastLog[]>("broadcast_logs.json", []);
    local.unshift(log);
    if (local.length > 500) local.splice(500);
    this.writeLocalFile("broadcast_logs.json", local);
    return true;
  }

  public async saveBroadcastLogs(logs: BroadcastLog[]): Promise<boolean> {
    for (const l of logs) {
      await this.saveBroadcastLog(l);
    }
    return true;
  }

  // ===================== PERSISTENT APP FILES & MEDIA =====================

  public async saveFileRecord(file: {
    category: string;
    filename: string;
    originalName?: string;
    mimeType: string;
    size: number;
    dataBase64?: string;
    buffer?: Buffer;
  }): Promise<boolean> {
    const id = `${file.category}/${file.filename}`;
    const base64 = file.dataBase64 || (file.buffer ? `data:${file.mimeType};base64,${file.buffer.toString("base64")}` : "");
    if (!base64) return false;

    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("app_files");
        await coll.updateOne(
          { id },
          {
            $set: {
              id,
              category: file.category,
              filename: file.filename,
              originalName: file.originalName || file.filename,
              mimeType: file.mimeType,
              size: file.size,
              dataBase64: base64,
              data_base64: base64,
              updatedAt: new Date().toISOString()
            }
          },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB Save Error] saveFileRecord:", err);
      }
    }

    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO app_files (id, category, filename, original_name, mime_type, size, data_base64, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (id) DO UPDATE SET
            original_name = EXCLUDED.original_name,
            mime_type = EXCLUDED.mime_type,
            size = EXCLUDED.size,
            data_base64 = EXCLUDED.data_base64,
            updated_at = NOW();
        `, [id, file.category, file.filename, file.originalName || file.filename, file.mimeType, file.size, base64]);
      } catch (err) {
        console.error("[PostgreSQL Save Error] saveFileRecord:", err);
      }
    }

    // Local JSON cache fallback (stores index/content so it survives local reload)
    const localStore = this.readLocalFile<Record<string, any>>("files_store.json", {});
    localStore[id] = {
      id,
      category: file.category,
      filename: file.filename,
      originalName: file.originalName || file.filename,
      mimeType: file.mimeType,
      size: file.size,
      dataBase64: base64,
      updatedAt: new Date().toISOString()
    };
    this.writeLocalFile("files_store.json", localStore);
    return true;
  }

  public async getFileRecord(category: string, filename: string): Promise<{
    id: string;
    category: string;
    filename: string;
    originalName?: string;
    mimeType: string;
    size: number;
    dataBase64: string;
  } | null> {
    const id = `${category}/${filename}`;

    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("app_files");
        const doc = await coll.findOne({
          $or: [
            { id },
            { category, filename },
            { filename },
            { id: { $regex: filename + "$" } }
          ]
        });
        if (doc) {
          return {
            id: doc.id,
            category: doc.category,
            filename: doc.filename,
            originalName: doc.originalName || doc.filename,
            mimeType: doc.mimeType || doc.mime_type || "application/octet-stream",
            size: Number(doc.size),
            dataBase64: doc.dataBase64 || doc.data_base64
          };
        }
      } catch (err) {
        console.error("[MongoDB Query Error] getFileRecord:", err);
      }
    }

    if (this.isPostgresActive && this.pgPool) {
      try {
        const res = await this.pgPool.query(`
          SELECT * FROM app_files 
          WHERE (id = $1) 
             OR (category = $2 AND filename = $3) 
             OR (filename = $3)
             OR (id LIKE '%' || $3)
          ORDER BY updated_at DESC LIMIT 1
        `, [id, category, filename]);
        if (res.rows && res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            category: r.category,
            filename: r.filename,
            originalName: r.original_name,
            mimeType: r.mime_type,
            size: Number(r.size),
            dataBase64: r.data_base64
          };
        }
      } catch (err) {
        console.error("[PostgreSQL Query Error] getFileRecord:", err);
      }
    }

    const localStore = this.readLocalFile<Record<string, any>>("files_store.json", {});
    const record = localStore[id];
    if (record) {
      return record;
    }
    // Search by filename in case id key format differs or category is flexible
    for (const key in localStore) {
      if (localStore[key]?.filename === filename || key.endsWith(`/${filename}`) || localStore[key]?.originalName === filename) {
        return localStore[key];
      }
    }

    return null;
  }

  public async deleteFileRecord(category: string, filename: string): Promise<boolean> {
    const id = `${category}/${filename}`;

    if (this.isMongoActive && this.mongoDb) {
      try {
        const coll = this.mongoDb.collection("app_files");
        await coll.deleteMany({
          $or: [{ id }, { category, filename }, { filename }]
        });
      } catch (err) {
        console.error("[MongoDB Delete Error] deleteFileRecord:", err);
      }
    }

    if (this.isPostgresActive && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM app_files WHERE id = $1 OR (category = $2 AND filename = $3) OR filename = $3`, [id, category, filename]);
      } catch (err) {
        console.error("[PostgreSQL Delete Error] deleteFileRecord:", err);
      }
    }
    const localStore = this.readLocalFile<Record<string, any>>("files_store.json", {});
    delete localStore[id];
    for (const k in localStore) {
      if (localStore[k]?.filename === filename) delete localStore[k];
    }
    this.writeLocalFile("files_store.json", localStore);
    return true;
  }

  public async syncAllFilesToDisk(): Promise<{ restoredCount: number }> {
    let restoredCount = 0;
    try {
      const uploadsDir = path.join(DATA_DIR, "uploads");
      const rootUploadsDir = path.join(process.cwd(), "uploads");
      
      const categoryDirMap: Record<string, string> = {
        ppts: path.join(uploadsDir, "ppts"),
        images: path.join(uploadsDir, "images"),
        documents: path.join(uploadsDir, "documents"),
        sample_ppts: path.join(uploadsDir, "sample_ppts"),
        abstracts: path.join(uploadsDir, "documents"),
        gallery: path.join(uploadsDir, "images"),
        homepage: path.join(uploadsDir, "images"),
        logos: path.join(uploadsDir, "images"),
        certificates: path.join(uploadsDir, "images"),
        media: path.join(uploadsDir, "documents"),
        payment_proofs: path.join(uploadsDir, "payment_proofs"),
        upi_qr: path.join(uploadsDir, "upi_qr")
      };

      // 1. Gather all file records from PostgreSQL and MongoDB
      const filesToRestore: Array<{
        category: string;
        filename: string;
        originalName?: string;
        mimeType: string;
        dataBase64: string;
      }> = [];

      if (this.isMongoActive && this.mongoDb) {
        try {
          const coll = this.mongoDb.collection("app_files");
          const docs = await coll.find({}).toArray();
          if (docs && docs.length > 0) {
            for (const doc of docs) {
              const b64 = doc.dataBase64 || doc.data_base64;
              if (doc.filename && b64) {
                filesToRestore.push({
                  category: doc.category || "images",
                  filename: doc.filename,
                  originalName: doc.originalName || doc.filename,
                  mimeType: doc.mimeType || doc.mime_type || "application/octet-stream",
                  dataBase64: b64
                });
              }
            }
          }
        } catch (err) {
          console.error("[MongoDB Storage Hydration Error] Querying app_files:", err);
        }
      }

      if (this.isPostgresActive && this.pgPool) {
        try {
          const res = await this.pgPool.query(`SELECT category, filename, original_name, mime_type, data_base64 FROM app_files`);
          if (res.rows && res.rows.length > 0) {
            for (const r of res.rows) {
              if (!filesToRestore.some(f => f.filename === r.filename)) {
                filesToRestore.push({
                  category: r.category,
                  filename: r.filename,
                  originalName: r.original_name,
                  mimeType: r.mime_type,
                  dataBase64: r.data_base64
                });
              }
            }
          }
        } catch (err) {
          console.error("[Storage Hydration Error] Querying app_files:", err);
        }
      }

      // Also incorporate from files_store.json
      const localStore = this.readLocalFile<Record<string, any>>("files_store.json", {});
      for (const key in localStore) {
        const item = localStore[key];
        if (item && item.filename && item.dataBase64) {
          if (!filesToRestore.some(f => f.filename === item.filename)) {
            filesToRestore.push(item);
          }
        }
      }

      // 2. Write missing files onto disk in all relevant upload directories
      for (const item of filesToRestore) {
        try {
          const cat = item.category || "images";
          const targetDir = categoryDirMap[cat] || path.join(uploadsDir, cat);
          const directCatDir = path.join(uploadsDir, cat);
          const rootCatDir = path.join(rootUploadsDir, cat);

          const dirsToEnsure = [targetDir, directCatDir, rootCatDir];
          for (const d of dirsToEnsure) {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
          }

          const cleanBase64 = item.dataBase64.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(cleanBase64, "base64");
          if (buffer.length > 0) {
            let written = false;
            for (const d of dirsToEnsure) {
              const targetPath = path.join(d, item.filename);
              if (!fs.existsSync(targetPath)) {
                fs.writeFileSync(targetPath, buffer);
                written = true;
              }
            }
            if (written) restoredCount++;

            // Ensure cached in files_store.json
            const id = `${cat}/${item.filename}`;
            if (!localStore[id]) {
              localStore[id] = {
                id,
                category: cat,
                filename: item.filename,
                originalName: item.originalName || item.filename,
                mimeType: item.mimeType || "application/octet-stream",
                size: buffer.length,
                dataBase64: item.dataBase64
              };
            }
          }
        } catch (fileErr) {
          console.error(`[Storage Hydration] Error restoring ${item.category}/${item.filename}:`, fileErr);
        }
      }
      this.writeLocalFile("files_store.json", localStore);

      // 3. Hydrate from registrations pptBase64
      const registrations = await this.getRegistrations();
      for (const reg of registrations) {
        if (reg.pptBase64) {
          try {
            let filename = reg.pptFileName;
            if (reg.pptFileUrl) {
              filename = path.basename(reg.pptFileUrl);
            }
            if (!filename) {
              filename = `${reg.teamName || reg.id || "team"}_presentation.pptx`;
            }
            const pptsDir = categoryDirMap["ppts"];
            if (!fs.existsSync(pptsDir)) fs.mkdirSync(pptsDir, { recursive: true });
            const targetPath = path.join(pptsDir, filename);
            if (!fs.existsSync(targetPath)) {
              const cleanBase64 = reg.pptBase64.replace(/^data:[^;]+;base64,/, "");
              const buffer = Buffer.from(cleanBase64, "base64");
              if (buffer.length > 0) {
                fs.writeFileSync(targetPath, buffer);
                restoredCount++;
                await this.saveFileRecord({
                  category: "ppts",
                  filename,
                  originalName: reg.pptFileName || filename,
                  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                  size: buffer.length,
                  buffer
                });
              }
            }
          } catch (e) {}
        }
      }

      // 4. Hydrate from settings samplePptFileBase64 & manualUpiQrBase64
      const settings = await this.getSettings();
      if (settings.samplePptFileBase64) {
        try {
          const filename = settings.samplePptFileName || (settings.samplePptFileUrl ? path.basename(settings.samplePptFileUrl) : "sample_template.pptx");
          const sampleDir = categoryDirMap["sample_ppts"];
          if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });
          const targetPath = path.join(sampleDir, filename);
          if (!fs.existsSync(targetPath)) {
            const cleanBase64 = settings.samplePptFileBase64.replace(/^data:[^;]+;base64,/, "");
            const buffer = Buffer.from(cleanBase64, "base64");
            if (buffer.length > 0) {
              fs.writeFileSync(targetPath, buffer);
              restoredCount++;
              await this.saveFileRecord({
                category: "sample_ppts",
                filename,
                originalName: settings.samplePptFileName || filename,
                mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                size: buffer.length,
                buffer
              });
            }
          }
        } catch (e) {}
      }

      if (restoredCount > 0) {
        console.log(`✅ [Storage Hydration] Successfully auto-restored ${restoredCount} uploaded files/images from persistent database storage to disk.`);
      }
    } catch (err) {
      console.error("[Storage Hydration Global Error]:", err);
    }
    return { restoredCount };
  }

  /**
   * Synchronizes all state from external database (PostgreSQL or MongoDB) into local JSON disk cache
   * so that local reads and file backups never revert across restarts.
   */
  public async syncDatabaseStateToLocalDisk(): Promise<void> {
    if (this.isMongoActive && this.mongoDb) {
      try {
        // 1. Settings from MongoDB
        const sColl = this.mongoDb.collection("app_settings");
        const sDoc = await sColl.findOne({ $or: [{ id: "main" }, { id: "system_settings" }, { id: "global_settings" }] });
        if (sDoc) {
          const { _id, id, ...rest } = sDoc;
          let parsed: any = rest;
          if (rest.settings_json) {
            parsed = typeof rest.settings_json === "string" ? JSON.parse(rest.settings_json) : rest.settings_json;
          }
          const existing = this.readLocalFile<FeeConfig>("settings.json", {} as any);
          const merged = { ...existing, ...parsed };
          if (merged.dbEnabled === undefined) merged.dbEnabled = true;
          this.writeLocalFile("settings.json", merged);
        } else {
          // If empty in MongoDB, seed local settings to prevent reset
          const existing = this.readLocalFile<FeeConfig>("settings.json", {} as any);
          if (existing && Object.keys(existing).length > 0) {
            await this.saveSettings(existing);
          }
        }

        // 2. Homepage Content from MongoDB
        const hpColl = this.mongoDb.collection("homepage_content");
        const hpDoc = await hpColl.findOne({ id: "main" });
        if (hpDoc) {
          const { _id, id, updatedAt, ...rest } = hpDoc;
          const parsedHp = rest.content_json ? (typeof rest.content_json === "string" ? JSON.parse(rest.content_json) : rest.content_json) : rest;
          if (parsedHp && (parsedHp.sihDetails || parsedHp.heroTitle)) {
            this.writeLocalFile("homepage_content.json", parsedHp);
          }
        }

        // 3. Custom Pages from MongoDB
        const cpColl = this.mongoDb.collection("custom_pages");
        const cpDocs = await cpColl.find({}).sort({ createdAt: 1 }).toArray();
        if (cpDocs && cpDocs.length > 0) {
          const pages: CustomPage[] = cpDocs.map(({ _id, ...rest }) => rest as CustomPage);
          this.writeLocalFile("custom_pages.json", pages);
        }

        // 4. Menu Items from MongoDB
        const mColl = this.mongoDb.collection("menu_items");
        const mDocs = await mColl.find({}).sort({ order: 1, sort_order: 1 }).toArray();
        if (mDocs && mDocs.length > 0) {
          const items: MenuItem[] = mDocs.map(({ _id, ...rest }) => rest as MenuItem);
          this.writeLocalFile("menu_items.json", items);
        }

        // 5. Live Updates from MongoDB
        const uColl = this.mongoDb.collection("live_updates");
        const uDocs = await uColl.find({}).sort({ createdAt: -1 }).toArray();
        if (uDocs && uDocs.length > 0) {
          const updates: LiveUpdate[] = uDocs.map(({ _id, ...rest }) => rest as LiveUpdate);
          this.writeLocalFile("updates.json", updates);
        }

        // 6. Problem Statements from MongoDB
        const psColl = this.mongoDb.collection("problem_statements");
        const psDocs = await psColl.find({}).sort({ sortOrder: 1, id: 1 }).toArray();
        if (psDocs && psDocs.length > 0) {
          const statements: ProblemStatement[] = psDocs.map(({ _id, sortOrder, ...rest }) => rest as ProblemStatement);
          this.writeLocalFile("problem_statements.json", statements);
        } else {
          // If empty in MongoDB, seed from local or settings backup so redeployment never wipes
          const localStatements = this.readLocalFile<ProblemStatement[]>("problem_statements.json", []);
          if (localStatements && localStatements.length > 0) {
            await this.saveProblemStatements(localStatements);
          }
        }

        // 7. Evaluation Criteria from MongoDB
        const critColl = this.mongoDb.collection("evaluation_criteria");
        const critDocs = await critColl.find({}).sort({ sortOrder: 1, id: 1 }).toArray();
        if (critDocs && critDocs.length > 0) {
          const criteria: EvaluationCriterion[] = critDocs.map(({ _id, sortOrder, ...rest }) => rest as EvaluationCriterion);
          this.writeLocalFile("evaluation_criteria.json", criteria);
        }

        // 8. Registrations from MongoDB
        const regColl = this.mongoDb.collection("registrations");
        const regDocs = await regColl.find({}).sort({ createdAt: -1, created_at: -1 }).toArray();
        if (regDocs && regDocs.length > 0) {
          const regs: Registration[] = regDocs.map(({ _id, ...rest }) => rest as Registration);
          this.writeLocalFile("registrations.json", regs);
        }

        // 9. Students from MongoDB
        const studColl = this.mongoDb.collection("students");
        const studDocs = await studColl.find({}).toArray();
        if (studDocs && studDocs.length > 0) {
          const students: Student[] = studDocs.map(({ _id, ...rest }) => rest as Student);
          this.writeLocalFile("students.json", students);
        }

        // 10. Admins from MongoDB
        const admColl = this.mongoDb.collection("admins");
        const admDocs = await admColl.find({}).toArray();
        if (admDocs && admDocs.length > 0) {
          const admins = admDocs.map(({ _id, ...rest }) => rest as any);
          this.writeLocalFile("admins.json", admins);
        }

        // 11. Evaluations & Payments from MongoDB
        const evalColl = this.mongoDb.collection("team_evaluations");
        const evalDocs = await evalColl.find({}).toArray();
        if (evalDocs && evalDocs.length > 0) {
          const evals = evalDocs.map(({ _id, ...rest }) => rest);
          this.writeLocalFile("evaluations.json", evals);
        }

        const payColl = this.mongoDb.collection("payment_transactions");
        const payDocs = await payColl.find({}).toArray();
        if (payDocs && payDocs.length > 0) {
          const payments = payDocs.map(({ _id, ...rest }) => rest as PaymentTransaction);
          this.writeLocalFile("payments.json", payments);
        }

        console.log("✅ [Database State Sync] Local disk cache successfully updated with latest MongoDB state.");
        return;
      } catch (mongoSyncErr: any) {
        console.warn("[MongoDB State Sync Warning]:", mongoSyncErr.message);
      }
    }

    if (!this.isPostgresActive || !this.pgPool) return;

    try {
      // 1. Settings
      const sRes = await this.pgPool.query(`SELECT settings_json FROM app_settings WHERE id = 'main' OR id = 'global_settings' LIMIT 1`);
      if (sRes.rows.length > 0 && sRes.rows[0].settings_json) {
        const parsed = typeof sRes.rows[0].settings_json === "string" ? JSON.parse(sRes.rows[0].settings_json) : sRes.rows[0].settings_json;
        const existing = this.readLocalFile<FeeConfig>("settings.json", {} as any);
        const merged = { ...existing, ...parsed };
        if (merged.dbEnabled === undefined) merged.dbEnabled = true;
        this.writeLocalFile("settings.json", merged);
      } else {
        // If app_settings table exists but is empty, seed local settings to DB to prevent reset on redeployment
        const existing = this.readLocalFile<FeeConfig>("settings.json", {} as any);
        if (existing && Object.keys(existing).length > 0) {
          await this.saveSettings(existing);
        }
      }

      // 2. Homepage
      const hpRes = await this.pgPool.query(`SELECT content_json FROM homepage_content WHERE id = 'main' LIMIT 1`);
      if (hpRes.rows.length > 0 && hpRes.rows[0].content_json) {
        const parsedHp = JSON.parse(hpRes.rows[0].content_json);
        if (parsedHp.sihDetails) {
          this.writeLocalFile("homepage_content.json", parsedHp);
        }
      }

      // 3. Custom Pages
      const cpRes = await this.pgPool.query(`SELECT * FROM custom_pages ORDER BY created_at ASC`);
      if (cpRes.rows.length > 0) {
        const pages: CustomPage[] = cpRes.rows.map(r => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          content: r.content,
          published: r.published !== false,
          createdAt: r.created_at
        }));
        this.writeLocalFile("custom_pages.json", pages);
      }

      // 4. Menu Items
      const mRes = await this.pgPool.query(`SELECT * FROM menu_items ORDER BY sort_order ASC`);
      if (mRes.rows.length > 0) {
        const items: MenuItem[] = mRes.rows.map(r => ({
          id: r.id,
          label: r.label,
          type: r.type as any,
          target: r.target,
          order: r.sort_order
        }));
        this.writeLocalFile("menu_items.json", items);
      }

      // 5. Live Updates
      const uRes = await this.pgPool.query(`SELECT * FROM live_updates ORDER BY created_at DESC`);
      if (uRes.rows.length > 0) {
        const updates: LiveUpdate[] = uRes.rows.map(r => ({
          id: r.id,
          text: r.text,
          isImportant: !!r.is_important,
          createdAt: r.created_at
        }));
        this.writeLocalFile("updates.json", updates);
      }

      // 6. Problem Statements
      try {
        let psRes: any;
        try {
          psRes = await this.pgPool.query(`SELECT * FROM problem_statements ORDER BY sort_order ASC, id ASC`);
        } catch {
          psRes = await this.pgPool.query(`SELECT * FROM problem_statements ORDER BY id ASC`);
        }
        if (psRes.rows.length > 0) {
          const statements: ProblemStatement[] = psRes.rows.map((r: any) => ({
            id: r.id,
            code: r.code,
            title: r.title,
            category: r.category,
            organization: r.organization,
            description: r.description || ""
          }));
          this.writeLocalFile("problem_statements.json", statements);
        } else {
          // If problem_statements table is empty, attempt restore from app_settings backup or local file
          let restoredFromBackup = false;
          try {
            const bRes = await this.pgPool.query(`SELECT settings_json FROM app_settings WHERE id = 'problem_statements_backup' LIMIT 1`);
            if (bRes.rows.length > 0 && bRes.rows[0].settings_json) {
              const parsedBackup = typeof bRes.rows[0].settings_json === "string" ? JSON.parse(bRes.rows[0].settings_json) : bRes.rows[0].settings_json;
              if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
                await this.saveProblemStatements(parsedBackup);
                restoredFromBackup = true;
              }
            }
          } catch (bErr) {}

          if (!restoredFromBackup) {
            const localStatements = this.readLocalFile<ProblemStatement[]>("problem_statements.json", []);
            if (localStatements && localStatements.length > 0) {
              await this.saveProblemStatements(localStatements);
            }
          }
        }
      } catch (psErr: any) {
        console.warn("[PostgreSQL Sync] Problem statements notice:", psErr.message);
      }

      // 7. Evaluation Criteria
      const critRes = await this.pgPool.query(`SELECT * FROM evaluation_criteria ORDER BY sort_order ASC`);
      if (critRes.rows.length > 0) {
        const criteria: EvaluationCriterion[] = critRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          maxScore: r.max_score || 10,
          description: r.description || ""
        }));
        this.writeLocalFile("evaluation_criteria.json", criteria);
      }

      // 8. Registrations / Teams
      const regRes = await this.pgPool.query(`SELECT * FROM registrations ORDER BY created_at DESC`);
      if (regRes.rows.length > 0) {
        const regs = regRes.rows.map(r => this.mapSqlRowToRegistration(r));
        this.writeLocalFile("registrations.json", regs);
      }

      // 9. Students
      const studRes = await this.pgPool.query(`SELECT * FROM students`);
      if (studRes.rows.length > 0) {
        const students: Student[] = studRes.rows.map(r => ({
          id: r.id,
          email: r.email,
          passwordHash: r.password_hash || r.password || "",
          name: r.name || "",
          gender: r.gender || "",
          department: r.department || "",
          mobile: r.mobile || "",
          academicYear: r.academic_year || "",
          rollNumber: r.roll_number || "",
          createdAt: r.created_at || new Date().toISOString()
        }));
        this.writeLocalFile("students.json", students);
      }

      // 10. Admins
      const admRes = await this.pgPool.query(`SELECT * FROM admins`);
      if (admRes.rows.length > 0) {
        const admins = admRes.rows.map(r => ({
          username: r.username,
          passwordHash: r.password_hash,
          role: r.role,
          department: r.department || ""
        }));
        this.writeLocalFile("admins.json", admins);
      }

      console.log("✅ [Database State Sync] Local disk cache successfully updated with latest PostgreSQL state.");
    } catch (err: any) {
      console.warn("[Database State Sync Warning]:", err.message);
    }
  }

  // ===================== HELPERS =====================

  private mapSqlRowToRegistration(row: any): Registration {
    let evaluatorScores: any = undefined;
    try {
      if (row.evaluator_scores) evaluatorScores = JSON.parse(row.evaluator_scores);
    } catch (e) {}

    return {
      id: row.id,
      registrationId: row.registration_id,
      teamName: row.team_name,
      leadName: row.lead_name,
      leadDepartment: row.lead_department,
      leadMobile: row.lead_mobile,
      leadGender: row.lead_gender,
      leadAcademicYear: row.lead_academic_year,
      member1: row.member1,
      member1Gender: row.member1_gender,
      member1Email: row.member1_email,
      member1Phone: row.member1_phone,
      member1AcademicYear: row.member1_academic_year,
      member2: row.member2,
      member2Gender: row.member2_gender,
      member2Email: row.member2_email,
      member2Phone: row.member2_phone,
      member2AcademicYear: row.member2_academic_year,
      member3: row.member3,
      member3Gender: row.member3_gender,
      member3Email: row.member3_email,
      member3Phone: row.member3_phone,
      member3AcademicYear: row.member3_academic_year,
      member4: row.member4,
      member4Gender: row.member4_gender,
      member4Email: row.member4_email,
      member4Phone: row.member4_phone,
      member4AcademicYear: row.member4_academic_year,
      member5: row.member5,
      member5Gender: row.member5_gender,
      member5Email: row.member5_email,
      member5Phone: row.member5_phone,
      member5AcademicYear: row.member5_academic_year,
      hasFemaleMember: !!row.has_female_member,
      mentorName: row.mentor_name,
      problemStatementId: row.problem_statement_id,
      submittedAt: row.submitted_at,
      studentEmail: row.student_email,
      paymentStatus: row.payment_status || "free",
      paymentId: row.payment_id,
      orderId: row.order_id,
      amountPaid: row.amount_paid ? Number(row.amount_paid) : undefined,
      abstract: row.abstract,
      implementationSteps: row.implementation_steps,
      pptFileName: row.ppt_file_name,
      pptFileUrl: row.ppt_file_url,
      pptBase64: row.ppt_base64,
      proposalStatus: row.proposal_status,
      approvalStatus: row.approval_status || "pending",
      approvalNotes: row.approval_notes,
      verifiedAt: row.verified_at,
      verifiedBy: row.verified_by,
      isFinalSelected: !!row.is_final_selected,
      selectionNotes: row.selection_notes,
      assignedEvaluator: row.assigned_evaluator,
      evaluatorScores,
      evaluationNotes: row.evaluation_notes,
      evaluationStatus: row.evaluation_status || "pending"
    };
  }

  public readLocalFile<T>(filename: string, fallback: T): T {
    try {
      const fullPath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(fullPath)) {
        // If file missing in DATA_DIR (e.g. on serverless /tmp), attempt to read from seed data/ directory
        const bundledPath = path.join(process.cwd(), "data", filename);
        if (bundledPath !== fullPath && fs.existsSync(bundledPath)) {
          const content = fs.readFileSync(bundledPath, "utf-8");
          try {
            fs.writeFileSync(fullPath, content, "utf-8");
          } catch (writeErr) {}
          return JSON.parse(content) as T;
        }
        return fallback;
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      return JSON.parse(content) as T;
    } catch (e) {
      return fallback;
    }
  }

  public writeLocalFile<T>(filename: string, data: T): void {
    try {
      const fullPath = path.join(DATA_DIR, filename);
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf-8");
      // Also persist to bundled data/ directory so redeployments and git checkpoints retain settings
      const bundledPath = path.join(process.cwd(), "data", filename);
      if (bundledPath !== fullPath) {
        try {
          fs.writeFileSync(bundledPath, JSON.stringify(data, null, 2), "utf-8");
        } catch (be) {}
      }
    } catch (e) {
      console.error(`Error writing to local file ${filename}:`, e);
    }
  }
}

export const db = new DatabaseManager();
