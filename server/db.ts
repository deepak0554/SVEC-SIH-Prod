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

export interface BroadcastLog {
  id: string;
  channel: "email" | "sms" | "whatsapp";
  recipient: string;
  teamName?: string;
  subject?: string;
  preview: string;
  status: "sent" | "failed";
  timestamp: string;
  error?: string;
}

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = process.env.DATA_DIR || (IS_VERCEL ? "/tmp/svec_data" : path.join(process.cwd(), "data"));

// Default Fallback Initializers
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

class DatabaseManager {
  private pgPool: any = null;
  private mongoClient: any = null;
  private isInitialized = false;
  private currentDbType: "none" | "mongodb" | "sql" = "none";

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  public getDbType(): "none" | "mongodb" | "sql" {
    return this.currentDbType;
  }

  // Initialize DB Connection Pool and Schemas
  public async init(config?: Partial<FeeConfig>): Promise<{ success: boolean; message: string; dbType: string }> {
    try {
      const dbType = config?.dbType || 
        (process.env.MONGODB_URI ? "mongodb" : 
        (process.env.DATABASE_URL || process.env.PG_HOST || process.env.POSTGRES_URL ? "sql" : "none"));
      
      const dbEnabled = config?.dbEnabled ?? (dbType !== "none" && (!!process.env.DATABASE_URL || !!process.env.MONGODB_URI || !!config?.dbHost));

      if (!dbEnabled || dbType === "none") {
        this.currentDbType = "none";
        this.isInitialized = true;
        return { success: true, message: "Operating on structured local storage engine with disk persistence.", dbType: "local" };
      }

      if (dbType === "sql") {
        const { default: pg } = await import("pg");
        const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        
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
            host: config?.dbHost || process.env.PG_HOST || "localhost",
            port: config?.dbPort ? Number(config.dbPort) : (process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432),
            database: config?.dbName || process.env.PG_DATABASE || "svec_sih",
            user: config?.dbUsername || process.env.PG_USER || "postgres",
            password: config?.dbPassword || process.env.PG_PASSWORD || "",
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: (config?.dbHost?.includes("localhost") || config?.dbHost?.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false }
          };
        }

        if (this.pgPool) {
          try { await this.pgPool.end(); } catch (e) {}
        }

        this.pgPool = new pg.Pool(poolConfig);
        
        // Test connection
        const client = await this.pgPool.connect();
        client.release();

        // Run industry standard table migrations
        await this.createPostgresTables();

        this.currentDbType = "sql";
        this.isInitialized = true;
        console.log("✅ [Database] PostgreSQL connection pool initialized and tables structured successfully.");
        return { success: true, message: "PostgreSQL database connection and schemas initialized successfully.", dbType: "sql" };
      }

      if (dbType === "mongodb") {
        const { MongoClient } = await import("mongodb");
        let mongoUrl = process.env.MONGODB_URI || "";
        if (!mongoUrl) {
          const host = config?.dbHost || "localhost";
          const port = config?.dbPort || 27017;
          const user = config?.dbUsername;
          const pass = config?.dbPassword;
          const dbName = config?.dbName || "svec_sih";
          if (user && pass) {
            mongoUrl = `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}/${dbName}`;
          } else {
            mongoUrl = `mongodb://${host}:${port}/${dbName}`;
          }
          if (host.startsWith("mongodb://") || host.startsWith("mongodb+srv://")) {
            mongoUrl = host;
          }
        }

        if (this.mongoClient) {
          try { await this.mongoClient.close(); } catch (e) {}
        }

        this.mongoClient = new MongoClient(mongoUrl, {
          maxPoolSize: 20,
          serverSelectionTimeoutMS: 5000
        });
        await this.mongoClient.connect();
        
        // Ensure indexes
        await this.createMongoIndexes(config?.dbName || "svec_sih");

        this.currentDbType = "mongodb";
        this.isInitialized = true;
        console.log("✅ [Database] MongoDB client connected and collection indexes initialized successfully.");
        return { success: true, message: "MongoDB connection and collections initialized successfully.", dbType: "mongodb" };
      }

      return { success: false, message: "Unknown database configuration.", dbType: "none" };
    } catch (err: any) {
      console.error("❌ [Database Init Error]:", err.message);
      this.currentDbType = "none";
      return { success: false, message: `Database initialization failed: ${err.message}`, dbType: "none" };
    }
  }

  // Structure and run PostgreSQL Schemas
  private async createPostgresTables(): Promise<void> {
    if (!this.pgPool) return;

    const queries = [
      // 1. Registrations / Teams Table
      `CREATE TABLE IF NOT EXISTS registrations (
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
        proposal_status VARCHAR(50),
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
      );`,

      // Indexes for Registrations
      `CREATE INDEX IF NOT EXISTS idx_reg_problem_stmt ON registrations(problem_statement_id);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_student_email ON registrations(student_email);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_approval_status ON registrations(approval_status);`,
      `CREATE INDEX IF NOT EXISTS idx_reg_assigned_evaluator ON registrations(assigned_evaluator);`,

      // 2. Students Account Table
      `CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        gender VARCHAR(50),
        department VARCHAR(100),
        mobile VARCHAR(50),
        created_at VARCHAR(100)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);`,

      // 3. Problem Statements Table
      `CREATE TABLE IF NOT EXISTS problem_statements (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        title TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        organization VARCHAR(255) NOT NULL
      );`,

      // 4. Evaluation Criteria Table
      `CREATE TABLE IF NOT EXISTS evaluation_criteria (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        max_score INT DEFAULT 10,
        description TEXT,
        sort_order INT DEFAULT 0
      );`,

      // 5. Dedicated Team Evaluations Table
      `CREATE TABLE IF NOT EXISTS team_evaluations (
        id VARCHAR(255) PRIMARY KEY,
        registration_id VARCHAR(255) NOT NULL,
        evaluator_username VARCHAR(255) NOT NULL,
        scores_json TEXT NOT NULL,
        total_score NUMERIC DEFAULT 0,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        evaluated_at VARCHAR(100)
      );`,
      `CREATE INDEX IF NOT EXISTS idx_eval_reg_id ON team_evaluations(registration_id);`,
      `CREATE INDEX IF NOT EXISTS idx_eval_evaluator ON team_evaluations(evaluator_username);`,

      // 6. App Metadata & Settings Tables
      `CREATE TABLE IF NOT EXISTS app_settings (
        id VARCHAR(255) PRIMARY KEY,
        settings_json TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS app_metadata (
        id VARCHAR(255) PRIMARY KEY,
        metadata_json TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // 7. Custom Pages Table
      `CREATE TABLE IF NOT EXISTS custom_pages (
        id VARCHAR(255) PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT TRUE,
        created_at VARCHAR(100)
      );`,

      // 8. Menu Items Table
      `CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(255) PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        target VARCHAR(255) NOT NULL,
        sort_order INT DEFAULT 0
      );`,

      // 9. Live Updates Table
      `CREATE TABLE IF NOT EXISTS live_updates (
        id VARCHAR(255) PRIMARY KEY,
        text TEXT NOT NULL,
        is_important BOOLEAN DEFAULT FALSE,
        created_at VARCHAR(100)
      );`,

      // 10. Broadcast Logs Table
      `CREATE TABLE IF NOT EXISTS broadcast_logs (
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
    ];

    for (const q of queries) {
      await this.pgPool.query(q);
    }
  }

  // Create MongoDB Indexes
  private async createMongoIndexes(dbName: string): Promise<void> {
    if (!this.mongoClient) return;
    const db = this.mongoClient.db(dbName);
    await db.collection("registrations").createIndex({ registrationId: 1 }, { unique: true });
    await db.collection("registrations").createIndex({ problemStatementId: 1 });
    await db.collection("registrations").createIndex({ studentEmail: 1 });
    await db.collection("students").createIndex({ email: 1 }, { unique: true });
    await db.collection("team_evaluations").createIndex({ registrationId: 1 });
    await db.collection("team_evaluations").createIndex({ evaluatorUsername: 1 });
  }

  // ===================== REGISTRATIONS DATA ACCESS =====================

  public async getRegistrations(): Promise<Registration[]> {
    if (this.currentDbType === "sql" && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM registrations ORDER BY created_at DESC`);
        return res.rows.map(this.mapSqlRowToRegistration);
      } catch (err) {
        console.error("[DB Query Error] getRegistrations SQL failed, falling back to disk cache:", err);
      }
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        const docs = await db.collection("registrations").find({}).toArray();
        return docs.map(({ _id, ...r }: any) => r as Registration);
      } catch (err) {
        console.error("[DB Query Error] getRegistrations Mongo failed, falling back to disk cache:", err);
      }
    }
    return this.readLocalFile<Registration[]>("registrations.json", []);
  }

  public async saveRegistration(reg: Registration): Promise<boolean> {
    if (this.currentDbType === "sql" && this.pgPool) {
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
      } catch (err) {
        console.error("[DB Save Error] saveRegistration SQL failed:", err);
      }
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        await db.collection("registrations").updateOne(
          { id: reg.id },
          { $set: { ...reg, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[DB Save Error] saveRegistration Mongo failed:", err);
      }
    }

    // Always keep local JSON cache synchronized
    const local = this.readLocalFile<Registration[]>("registrations.json", []);
    const idx = local.findIndex(r => r.id === reg.id);
    if (idx >= 0) local[idx] = reg;
    else local.push(reg);
    this.writeLocalFile("registrations.json", local);

    return true;
  }

  public async deleteRegistration(id: string): Promise<boolean> {
    if (this.currentDbType === "sql" && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM registrations WHERE id = $1 OR registration_id = $1`, [id]);
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        await db.collection("registrations").deleteOne({ $or: [{ id }, { registrationId: id }] });
      } catch (e) {}
    }

    const local = this.readLocalFile<Registration[]>("registrations.json", []);
    const filtered = local.filter(r => r.id !== id && r.registrationId !== id);
    this.writeLocalFile("registrations.json", filtered);
    return true;
  }

  // ===================== EVALUATION DATA PERSISTENCE =====================

  public async saveEvaluation(evaluation: TeamEvaluation): Promise<boolean> {
    if (this.currentDbType === "sql" && this.pgPool) {
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

        // Also update registration directly
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
      } catch (err) {
        console.error("[DB Save Error] saveEvaluation SQL failed:", err);
      }
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        await db.collection("team_evaluations").updateOne(
          { id: evaluation.id },
          { $set: evaluation },
          { upsert: true }
        );
        await db.collection("registrations").updateOne(
          { $or: [{ id: evaluation.registrationId }, { registrationId: evaluation.registrationId }] },
          { $set: { 
              evaluatorScores: evaluation.scores,
              evaluationNotes: evaluation.notes,
              evaluationStatus: evaluation.status,
              totalScore: evaluation.totalScore,
              updatedAt: new Date().toISOString()
            }
          }
        );
      } catch (err) {
        console.error("[DB Save Error] saveEvaluation Mongo failed:", err);
      }
    }

    // Update local registrations cache
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
    if (this.currentDbType === "sql" && this.pgPool) {
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
        console.error("[DB Query Error] getEvaluations SQL failed:", err);
      }
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        const query = registrationId ? { registrationId } : {};
        const docs = await db.collection("team_evaluations").find(query).sort({ evaluatedAt: -1 }).toArray();
        return docs.map(({ _id, ...doc }: any) => doc as TeamEvaluation);
      } catch (err) {
        console.error("[DB Query Error] getEvaluations Mongo failed:", err);
      }
    }

    // Fallback construct from registrations cache
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

  // ===================== STUDENTS DATA ACCESS =====================

  public async getStudents(): Promise<Student[]> {
    if (this.currentDbType === "sql" && this.pgPool) {
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
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        const docs = await db.collection("students").find({}).toArray();
        return docs.map(({ _id, ...s }: any) => s as Student);
      } catch (e) {}
    }
    return this.readLocalFile<Student[]>("students.json", []);
  }

  public async saveStudent(student: Student): Promise<boolean> {
    if (this.currentDbType === "sql" && this.pgPool) {
      try {
        await this.pgPool.query(`
          INSERT INTO students (id, email, password_hash, gender, department, mobile, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            gender = EXCLUDED.gender,
            department = EXCLUDED.department,
            mobile = EXCLUDED.mobile;
        `, [student.id, student.email, student.passwordHash || "", student.gender || "", student.department || "", student.mobile || "", student.createdAt]);
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        await db.collection("students").updateOne({ id: student.id }, { $set: student }, { upsert: true });
      } catch (e) {}
    }

    const local = this.readLocalFile<Student[]>("students.json", []);
    const idx = local.findIndex(s => s.id === student.id || s.email.toLowerCase() === student.email.toLowerCase());
    if (idx >= 0) local[idx] = student;
    else local.push(student);
    this.writeLocalFile("students.json", local);

    return true;
  }

  // ===================== METADATA & CONFIG DATA ACCESS =====================

  public async getProblemStatements(): Promise<ProblemStatement[]> {
    if (this.currentDbType === "sql" && this.pgPool) {
      try {
        const res = await this.pgPool.query(`SELECT * FROM problem_statements`);
        if (res.rows && res.rows.length > 0) {
          return res.rows.map(r => ({
            id: r.id,
            code: r.code,
            title: r.title,
            category: r.category as any,
            organization: r.organization
          }));
        }
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        const doc = await db.collection("app_metadata").findOne({ id: "problem_statements" });
        if (doc && Array.isArray(doc.data) && doc.data.length > 0) return doc.data;
      } catch (e) {}
    }
    return this.readLocalFile<ProblemStatement[]>("statements.json", defaultStatements);
  }

  public async saveProblemStatements(statements: ProblemStatement[]): Promise<boolean> {
    if (this.currentDbType === "sql" && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM problem_statements`);
        for (const ps of statements) {
          await this.pgPool.query(`
            INSERT INTO problem_statements (id, code, title, category, organization)
            VALUES ($1, $2, $3, $4, $5)
          `, [ps.id, ps.code, ps.title, ps.category, ps.organization]);
        }
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        await db.collection("app_metadata").updateOne(
          { id: "problem_statements" },
          { $set: { id: "problem_statements", data: statements, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (e) {}
    }
    this.writeLocalFile("statements.json", statements);
    return true;
  }

  public async getEvaluationCriteria(): Promise<EvaluationCriterion[]> {
    if (this.currentDbType === "sql" && this.pgPool) {
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
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        const doc = await db.collection("app_metadata").findOne({ id: "evaluation_criteria" });
        if (doc && Array.isArray(doc.data) && doc.data.length > 0) return doc.data;
      } catch (e) {}
    }
    return this.readLocalFile<EvaluationCriterion[]>("evaluation_criteria.json", defaultCriteria);
  }

  public async saveEvaluationCriteria(criteria: EvaluationCriterion[]): Promise<boolean> {
    if (this.currentDbType === "sql" && this.pgPool) {
      try {
        await this.pgPool.query(`DELETE FROM evaluation_criteria`);
        for (let i = 0; i < criteria.length; i++) {
          const c = criteria[i];
          await this.pgPool.query(`
            INSERT INTO evaluation_criteria (id, name, max_score, description, sort_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [c.id, c.name, c.maxScore || 10, c.description || "", i]);
        }
      } catch (e) {}
    } else if (this.currentDbType === "mongodb" && this.mongoClient) {
      try {
        const db = this.mongoClient.db();
        await db.collection("app_metadata").updateOne(
          { id: "evaluation_criteria" },
          { $set: { id: "evaluation_criteria", data: criteria, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (e) {}
    }
    this.writeLocalFile("evaluation_criteria.json", criteria);
    return true;
  }

  // ===================== HELPER MAPPER & FILE PERSISTENCE =====================

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
      if (!fs.existsSync(fullPath)) return fallback;
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
    } catch (e) {
      console.error(`Error writing to local file ${filename}:`, e);
    }
  }
}

export const db = new DatabaseManager();
