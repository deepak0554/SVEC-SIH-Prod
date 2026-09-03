import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Razorpay from "razorpay";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { ProblemStatement, Registration, Student, FeeConfig, HomepageContent, CustomPage, MenuItem, EvaluationCriterion, LiveUpdate } from "./src/types";
import { db, TeamEvaluation, defaultCriteria, defaultStatements, defaultDefaultAdmins, BroadcastLog } from "./server/db";
import {
  getJwtSecret,
  getAdminPasscode,
  validateAuthStartup,
  signStudentToken,
  signAdminToken,
  verifyStudentToken,
  verifyAdminToken,
  hashPassword,
  verifyPassword,
  validateStudentJWT,
  validateAdmin,
  requireRole,
  authorize,
  authenticateAnyUser,
  extractUserOptional,
  normalizeRole,
  UserRole,
  AdminUser
} from "./server/auth";
import {
  upload,
  validateAndSaveFile,
  saveBase64Securely,
  isPathSafe,
  sanitizeClientFilename,
  DATA_DIR,
  UPLOADS_DIR,
  UPLOADS_PPTS_DIR,
  UPLOADS_IMAGES_DIR,
  UPLOADS_DOCS_DIR,
  UPLOADS_SAMPLE_PPTS_DIR,
  CATEGORY_DIR_MAP,
  UploadCategory
} from "./server/fileUpload";
import {
  validateBody,
  validateQuery,
  validateParams,
  studentRegisterSchema,
  studentLoginSchema,
  adminLoginSchema,
  changePasswordSchema,
  resetPasswordAdminSchema,
  studentProfileUpdateSchema,
  manageAdminCreateSchema,
  teamRegistrationSchema,
  updateTeamRosterSchema,
  updateProposalSchema,
  problemStatementSchema,
  bulkProblemStatementsSchema,
  evaluationCriteriaSchema,
  updateEvaluationCriteriaBodySchema,
  assignEvaluatorSchema,
  evaluateTeamSchema,
  finalizeSelectionSchema,
  updateApprovalStatusSchema,
  updateRegistrationAdminSchema,
  createPaymentOrderSchema,
  verifyPaymentSchema,
  settingsSchema,
  testDbSchema,
  fileUploadSchema,
  broadcastSmsSchema,
  broadcastWhatsappSchema,
  broadcastEmailSchema,
  broadcastMessageSchema,
  customPageSchema,
  updateCustomPageSchema,
  menuSchema,
  menuItemsArraySchema,
  homepageContentSchema,
  updatesArraySchema,
  paginationQuerySchema,
  singleIdParamSchema,
  toggleEvaluationLockSchema
} from "./server/validation";
import { validateTeamRegistration, validateProposalSubmission } from "./server/businessRules";
import { createAuthoritativePaymentOrder, verifyAuthoritativePayment } from "./server/paymentSecurity";
import { standardizeResponseMiddleware, errorHandler, notFoundHandler } from "./server/middleware";
import { evaluationService, notificationService } from "./server/services";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const IS_VERCEL = !!process.env.VERCEL;

// Enforce standard 5MB JSON payload limit (multipart/form-data handles binary streams)
app.use(express.json({ limit: "5mb" }));

// Standardize all error responses to format: { success: false, error: { code, message, details }, message }
app.use(standardizeResponseMiddleware);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Legacy fallback: Keep a helper pointing to saveBase64Securely
function saveBase64File(
  base64Data: string,
  category: "ppts" | "images" | "documents" | "sample_ppts",
  suggestedName?: string
) {
  const res = saveBase64Securely(base64Data, category, suggestedName);
  if (!res) return null;
  return {
    url: res.url,
    filename: res.filename,
    size: res.size,
    relativePath: `/uploads/${category}/${res.filename}`
  };
}

/**
 * Robust Department matching helper for Department-Specific SPOC data scoping.
 * Compares department names, codes, abbreviations (e.g. CSE, IT, ECE) case-insensitively.
 */
export function isDepartmentMatch(teamDept?: string, adminDept?: string): boolean {
  if (!adminDept || adminDept.trim() === "" || adminDept.trim().toLowerCase() === "all") {
    return true; // Super admin or unassigned matches all
  }
  if (!teamDept || teamDept.trim() === "") {
    return false;
  }
  const cleanTeam = teamDept.trim().toLowerCase();
  const cleanAdmin = adminDept.trim().toLowerCase();
  
  if (cleanTeam === cleanAdmin) return true;

  // Extract parentheses abbreviations, e.g. "Computer Science & Engineering (CSE)" -> "cse"
  const teamParen = cleanTeam.match(/\(([^)]+)\)/);
  const adminParen = cleanAdmin.match(/\(([^)]+)\)/);
  
  const teamAbbr = teamParen ? teamParen[1].trim().toLowerCase() : cleanTeam;
  const adminAbbr = adminParen ? adminParen[1].trim().toLowerCase() : cleanAdmin;
  
  if (teamAbbr === adminAbbr || teamAbbr === cleanAdmin || adminAbbr === cleanTeam) return true;

  // Substring matching
  if (cleanTeam.includes(cleanAdmin) || cleanAdmin.includes(cleanTeam)) return true;

  return false;
}

if (IS_VERCEL) {
  const sourceDir = path.join(process.cwd(), "data");
  if (fs.existsSync(sourceDir)) {
    try {
      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const sourcePath = path.join(sourceDir, file);
          const destPath = path.join(DATA_DIR, file);
          if (!fs.existsSync(destPath)) {
            fs.copyFileSync(sourcePath, destPath);
          }
        }
      }
    } catch (err) {
      console.error("Error seeding Vercel /tmp directory:", err);
    }
  }
}

const STATEMENTS_FILE = path.join(DATA_DIR, "problem_statements.json");
const REGISTRATIONS_FILE = path.join(DATA_DIR, "registrations.json");
const STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const HOMEPAGE_FILE = path.join(DATA_DIR, "homepage_content.json");
const PAGES_FILE = path.join(DATA_DIR, "custom_pages.json");
const MENU_FILE = path.join(DATA_DIR, "menu_items.json");
const BROADCAST_LOGS_FILE = path.join(DATA_DIR, "broadcast_logs.json");
const UPDATES_FILE = path.join(DATA_DIR, "updates.json");

const defaultHomepageContent: HomepageContent = {
  sihDetails: {
    title: "Smart India Hackathon 2026",
    description: "Smart India Hackathon is a nationwide initiative to provide students with a platform to solve some of the pressing problems we face in our daily lives, and thus inculcate a culture of product innovation and a mindset of problem-solving. This year, Sri Vasavi Engineering College is hosting the Internal Hackathon to select the best teams to represent us at the national level. Join us in this prestigious competition to showcase your technical skills and innovation!",
    slogan: "Inculcating a Culture of Product Innovation and Problem-Solving",
    dates: "Registration: Oct 1 - Oct 25 | Internal Hackathon: Nov 10-11, 2026",
    bannerUrl: ""
  },
  sponsors: [
    { id: "1", name: "AICTE", logoUrl: "", siteUrl: "https://aicte-india.org" },
    { id: "2", name: "Ministry of Education", logoUrl: "", siteUrl: "https://education.gov.in" },
    { id: "3", name: "Persistent Systems", logoUrl: "", siteUrl: "" }
  ],
  patrons: [
    { id: "p1", name: "Sri G. Satyanarayana", position: "President", imageUrl: "" },
    { id: "p2", name: "Sri Ch. V. V. Subba Rao", position: "Secretary", imageUrl: "" },
    { id: "p3", name: "Sri K. Venkateswara Rao", position: "Technical Director", imageUrl: "" },
    { id: "p4", name: "Dr. Ch. Rambabu", position: "Principal", imageUrl: "" }
  ],
  studentSpocs: [
    { id: "1", name: "K. Sameer Kumar", role: "Student SPOC Lead", department: "Computer Science & Engineering", email: "sameer.k@svec.edu.in", phone: "9876543210" },
    { id: "2", name: "M. Durga Prasad", role: "Student SPOC Co-lead", department: "Information Technology", email: "durga.m@svec.edu.in", phone: "8765432109" }
  ],
  collegeSpocs: [
    { id: "1", name: "Dr. K. Shirin Bhanu", role: "College SPOC / Single Point of Contact", department: "CSE Department Head", email: "kbhanu@svec.edu.in", phone: "9440123456" }
  ],
  previousPhotos: [
    { id: "1", title: "SIH 2024 Winning Ceremony", imageUrl: "", description: "SVEC team receiving the 1st prize at nodal center." },
    { id: "2", title: "Internal Evaluation Hackathon", imageUrl: "", description: "Expert panel evaluating student prototypes during the 2025 internal round." }
  ],
  showTimeline: true
};

const defaultCustomPages: CustomPage[] = [
  {
    id: "1",
    title: "Guidelines & Rules",
    slug: "guidelines",
    content: "## Smart India Hackathon - SVEC Internal Round Guidelines\n\nWelcome to the internal round selection process for **Smart India Hackathon 2026**. Please read the guidelines below carefully:\n\n### 1. Team Formation Rules\n- Every team **must consist of exactly 6 members**.\n- All team members must be regular students of **Sri Vasavi Engineering College**.\n- Each team **MUST have at least one female member**.\n- A team leader must be nominated who will handle all communication and registrations.\n\n### 2. Faculty Mentor\n- Each team is required to have **one Faculty Mentor** from our college to guide them throughout the project development.\n\n### 3. Submission Details\n- Teams must choose a **Problem Statement** from the official list.\n- Provide an Abstract (PPT or PDF file, up to 10MB) detailing your solution approach, tech stack, and feasibility.\n- The deadline for proposal submissions is **October 25, 2026**.\n- Registered teams can manage their team details and upload project submissions directly through this portal.\n\n### 4. Selection Process\n- The internal jury will review all submitted proposals.\n- Shortlisted teams will pitch their ideas in front of a panel on **November 10-11, 2026**.\n- The top nominated teams will be uploaded to the official SIH portal.",
    published: true,
    createdAt: new Date().toISOString()
  }
];

const defaultMenuItems: MenuItem[] = [
  { id: "1", label: "Home", type: "system", target: "home", order: 1 },
  { id: "2", label: "Guidelines", type: "custom", target: "guidelines", order: 2 },
  { id: "3", label: "Register Team", type: "system", target: "register", order: 3 },
  { id: "4", label: "Admin Panel", type: "system", target: "admin", order: 4 }
];

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(STUDENTS_FILE)) {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), "utf-8");
}

if (!fs.existsSync(HOMEPAGE_FILE)) {
  fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(defaultHomepageContent, null, 2), "utf-8");
}

if (!fs.existsSync(PAGES_FILE)) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(defaultCustomPages, null, 2), "utf-8");
}

if (!fs.existsSync(MENU_FILE)) {
  fs.writeFileSync(MENU_FILE, JSON.stringify(defaultMenuItems, null, 2), "utf-8");
}

if (!fs.existsSync(UPDATES_FILE)) {
  fs.writeFileSync(UPDATES_FILE, JSON.stringify([
    { id: "1", text: "Registrations are now open for Sri Vasavi Internal Hackathon 2026!", createdAt: new Date().toISOString(), isImportant: true },
    { id: "2", text: "Important: Every team must have at least one female member.", createdAt: new Date().toISOString(), isImportant: false },
    { id: "3", text: "All teams must submit their abstract PPT before the deadline.", createdAt: new Date().toISOString(), isImportant: false }
  ], null, 2), "utf-8");
}


if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    feeEnabled: false,
    feeAmount: 499,
    razorpayKeyId: "",
    razorpayKeySecret: ""
  }, null, 2), "utf-8");
}


if (!fs.existsSync(STATEMENTS_FILE)) {
  fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(defaultStatements, null, 2), "utf-8");
}

if (!fs.existsSync(REGISTRATIONS_FILE)) {
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2), "utf-8");
}

const CRITERIA_FILE = path.join(DATA_DIR, "evaluation_criteria.json");

if (!fs.existsSync(CRITERIA_FILE)) {
  fs.writeFileSync(CRITERIA_FILE, JSON.stringify(defaultCriteria, null, 2), "utf-8");
}

// Automatically save homepage base64 images (banner, patrons, sponsors, gallery) to server disk
function processHomepageImages(content: HomepageContent): HomepageContent {
  if (!content) return content;
  const updated = { ...content };

  // 1. Process Banner URL
  if (updated.sihDetails?.bannerUrl && updated.sihDetails.bannerUrl.startsWith("data:")) {
    const saved = saveBase64File(updated.sihDetails.bannerUrl, "images", "hero_banner.png");
    if (saved) {
      updated.sihDetails = { ...updated.sihDetails, bannerUrl: saved.url };
    }
  }

  // 2. Process Sponsors logos
  if (Array.isArray(updated.sponsors)) {
    updated.sponsors = updated.sponsors.map(sp => {
      if (sp.logoUrl && sp.logoUrl.startsWith("data:")) {
        const saved = saveBase64File(sp.logoUrl, "images", `sponsor_${sp.name || sp.id}.png`);
        return { ...sp, logoUrl: saved ? saved.url : sp.logoUrl };
      }
      return sp;
    });
  }

  // 3. Process Patrons images
  if (Array.isArray(updated.patrons)) {
    updated.patrons = updated.patrons.map(patron => {
      if (patron.imageUrl && patron.imageUrl.startsWith("data:")) {
        const saved = saveBase64File(patron.imageUrl, "images", `patron_${patron.name || patron.id}.png`);
        return { ...patron, imageUrl: saved ? saved.url : patron.imageUrl };
      }
      return patron;
    });
  }

  // 4. Process Previous Photos gallery images
  if (Array.isArray(updated.previousPhotos)) {
    updated.previousPhotos = updated.previousPhotos.map(photo => {
      if (photo.imageUrl && photo.imageUrl.startsWith("data:")) {
        const saved = saveBase64File(photo.imageUrl, "images", `gallery_${photo.title || photo.id}.png`);
        return { ...photo, imageUrl: saved ? saved.url : photo.imageUrl };
      }
      return photo;
    });
  }

  return updated;
}

// Unified Data Access Helpers (PostgreSQL Single Source of Truth & Object Storage)
function readCriteria(): EvaluationCriterion[] {
  return db.readLocalFile<EvaluationCriterion[]>("evaluation_criteria.json", defaultCriteria);
}

function writeCriteria(criteria: EvaluationCriterion[]) {
  db.writeLocalFile("evaluation_criteria.json", criteria);
  db.saveEvaluationCriteria(criteria).catch(err => {
    console.error("Failed to sync evaluation criteria to DB:", err);
  });
}

function readStatements(): ProblemStatement[] {
  const local = db.readLocalFile<ProblemStatement[]>("problem_statements.json", []);
  if (local && local.length > 0) {
    return local;
  }
  const settings = readSettings();
  if ((settings as any)?.savedProblemStatements && Array.isArray((settings as any).savedProblemStatements) && (settings as any).savedProblemStatements.length > 0) {
    db.writeLocalFile("problem_statements.json", (settings as any).savedProblemStatements);
    return (settings as any).savedProblemStatements;
  }
  return defaultStatements;
}

async function writeStatements(statements: ProblemStatement[]): Promise<boolean> {
  db.writeLocalFile("problem_statements.json", statements);
  try {
    const s = readSettings();
    (s as any).savedProblemStatements = statements;
    writeSettings(s);
  } catch (e) {}
  try {
    await db.saveProblemStatements(statements);
    return true;
  } catch (err) {
    console.error("Failed to sync problem statements to DB:", err);
    return false;
  }
}

function readRegistrations(): Registration[] {
  return db.readLocalFile<Registration[]>("registrations.json", []);
}

function writeRegistrations(registrations: Registration[]) {
  db.writeLocalFile("registrations.json", registrations);
  db.saveRegistrations(registrations).catch(err => {
    console.error("Failed to sync registrations to DB:", err);
  });
}

function readStudents(): Student[] {
  return db.readLocalFile<Student[]>("students.json", []);
}

function writeStudents(students: Student[]) {
  db.writeLocalFile("students.json", students);
  db.saveStudents(students).catch(err => {
    console.error("Failed to sync students to DB:", err);
  });
}

function readHomepage(): HomepageContent {
  const content = db.readLocalFile<HomepageContent>("homepage_content.json", defaultHomepageContent);
  if (!content.patrons) {
    content.patrons = [
      { id: "p1", name: "Sri G. Satyanarayana", position: "President", imageUrl: "" },
      { id: "p2", name: "Sri Ch. V. V. Subba Rao", position: "Secretary", imageUrl: "" },
      { id: "p3", name: "Sri K. Venkateswara Rao", position: "Technical Director", imageUrl: "" },
      { id: "p4", name: "Dr. Ch. Rambabu", position: "Principal", imageUrl: "" }
    ];
    db.writeLocalFile("homepage_content.json", content);
  }
  return content;
}

function writeHomepage(content: HomepageContent) {
  const processed = processHomepageImages(content);
  db.writeLocalFile("homepage_content.json", processed);
  db.saveHomepageContent(processed).catch(err => {
    console.error("Failed to sync homepage content to DB:", err);
  });
}

function readUpdates(): LiveUpdate[] {
  return db.readLocalFile<LiveUpdate[]>("updates.json", [
    { id: "1", text: "Registrations are now open for Sri Vasavi Internal Hackathon 2026!", createdAt: new Date().toISOString(), isImportant: true },
    { id: "2", text: "Important: Every team must have at least one female member.", createdAt: new Date().toISOString(), isImportant: false },
    { id: "3", text: "All teams must submit their abstract PPT before the deadline.", createdAt: new Date().toISOString(), isImportant: false }
  ]);
}

function writeUpdates(updates: LiveUpdate[]) {
  db.writeLocalFile("updates.json", updates);
  db.saveLiveUpdates(updates).catch(err => {
    console.error("Failed to sync live updates to DB:", err);
  });
}

function readCustomPages(): CustomPage[] {
  return db.readLocalFile<CustomPage[]>("custom_pages.json", defaultCustomPages);
}

function writeCustomPages(pages: CustomPage[]) {
  db.writeLocalFile("custom_pages.json", pages);
  db.saveCustomPages(pages).catch(err => {
    console.error("Failed to sync custom pages to DB:", err);
  });
}

function readMenuItems(): MenuItem[] {
  return db.readLocalFile<MenuItem[]>("menu_items.json", defaultMenuItems);
}

function writeMenuItems(items: MenuItem[]) {
  db.writeLocalFile("menu_items.json", items);
  db.saveMenuItems(items).catch(err => {
    console.error("Failed to sync menu items to DB:", err);
  });
}

export const MASKED_SECRET = "••••••••";

export function maskSecretValue(val?: string): string {
  return val && val.trim().length > 0 ? MASKED_SECRET : "";
}

export function sanitizeSettingsForAdmin(settings: FeeConfig): FeeConfig {
  return {
    ...settings,
    razorpayKeySecret: maskSecretValue(settings.razorpayKeySecret),
    smtpPass: maskSecretValue(settings.smtpPass),
    twilioAuthToken: maskSecretValue(settings.twilioAuthToken),
    msg91AuthKey: maskSecretValue(settings.msg91AuthKey),
    whatsappAccessToken: maskSecretValue(settings.whatsappAccessToken),
    dbPassword: maskSecretValue(settings.dbPassword),
  };
}

export function resolveSecretUpdate(incoming: string | undefined, currentSecret: string | undefined, envSecret?: string): string {
  if (incoming === undefined || incoming === null) {
    return currentSecret || envSecret || "";
  }
  const clean = incoming.trim();
  if (clean === "") {
    return "";
  }
  // If it's a masked placeholder string (bullets or asterisks), preserve current secret or environment secret
  if (/^[•*]+$/.test(clean)) {
    return currentSecret || envSecret || "";
  }
  return clean;
}

function readSettings(): FeeConfig {
  const parsed = db.readLocalFile<any>("settings.json", {});
  return {
    feeEnabled: parsed.feeEnabled ?? false,
    feeAmount: parsed.feeAmount ?? 499,
    paymentMode: parsed.paymentMode || (parsed.manualPaymentEnabled ? "manual_upi" : "manual_upi"),
    manualPaymentEnabled: parsed.manualPaymentEnabled !== undefined ? parsed.manualPaymentEnabled : (parsed.paymentMode === "manual_upi" || !!parsed.upiQrCodeUrl || true),
    upiQrCodeUrl: parsed.upiQrCodeUrl ?? "",
    upiId: parsed.upiId ?? "svec@upi",
    upiPayeeName: parsed.upiPayeeName ?? "Sri Vasavi Engineering College",
    upiInstructions: parsed.upiInstructions ?? "Scan the UPI QR code using any UPI App (Google Pay, PhonePe, Paytm, BHIM). Complete the payment, enter your 12-digit UTR/Transaction ID and attach the payment screenshot below.",
    requirePaymentScreenshot: parsed.requirePaymentScreenshot !== undefined ? parsed.requirePaymentScreenshot : true,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || parsed.razorpayKeyId || "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || parsed.razorpayKeySecret || "",
    jwtEnabled: parsed.jwtEnabled ?? false,
    emailEnabled: parsed.emailEnabled ?? false,
    smtpHost: process.env.SMTP_HOST || parsed.smtpHost || "",
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : (parsed.smtpPort ?? 587),
    smtpUser: process.env.SMTP_USER || parsed.smtpUser || "",
    smtpPass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || parsed.smtpPass || "",
    smtpFrom: process.env.SMTP_FROM || parsed.smtpFrom || "",
    portalTheme: parsed.portalTheme ?? "light",
    logoUrl: parsed.logoUrl ?? "",
    portalTitle: parsed.portalTitle ?? "SVEC - SIH Internal Hackathon 2026",
    portalCaption: parsed.portalCaption ?? "Sri Vasavi Engineering College",
    teamMembersCount: parsed.teamMembersCount ?? 5,
    genderDiversityRequired: parsed.genderDiversityRequired ?? true,
    registrationDeadline: parsed.registrationDeadline ?? "",
    submissionDeadline: parsed.submissionDeadline ?? "",
    minTeamSize: parsed.minTeamSize !== undefined ? Number(parsed.minTeamSize) : undefined,
    maxTeamSize: parsed.maxTeamSize !== undefined ? Number(parsed.maxTeamSize) : undefined,
    maxTeamsPerProblemStatement: parsed.maxTeamsPerProblemStatement !== undefined ? Number(parsed.maxTeamsPerProblemStatement) : undefined,

    // SMS config
    smsEnabled: parsed.smsEnabled ?? false,
    smsProvider: parsed.smsProvider ?? "twilio",
    twilioSid: process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID || parsed.twilioSid || "",
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || parsed.twilioAuthToken || "",
    twilioFrom: process.env.TWILIO_FROM || parsed.twilioFrom || "",
    msg91AuthKey: process.env.MSG91_AUTH_KEY || parsed.msg91AuthKey || "",
    msg91SenderId: process.env.MSG91_SENDER_ID || parsed.msg91SenderId || "",
    msg91Route: process.env.MSG91_ROUTE || parsed.msg91Route || "4",
    smsCustomUrl: parsed.smsCustomUrl ?? "",
    smsCustomMethod: parsed.smsCustomMethod ?? "POST",
    smsCustomHeaders: parsed.smsCustomHeaders ?? "",
    smsCustomPayload: parsed.smsCustomPayload ?? "",

    // WhatsApp config
    whatsappEnabled: parsed.whatsappEnabled ?? false,
    whatsappProvider: parsed.whatsappProvider ?? "meta",
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || parsed.whatsappAccessToken || "",
    whatsappPhoneId: process.env.WHATSAPP_PHONE_ID || parsed.whatsappPhoneId || "",
    whatsappWabaId: process.env.WHATSAPP_WABA_ID || parsed.whatsappWabaId || "",
    whatsappCustomUrl: parsed.whatsappCustomUrl ?? "",
    whatsappCustomMethod: parsed.whatsappCustomMethod ?? "POST",
    whatsappCustomHeaders: parsed.whatsappCustomHeaders ?? "",
    whatsappCustomPayload: parsed.whatsappCustomPayload ?? "",

    // External DB config (Enabled by default to preserve settings & data across redeployments)
    dbEnabled: parsed.dbEnabled !== undefined ? parsed.dbEnabled : true,
    dbType: (parsed.dbType && parsed.dbType !== "none") ? parsed.dbType : "sql",
    dbHost: process.env.DB_HOST || process.env.PG_HOST || parsed.dbHost || "",
    dbPort: process.env.DB_PORT ? Number(process.env.DB_PORT) : (process.env.PG_PORT ? Number(process.env.PG_PORT) : (parsed.dbPort !== undefined ? Number(parsed.dbPort) : 5432)),
    dbName: process.env.DB_NAME || process.env.PG_DATABASE || parsed.dbName || "postgres",
    dbUsername: process.env.DB_USERNAME || process.env.PG_USER || parsed.dbUsername || "postgres",
    dbPassword: process.env.DB_PASSWORD || process.env.PG_PASSWORD || parsed.dbPassword || "",
    dbCollectionOrTable: parsed.dbCollectionOrTable ?? "registrations",
    dbStatus: parsed.dbStatus ?? "Connected (Auto-Sync)",

    // Student Profile & Member updates lock
    lockStudentUpdates: parsed.lockStudentUpdates ?? false,
    lockRegisterAnotherTeam: parsed.lockRegisterAnotherTeam ?? false,

    // Customizable Certificates
    enableCertificates: parsed.enableCertificates ?? false,
    certificateTitle: parsed.certificateTitle ?? "CERTIFICATE OF PARTICIPATION",
    certificateSubtitle: parsed.certificateSubtitle ?? "This is proudly presented to",
    certificateBody: parsed.certificateBody ?? "for outstanding participation in the SVEC Smart India Hackathon 2026 Internal Hackathon. Their team demonstrated outstanding design, creative technical engineering, and dedicated problem-solving skills in developing solutions for high-impact challenges.",
    certificateSignatory1Name: parsed.certificateSignatory1Name ?? "Dr. Ch. Rambabu",
    certificateSignatory1Title: parsed.certificateSignatory1Title ?? "Principal & Chairman, SVEC",
    certificateSignatory2Name: parsed.certificateSignatory2Name ?? "Dr. K. Shirin Bhanu",
    certificateSignatory2Title: parsed.certificateSignatory2Title ?? "SIH College SPOC & Convenor",
    certificateSignatories: parsed.certificateSignatories ?? [
      { id: "sig-1", name: parsed.certificateSignatory1Name ?? "Dr. Ch. Rambabu", title: parsed.certificateSignatory1Title ?? "Principal & Chairman, SVEC" },
      { id: "sig-2", name: parsed.certificateSignatory2Name ?? "Dr. K. Shirin Bhanu", title: parsed.certificateSignatory2Title ?? "SIH College SPOC & Convenor" }
    ],
    certificateBgType: parsed.certificateBgType ?? "classic",
    certificateBgUrl: parsed.certificateBgUrl ?? "",
    certificateBorderColor: parsed.certificateBorderColor ?? "#4f46e5",
    certificateDateText: parsed.certificateDateText ?? "July 17, 2026",
    creditsTitle: parsed.creditsTitle ?? "Department of CSE",
    creditsContent: parsed.creditsContent ?? "### Department of Computer Science & Engineering\n\nSri Vasavi Engineering College has spearheaded this Internal Hackathon Portal to encourage real-world problem solving among students.\n\n**Mentorship Team:** Department Faculty\n**Student Contributors:** CSE Batch 2026",
    creditsEnabled: parsed.creditsEnabled ?? true,

    // Sample PPT / Presentation Template & Demo Link
    samplePptEnabled: parsed.samplePptEnabled !== undefined ? parsed.samplePptEnabled : true,
    samplePptUrl: parsed.samplePptUrl ?? "",
    samplePptFileName: parsed.samplePptFileName ?? "",
    samplePptFileBase64: parsed.samplePptFileBase64 ?? "",
    samplePptFileUrl: parsed.samplePptFileUrl ?? "",
    samplePptDescription: parsed.samplePptDescription ?? "Official SIH 2026 SVEC Presentation Format (8 Slides: Problem, Proposed Solution, Tech Stack, Feasibility, Architecture, Milestones, Budget, Team)."
  };
}

function writeSettings(settings: FeeConfig) {
  const updatedSettings = { ...settings };

  // If sample PPT is base64, save to uploads folder
  if (updatedSettings.samplePptFileBase64 && updatedSettings.samplePptFileBase64.startsWith("data:")) {
    const filename = updatedSettings.samplePptFileName || "SVEC_SIH_Sample_Proposal_Template.pptx";
    const saved = saveBase64File(updatedSettings.samplePptFileBase64, "sample_ppts", filename);
    if (saved) {
      updatedSettings.samplePptFileUrl = saved.url;
    }
  }

  // If custom logo or certificate BG is base64, save to uploads folder
  if (updatedSettings.logoUrl && updatedSettings.logoUrl.startsWith("data:")) {
    const saved = saveBase64File(updatedSettings.logoUrl, "images", "portal_custom_logo.png");
    if (saved) {
      updatedSettings.logoUrl = saved.url;
    }
  }

  if (updatedSettings.certificateBgUrl && updatedSettings.certificateBgUrl.startsWith("data:")) {
    const saved = saveBase64File(updatedSettings.certificateBgUrl, "images", "certificate_bg.png");
    if (saved) {
      updatedSettings.certificateBgUrl = saved.url;
    }
  }

  db.writeLocalFile("settings.json", updatedSettings);
  db.saveSettings(updatedSettings).catch(err => {
    console.error("Failed to sync settings to DB on write:", err);
  });
  if (updatedSettings.dbEnabled) {
    syncSettingsToExternalDB(updatedSettings).catch(err => {
      console.warn("Notice: syncSettingsToExternalDB background save:", err?.message || err);
    });
  }
}

// Sync app settings dynamically to configured external MongoDB or SQL
async function syncSettingsToExternalDB(settings: FeeConfig): Promise<{ success: boolean; error?: string }> {
  if (!settings.dbEnabled || settings.dbType === "none") {
    return { success: true };
  }

  // If database manager has an active connection (PostgreSQL or MongoDB), delegate directly to resilient pool
  if (db.isPostgres() || db.isMongo()) {
    try {
      await db.saveSettings(settings);
      return { success: true };
    } catch (err: any) {
      console.warn("[External DB Notice] Background settings sync:", err?.message || err);
      return { success: false, error: err?.message };
    }
  }

  // If database is not currently active, system operates safely on resilient local storage adapter
  return { success: true };
}

// Sync app metadata dynamically to configured external MongoDB or SQL
async function syncMetadataToExternalDB(key: string, data: any): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  if (!settings.dbEnabled || settings.dbType === "none" || (!db.isPostgres() && !db.isMongo())) {
    return { success: true };
  }

  try {
    if (db.isMongo()) {
      const mongoDb = (db as any).mongoDb;
      if (mongoDb) {
        const collection = mongoDb.collection("app_metadata");
        await collection.updateOne(
          { id: key },
          { $set: { id: key, data: data, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
      return { success: true };
    } else if (db.isPostgres()) {
      const pool = (db as any).pgPool;
      if (pool) {
        const createTableSql = `
          CREATE TABLE IF NOT EXISTS app_metadata (
            id VARCHAR(255) PRIMARY KEY,
            metadata_json TEXT
          );
        `;
        await pool.query(createTableSql);

        const insertSql = `
          INSERT INTO app_metadata (id, metadata_json)
          VALUES ($1, $2)
          ON CONFLICT (id) DO UPDATE SET metadata_json = EXCLUDED.metadata_json;
        `;
        await pool.query(insertSql, [key, JSON.stringify(data)]);
      }
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.warn(`[Metadata DB Sync Notice]:`, err?.message || err);
    return { success: false, error: err?.message };
  }
}


// Sync single registration dynamically to configured external MongoDB or SQL
async function syncRegistrationToExternalDB(registration: Registration): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  if (!settings.dbEnabled || settings.dbType === "none") {
    return { success: true };
  }

  // If database manager is active (PostgreSQL or MongoDB), delegate directly
  if (db.isPostgres() || db.isMongo()) {
    try {
      await db.saveRegistration(registration);
      return { success: true };
    } catch (err: any) {
      console.warn(`[External DB Notice] Sync failed for registration ${registration.id}:`, err?.message || err);
      return { success: false, error: err?.message };
    }
  }

  // Operating safely on resilient local storage
  return { success: true };
}

async function legacySyncRegistrationToExternalDB(registration: Registration): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  const { dbType, dbHost, dbPort, dbName, dbUsername, dbPassword, dbCollectionOrTable } = settings;

  try {
    if (dbType === "mongodb") {
      const { MongoClient } = await import("mongodb");
      let mongoUrl = "";
      if (dbUsername && dbPassword) {
        mongoUrl = `mongodb://${encodeURIComponent(dbUsername)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort || 27017}/${dbName}`;
      } else {
        mongoUrl = `mongodb://${dbHost}:${dbPort || 27017}/${dbName}`;
      }
      if (dbHost.startsWith("mongodb://") || dbHost.startsWith("mongodb+srv://")) {
        mongoUrl = dbHost;
      }

      const client = new MongoClient(mongoUrl);
      await client.connect();
      const db = client.db(dbName || "svec_sih");
      const collection = db.collection(dbCollectionOrTable || "registrations");
      
      // Upsert document based on registration id
      await collection.updateOne(
        { id: registration.id },
        { $set: registration },
        { upsert: true }
      );
      await client.close();
      return { success: true };

    } else if (dbType === "sql") {
      const { default: pg } = await import("pg");
      const client = new pg.Client({
        host: dbHost,
        port: dbPort || 5432,
        database: dbName,
        user: dbUsername,
        password: dbPassword,
        ssl: dbHost.includes("localhost") || dbHost.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false }
      });

      await client.connect();

      const tableName = dbCollectionOrTable || "registrations";

      // 1. Ensure table and all modern columns exist via safe migrations
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(100) UNIQUE NOT NULL,
          team_name VARCHAR(255) NOT NULL,
          lead_name VARCHAR(255) NOT NULL,
          lead_department VARCHAR(100) NOT NULL,
          lead_mobile VARCHAR(50) NOT NULL
        );
      `);

      const migrationQueries = [
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS lead_gender VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS lead_academic_year VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member1 VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member1_gender VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member1_email VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member1_phone VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member1_academic_year VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member2 VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member2_gender VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member2_email VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member2_phone VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member2_academic_year VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member3 VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member3_gender VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member3_email VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member3_phone VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member3_academic_year VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member4 VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member4_gender VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member4_email VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member4_phone VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member4_academic_year VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member5 VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member5_gender VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member5_email VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member5_phone VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS member5_academic_year VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS has_female_member BOOLEAN DEFAULT FALSE;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS mentor_name VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS problem_statement_id VARCHAR(100);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS submitted_at VARCHAR(100);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS student_email VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'free';`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS order_id VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS amount_paid NUMERIC;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS abstract TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS implementation_steps TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ppt_file_name VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ppt_file_url TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ppt_base64 TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS proposal_status VARCHAR(50);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS approval_notes TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS verified_at VARCHAR(100);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS is_final_selected BOOLEAN DEFAULT FALSE;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS selection_notes TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS assigned_evaluator VARCHAR(255);`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS evaluator_scores TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS evaluation_status VARCHAR(50) DEFAULT 'pending';`,
        `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS total_score NUMERIC DEFAULT 0;`
      ];

      for (const mQuery of migrationQueries) {
        try {
          await client.query(mQuery);
        } catch (e) {}
      }

      const insertSql = `
        INSERT INTO ${tableName} (
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
          evaluator_scores, evaluation_notes, evaluation_status, total_score
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
          $56, $57, $58, $59
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
          total_score = EXCLUDED.total_score;
      `;

      const totalScore = registration.evaluatorScores ? Object.values(registration.evaluatorScores).reduce((a, b) => Number(a) + Number(b), 0) : 0;

      const values = [
        registration.id,
        registration.registrationId,
        registration.teamName,
        registration.leadName,
        registration.leadDepartment,
        registration.leadMobile,
        registration.leadGender || "",
        registration.leadAcademicYear || "",
        registration.member1 || "",
        registration.member1Gender || "",
        registration.member1Email || "",
        registration.member1Phone || "",
        registration.member1AcademicYear || "",
        registration.member2 || "",
        registration.member2Gender || "",
        registration.member2Email || "",
        registration.member2Phone || "",
        registration.member2AcademicYear || "",
        registration.member3 || "",
        registration.member3Gender || "",
        registration.member3Email || "",
        registration.member3Phone || "",
        registration.member3AcademicYear || "",
        registration.member4 || "",
        registration.member4Gender || "",
        registration.member4Email || "",
        registration.member4Phone || "",
        registration.member4AcademicYear || "",
        registration.member5 || "",
        registration.member5Gender || "",
        registration.member5Email || "",
        registration.member5Phone || "",
        registration.member5AcademicYear || "",
        !!registration.hasFemaleMember,
        registration.mentorName || "",
        registration.problemStatementId || "",
        registration.submittedAt || new Date().toISOString(),
        registration.studentEmail || "",
        registration.paymentStatus || "free",
        registration.paymentId || "",
        registration.orderId || "",
        registration.amountPaid !== undefined ? registration.amountPaid : null,
        registration.abstract || "",
        registration.implementationSteps || "",
        registration.pptFileName || "",
        registration.pptFileUrl || "",
        registration.pptBase64 || "",
        registration.proposalStatus || "saved",
        registration.approvalStatus || "pending",
        registration.approvalNotes || "",
        registration.verifiedAt || "",
        registration.verifiedBy || "",
        !!registration.isFinalSelected,
        registration.selectionNotes || "",
        registration.assignedEvaluator || "",
        registration.evaluatorScores ? JSON.stringify(registration.evaluatorScores) : "",
        registration.evaluationNotes || "",
        registration.evaluationStatus || "pending",
        totalScore
      ];

      await client.query(insertSql, values);
      await client.end();
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[External DB Error] Sync failed for registration ${registration.id}:`, err);
    return { success: false, error: err.message };
  }
}

// Restore data from external PostgreSQL or MongoDB database on server boot or on-demand
async function restoreDataFromExternalDB(overrideConfig?: any): Promise<{ success: boolean; message: string; counts?: any }> {
  const savedSettings = readSettings();
  const settings = { ...savedSettings, ...(overrideConfig || {}) };

  if (settings.dbPassword && savedSettings.dbPassword) {
    settings.dbPassword = resolveSecretUpdate(settings.dbPassword, savedSettings.dbPassword, process.env.DB_PASSWORD || process.env.PG_PASSWORD);
  }

  const rawDbType = (settings.dbType || "").toLowerCase();
  const isMongoExplicit = rawDbType === "mongodb" || !!process.env.MONGODB_URI;
  const isSqlExplicit = (rawDbType === "sql" || rawDbType === "postgres" || rawDbType === "postgresql") ||
    !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_HOST || process.env.DB_HOST);

  const dbType = isMongoExplicit ? "mongodb" : "sql";
  const isExplicitlyRequested = !!overrideConfig;
  const isDbActive = !!(
    (settings.dbEnabled !== false) &&
    (settings.dbHost || process.env.DB_HOST || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MONGODB_URI || process.env.PG_HOST || db.isPostgres())
  );
  
  if (!isExplicitlyRequested && !isDbActive) {
    return { success: false, message: "No external database actively enabled. Operating on local storage adapter." };
  }

  try {
    const counts = {
      registrations: 0,
      students: 0,
      problemStatements: 0,
      criteria: 0,
      customPages: 0,
      menuItems: 0,
      liveUpdates: 0,
      files: 0,
      settingsRestored: false,
      homepageRestored: false
    };

    if (dbType === "mongodb") {
      const { MongoClient } = await import("mongodb");
      let mongoUrl = process.env.MONGODB_URI || "";
      if (!mongoUrl) {
        if (settings.dbUsername && settings.dbPassword) {
          mongoUrl = `mongodb://${encodeURIComponent(settings.dbUsername)}:${encodeURIComponent(settings.dbPassword)}@${settings.dbHost}:${settings.dbPort || 27017}/${settings.dbName || "svec_sih"}`;
        } else {
          mongoUrl = `mongodb://${settings.dbHost}:${settings.dbPort || 27017}/${settings.dbName || "svec_sih"}`;
        }
        if (settings.dbHost?.startsWith("mongodb://") || settings.dbHost?.startsWith("mongodb+srv://")) {
          mongoUrl = settings.dbHost;
        }
      }

      if (!mongoUrl) return { success: false, message: "Missing MongoDB connection string." };

      const client = new MongoClient(mongoUrl);
      await client.connect();
      const mongoDb = client.db(settings.dbName || "svec_sih");

      // 1. Restore Registrations
      const regColl = mongoDb.collection(settings.dbCollectionOrTable || "registrations");
      const dbRegistrations = (await regColl.find({}).toArray()) as any[];
      if (dbRegistrations && dbRegistrations.length > 0) {
        const localRegs = readRegistrations();
        const localMap = new Map(localRegs.map(r => [r.id, r]));
        for (const reg of dbRegistrations) {
          const { _id, ...cleanReg } = reg;
          if (cleanReg.id) {
            if (cleanReg.pptBase64 && (!cleanReg.pptFileUrl || !fs.existsSync(path.join(DATA_DIR, cleanReg.pptFileUrl.replace(/^\/api\//, ""))))) {
              const saved = saveBase64File(cleanReg.pptBase64, "ppts", cleanReg.pptFileName || `${cleanReg.teamName}_presentation.pptx`);
              if (saved) cleanReg.pptFileUrl = saved.url;
            }
            localMap.set(cleanReg.id, cleanReg as Registration);
          }
        }
        const mergedRegs = Array.from(localMap.values());
        fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(mergedRegs, null, 2), "utf-8");
        counts.registrations = mergedRegs.length;
      }

      // 2. Restore Students
      const studentColl = mongoDb.collection("students");
      const dbStudents = (await studentColl.find({}).toArray()) as any[];
      if (dbStudents && dbStudents.length > 0) {
        const localStudents = readStudents();
        const studentMap = new Map(localStudents.map(s => [s.email.toLowerCase(), s]));
        for (const st of dbStudents) {
          const { _id, ...cleanStudent } = st;
          if (cleanStudent.email) {
            studentMap.set(cleanStudent.email.toLowerCase(), cleanStudent as Student);
          }
        }
        const mergedStudents = Array.from(studentMap.values());
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify(mergedStudents, null, 2), "utf-8");
        counts.students = mergedStudents.length;
      }

      // 3. Restore Metadata & structured collections
      const psColl = mongoDb.collection("problem_statements");
      const dbPs = await psColl.find({}).toArray();
      if (dbPs && dbPs.length > 0) {
        const cleanPs = dbPs.map(({ _id, ...rest }) => rest);
        fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(cleanPs, null, 2), "utf-8");
        counts.problemStatements = cleanPs.length;
      }

      const critColl = mongoDb.collection("evaluation_criteria");
      const dbCrit = await critColl.find({}).toArray();
      if (dbCrit && dbCrit.length > 0) {
        const cleanCrit = dbCrit.map(({ _id, ...rest }) => rest);
        fs.writeFileSync(CRITERIA_FILE, JSON.stringify(cleanCrit, null, 2), "utf-8");
        counts.criteria = cleanCrit.length;
      }

      const pagesColl = mongoDb.collection("custom_pages");
      const dbPages = await pagesColl.find({}).toArray();
      if (dbPages && dbPages.length > 0) {
        const cleanPages = dbPages.map(({ _id, ...rest }) => rest);
        fs.writeFileSync(PAGES_FILE, JSON.stringify(cleanPages, null, 2), "utf-8");
        counts.customPages = cleanPages.length;
      }

      const menuColl = mongoDb.collection("menu_items");
      const dbMenu = await menuColl.find({}).toArray();
      if (dbMenu && dbMenu.length > 0) {
        const cleanMenu = dbMenu.map(({ _id, ...rest }) => rest);
        fs.writeFileSync(MENU_FILE, JSON.stringify(cleanMenu, null, 2), "utf-8");
        counts.menuItems = cleanMenu.length;
      }

      const updatesColl = mongoDb.collection("live_updates");
      const dbUpdates = await updatesColl.find({}).toArray();
      if (dbUpdates && dbUpdates.length > 0) {
        const cleanUpdates = dbUpdates.map(({ _id, ...rest }) => rest);
        fs.writeFileSync(UPDATES_FILE, JSON.stringify(cleanUpdates, null, 2), "utf-8");
        counts.liveUpdates = cleanUpdates.length;
      }

      const hpColl = mongoDb.collection("homepage_content");
      const dbHp = await hpColl.findOne({ id: "main" });
      if (dbHp && (dbHp.content || dbHp.sihDetails)) {
        const content = dbHp.content || dbHp;
        const { _id, ...cleanHp } = content;
        fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(cleanHp, null, 2), "utf-8");
        counts.homepageRestored = true;
      }

      const metaColl = mongoDb.collection("app_metadata");
      const metaDocs = await metaColl.find({}).toArray();
      for (const doc of metaDocs) {
        const rawKey = doc.key || doc.id;
        const rawData = doc.data !== undefined ? doc.data : (doc.data_json !== undefined ? doc.data_json : doc.metadata_json);
        if (!rawKey || !rawData) continue;
        const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
        if (rawKey === "problem_statements" && Array.isArray(data) && counts.problemStatements === 0) {
          fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(data, null, 2), "utf-8");
          counts.problemStatements = data.length;
        } else if (rawKey === "homepage_content" && data?.sihDetails && !counts.homepageRestored) {
          fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
          counts.homepageRestored = true;
        } else if (rawKey === "custom_pages" && Array.isArray(data) && counts.customPages === 0) {
          fs.writeFileSync(PAGES_FILE, JSON.stringify(data, null, 2), "utf-8");
          counts.customPages = data.length;
        } else if (rawKey === "evaluation_criteria" && Array.isArray(data) && counts.criteria === 0) {
          fs.writeFileSync(CRITERIA_FILE, JSON.stringify(data, null, 2), "utf-8");
          counts.criteria = data.length;
        } else if (rawKey === "menu_items" && Array.isArray(data) && counts.menuItems === 0) {
          fs.writeFileSync(MENU_FILE, JSON.stringify(data, null, 2), "utf-8");
          counts.menuItems = data.length;
        }
      }

      // Restore App Settings from MongoDB
      const sColl = mongoDb.collection("app_settings");
      const dbSettings = await sColl.findOne({ $or: [{ id: "main" }, { id: "system_settings" }, { id: "global_settings" }] });
      if (dbSettings) {
        const { _id, id, ...rest } = dbSettings;
        let parsedConfig: any = rest;
        if (rest.settings_json) {
          parsedConfig = typeof rest.settings_json === "string" ? JSON.parse(rest.settings_json) : rest.settings_json;
        }
        const currentLocal = readSettings();
        const merged = { ...currentLocal, ...parsedConfig };
        if (!merged.dbPassword && currentLocal.dbPassword) merged.dbPassword = currentLocal.dbPassword;
        if (merged.dbEnabled === undefined) merged.dbEnabled = true;
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
        counts.settingsRestored = true;
      }

      // Restore Admins from MongoDB
      const adminColl = mongoDb.collection("admins");
      const dbAdmins = (await adminColl.find({}).toArray()) as any[];
      if (dbAdmins && dbAdmins.length > 0) {
        const admins = dbAdmins.map(({ _id, ...r }) => ({
          username: r.username,
          passwordHash: r.passwordHash || r.password_hash,
          role: r.role,
          department: r.department || ""
        }));
        db.writeLocalFile("admins.json", admins);
      }

      // Restore Evaluations from MongoDB
      const evalColl = mongoDb.collection("team_evaluations");
      const dbEvals = await evalColl.find({}).toArray();
      if (dbEvals && dbEvals.length > 0) {
        const evals = dbEvals.map(({ _id, ...r }) => r);
        db.writeLocalFile("evaluations.json", evals);
      }

      // Restore Payments from MongoDB
      const payColl = mongoDb.collection("payment_transactions");
      const dbPays = await payColl.find({}).toArray();
      if (dbPays && dbPays.length > 0) {
        const payments = dbPays.map(({ _id, ...r }) => r);
        db.writeLocalFile("payments.json", payments);
      }

      // Restore files from app_files collection
      const filesColl = mongoDb.collection("app_files");
      const dbFiles = await filesColl.find({}).toArray();
      if (dbFiles && dbFiles.length > 0) {
        for (const fileDoc of dbFiles) {
          const b64 = fileDoc.dataBase64 || fileDoc.data_base64;
          if (fileDoc.category && fileDoc.filename && b64) {
            const dir = path.join(DATA_DIR, "uploads", fileDoc.category);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const filePath = path.join(dir, fileDoc.filename);
            if (!fs.existsSync(filePath)) {
              const cleanBase64 = b64.replace(/^data:[^;]+;base64,/, "");
              fs.writeFileSync(filePath, Buffer.from(cleanBase64, "base64"));
              counts.files++;
            }
          }
        }
      }

      await client.close();

      // Hydrate all uploaded files and PPTs
      try {
        const fileSyncRes = await db.syncAllFilesToDisk();
        counts.files += fileSyncRes.restoredCount;
      } catch (e) {}

      return { 
        success: true, 
        message: `Successfully restored data from MongoDB (${counts.registrations} registrations, ${counts.students} students, ${counts.problemStatements} problem statements, ${counts.files} files).`, 
        counts 
      };

    } else if (dbType === "sql") {
      const { default: pg } = await import("pg");
      const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      const clientConfig = connStr 
        ? { connectionString: connStr, ssl: (connStr.includes("localhost") || connStr.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false } }
        : {
            host: settings.dbHost || "localhost",
            port: settings.dbPort ? Number(settings.dbPort) : 5432,
            database: settings.dbName || "svec_sih",
            user: settings.dbUsername || "postgres",
            password: settings.dbPassword || "",
            ssl: (settings.dbHost?.includes("localhost") || settings.dbHost?.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false }
          };

      const client = new pg.Client(clientConfig);
      await client.connect();

      // Ensure base tables exist & migrate schema columns idempotently
      await client.query(`
        CREATE TABLE IF NOT EXISTS registrations (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(100),
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
          problem_statement_id VARCHAR(255),
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
        );
      `);

      // 1. Restore Registrations from PostgreSQL
      const regTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'registrations'
        );
      `);

      if (regTableCheck.rows[0]?.exists) {
        const result = await client.query(`SELECT * FROM registrations ORDER BY created_at DESC`);
        if (result.rows && result.rows.length > 0) {
          const localRegs = readRegistrations();
          const localMap = new Map(localRegs.map(r => [r.id, r]));
          for (const row of result.rows) {
            let evaluatorScores: { [key: string]: number } | undefined;
            if (row.evaluator_scores) {
              try {
                evaluatorScores = typeof row.evaluator_scores === "string" ? JSON.parse(row.evaluator_scores) : row.evaluator_scores;
              } catch (e) {}
            }

            const mappedReg: Registration = {
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
              amountPaid: row.amount_paid !== undefined && row.amount_paid !== null ? Number(row.amount_paid) : undefined,
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
              evaluationStatus: row.evaluation_status || "pending",
              totalScore: row.total_score ? Number(row.total_score) : 0
            };

            if (mappedReg.pptBase64 && (!mappedReg.pptFileUrl || !fs.existsSync(path.join(DATA_DIR, mappedReg.pptFileUrl.replace(/^\/api\//, ""))))) {
              const saved = saveBase64File(mappedReg.pptBase64, "ppts", mappedReg.pptFileName || `${mappedReg.teamName}_presentation.pptx`);
              if (saved) mappedReg.pptFileUrl = saved.url;
            }

            localMap.set(mappedReg.id, mappedReg);
          }
          const mergedRegs = Array.from(localMap.values());
          fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(mergedRegs, null, 2), "utf-8");
          counts.registrations = mergedRegs.length;
        }
      }

      // If registrations table was empty, check normalized teams table fallback
      if (counts.registrations === 0) {
        try {
          const teamsCheck = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = 'teams'
            );
          `);
          if (teamsCheck.rows[0]?.exists) {
            const teamsRes = await client.query(`SELECT * FROM teams ORDER BY created_at DESC`);
            if (teamsRes.rows && teamsRes.rows.length > 0) {
              const reconstructedRegs: Registration[] = [];
              for (const t of teamsRes.rows) {
                // Fetch members
                const memRes = await client.query(`SELECT * FROM team_members WHERE team_id = $1 ORDER BY member_index ASC`, [t.id]);
                // Fetch submission
                const subRes = await client.query(`SELECT * FROM submissions WHERE team_id = $1 LIMIT 1`, [t.id]);
                const sub = subRes.rows[0] || {};
                
                const regObj: any = {
                  id: t.id,
                  registrationId: t.registration_id,
                  teamName: t.team_name,
                  leadName: t.lead_name,
                  leadDepartment: t.lead_department,
                  leadMobile: t.lead_mobile,
                  leadGender: t.lead_gender,
                  leadAcademicYear: t.lead_academic_year,
                  hasFemaleMember: !!t.has_female_member,
                  mentorName: t.mentor_name,
                  problemStatementId: t.problem_statement_id,
                  submittedAt: t.submitted_at || sub.submitted_at,
                  studentEmail: t.student_email,
                  paymentStatus: t.payment_status || "free",
                  paymentId: t.payment_id,
                  orderId: t.order_id,
                  amountPaid: t.amount_paid ? Number(t.amount_paid) : undefined,
                  approvalStatus: t.approval_status || "pending",
                  approvalNotes: t.approval_notes,
                  verifiedAt: t.verified_at,
                  verifiedBy: t.verified_by,
                  isFinalSelected: !!t.is_final_selected,
                  selectionNotes: t.selection_notes,
                  assignedEvaluator: t.assigned_evaluator,
                  evaluationStatus: t.evaluation_status || "pending",
                  totalScore: t.total_score ? Number(t.total_score) : 0,
                  abstract: sub.abstract,
                  implementationSteps: sub.implementation_steps,
                  pptFileName: sub.ppt_file_name,
                  pptFileUrl: sub.ppt_file_url,
                  pptBase64: sub.ppt_base64,
                  proposalStatus: sub.proposal_status || "saved"
                };

                memRes.rows.forEach((m: any, idx: number) => {
                  const mNum = idx + 1;
                  regObj[`member${mNum}`] = m.name;
                  regObj[`member${mNum}Gender`] = m.gender;
                  regObj[`member${mNum}Email`] = m.email;
                  regObj[`member${mNum}Phone`] = m.phone;
                  regObj[`member${mNum}AcademicYear`] = m.academic_year;
                });

                if (regObj.pptBase64 && (!regObj.pptFileUrl || !fs.existsSync(path.join(DATA_DIR, regObj.pptFileUrl.replace(/^\/api\//, ""))))) {
                  const saved = saveBase64File(regObj.pptBase64, "ppts", regObj.pptFileName || `${regObj.teamName}_presentation.pptx`);
                  if (saved) regObj.pptFileUrl = saved.url;
                }

                reconstructedRegs.push(regObj as Registration);
              }

              if (reconstructedRegs.length > 0) {
                fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(reconstructedRegs, null, 2), "utf-8");
                counts.registrations = reconstructedRegs.length;
              }
            }
          }
        } catch (e) {
          console.warn("[External DB] Error fetching normalized teams:", e);
        }
      }

      // 2. Restore Students from PostgreSQL
      try {
        const studentTableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'students'
          );
        `);
        if (studentTableCheck.rows[0]?.exists) {
          const studentRes = await client.query(`SELECT * FROM students`);
          if (studentRes.rows && studentRes.rows.length > 0) {
            const localStudents = readStudents();
            const studentMap = new Map(localStudents.map(s => [s.email.toLowerCase(), s]));
            for (const row of studentRes.rows) {
              const studentObj: Student = {
                id: row.id,
                email: row.email,
                passwordHash: row.password_hash || row.password || "",
                name: row.name || "",
                gender: row.gender || "",
                department: row.department || "",
                mobile: row.mobile || "",
                academicYear: row.academic_year || "",
                rollNumber: row.roll_number || "",
                createdAt: row.created_at || new Date().toISOString()
              };
              if (studentObj.email) {
                studentMap.set(studentObj.email.toLowerCase(), studentObj);
              }
            }
            const mergedStudents = Array.from(studentMap.values());
            fs.writeFileSync(STUDENTS_FILE, JSON.stringify(mergedStudents, null, 2), "utf-8");
            counts.students = mergedStudents.length;
          }
        }
      } catch (e) {
        console.warn("[External DB] Error checking students table:", e);
      }

      // 3. Restore Problem Statements
      try {
        const psCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'problem_statements'
          );
        `);
        if (psCheck.rows[0]?.exists) {
          let psRes: any;
          try {
            psRes = await client.query(`SELECT * FROM problem_statements ORDER BY sort_order ASC, id ASC`);
          } catch {
            psRes = await client.query(`SELECT * FROM problem_statements ORDER BY id ASC`);
          }
          if (psRes.rows && psRes.rows.length > 0) {
            const statements: ProblemStatement[] = psRes.rows.map(r => ({
              id: r.id,
              code: r.code,
              title: r.title,
              category: r.category,
              organization: r.organization,
              description: r.description || ""
            }));
            fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(statements, null, 2), "utf-8");
            counts.problemStatements = statements.length;
          } else {
            // Check if app_settings has problem_statements_backup
            try {
              const bRes = await client.query(`SELECT settings_json FROM app_settings WHERE id = 'problem_statements_backup' LIMIT 1`);
              if (bRes.rows[0]?.settings_json) {
                const parsed = typeof bRes.rows[0].settings_json === "string" ? JSON.parse(bRes.rows[0].settings_json) : bRes.rows[0].settings_json;
                if (Array.isArray(parsed) && parsed.length > 0) {
                  fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(parsed, null, 2), "utf-8");
                  counts.problemStatements = parsed.length;
                  await db.saveProblemStatements(parsed);
                }
              }
            } catch (bErr) {}
          }
        }
      } catch (e) {}

      // 4. Restore Evaluation Criteria
      try {
        const critCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'evaluation_criteria'
          );
        `);
        if (critCheck.rows[0]?.exists) {
          const critRes = await client.query(`SELECT * FROM evaluation_criteria ORDER BY sort_order ASC`);
          if (critRes.rows && critRes.rows.length > 0) {
            const criteria: EvaluationCriterion[] = critRes.rows.map(r => ({
              id: r.id,
              name: r.name,
              maxScore: r.max_score || 10,
              description: r.description || ""
            }));
            fs.writeFileSync(CRITERIA_FILE, JSON.stringify(criteria, null, 2), "utf-8");
            counts.criteria = criteria.length;
          }
        }
      } catch (e) {}

      // 5. Restore App Settings
      try {
        const settingsCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'app_settings'
          );
        `);
        if (settingsCheck.rows[0]?.exists) {
          const sRes = await client.query(`SELECT * FROM app_settings WHERE id = 'global_settings' OR id = 'main' OR id = 'system_settings' LIMIT 1`);
          if (sRes.rows && sRes.rows.length > 0) {
            const row = sRes.rows[0];
            const parsedConfig = typeof row.settings_json === "string" ? JSON.parse(row.settings_json) : (row.settings_json || {});
            const currentLocal = readSettings();
            const merged = { ...currentLocal, ...parsedConfig };
            if (!merged.dbPassword && currentLocal.dbPassword) merged.dbPassword = currentLocal.dbPassword;
            if (merged.dbEnabled === undefined) merged.dbEnabled = true;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
            counts.settingsRestored = true;
          } else {
            // Seed current local settings into app_settings table so future redeployments preserve them
            const currentLocal = readSettings();
            await client.query(`
              INSERT INTO app_settings (id, settings_json, updated_at)
              VALUES ('main', $1, NOW())
              ON CONFLICT (id) DO NOTHING;
            `, [JSON.stringify(currentLocal)]);
          }
        }
      } catch (e) {}

      // 6. Restore Homepage Content
      try {
        const hpCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'homepage_content'
          );
        `);
        if (hpCheck.rows[0]?.exists) {
          const hpRes = await client.query(`SELECT * FROM homepage_content WHERE id = 'main' LIMIT 1`);
          if (hpRes.rows && hpRes.rows.length > 0) {
            const row = hpRes.rows[0];
            const parsedHp = typeof row.content_json === "string" ? JSON.parse(row.content_json) : (row.content_json || {});
            if (parsedHp.sihDetails) {
              fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(parsedHp, null, 2), "utf-8");
              counts.homepageRestored = true;
            }
          }
        }
      } catch (e) {}

      // 7. Restore Custom Pages
      try {
        const pageCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'custom_pages'
          );
        `);
        if (pageCheck.rows[0]?.exists) {
          const pRes = await client.query(`SELECT * FROM custom_pages`);
          if (pRes.rows && pRes.rows.length > 0) {
            const pages: CustomPage[] = pRes.rows.map(r => ({
              id: r.id,
              title: r.title,
              slug: r.slug,
              content: r.content,
              published: r.published ?? true,
              createdAt: r.created_at
            }));
            fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), "utf-8");
            counts.customPages = pages.length;
          }
        }
      } catch (e) {}

      // 8. Restore Menu Items
      try {
        const menuCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'menu_items'
          );
        `);
        if (menuCheck.rows[0]?.exists) {
          const mRes = await client.query(`SELECT * FROM menu_items ORDER BY sort_order ASC`);
          if (mRes.rows && mRes.rows.length > 0) {
            const menuItems: MenuItem[] = mRes.rows.map(r => ({
              id: r.id,
              label: r.label,
              type: r.type,
              target: r.target,
              order: r.sort_order
            }));
            fs.writeFileSync(MENU_FILE, JSON.stringify(menuItems, null, 2), "utf-8");
            counts.menuItems = menuItems.length;
          }
        }
      } catch (e) {}

      // 9. Restore Live Updates
      try {
        const updatesCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'live_updates'
          );
        `);
        if (updatesCheck.rows[0]?.exists) {
          const uRes = await client.query(`SELECT * FROM live_updates ORDER BY created_at DESC`);
          if (uRes.rows && uRes.rows.length > 0) {
            const updates: LiveUpdate[] = uRes.rows.map(r => ({
              id: r.id,
              text: r.text,
              isImportant: !!r.is_important,
              createdAt: r.created_at
            }));
            fs.writeFileSync(UPDATES_FILE, JSON.stringify(updates, null, 2), "utf-8");
            counts.liveUpdates = updates.length;
          }
        }
      } catch (e) {}

      // 10. Restore Admins
      try {
        const adminCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'admins'
          );
        `);
        if (adminCheck.rows[0]?.exists) {
          const aRes = await client.query(`SELECT * FROM admins`);
          if (aRes.rows && aRes.rows.length > 0) {
            const admins = aRes.rows.map(r => ({
              username: r.username,
              passwordHash: r.password_hash,
              role: r.role,
              department: r.department || ""
            }));
            db.writeLocalFile("admins.json", admins);
          }
        }
      } catch (e) {}

      // 11. Restore app_files & hydrate media/files to disk
      try {
        const filesCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'app_files'
          );
        `);
        if (filesCheck.rows[0]?.exists) {
          const fRes = await client.query(`SELECT category, filename, data_base64 FROM app_files`);
          if (fRes.rows && fRes.rows.length > 0) {
            for (const r of fRes.rows) {
              if (r.category && r.filename && r.data_base64) {
                const dir = path.join(DATA_DIR, "uploads", r.category);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const filePath = path.join(dir, r.filename);
                if (!fs.existsSync(filePath)) {
                  const cleanBase64 = r.data_base64.replace(/^data:[^;]+;base64,/, "");
                  fs.writeFileSync(filePath, Buffer.from(cleanBase64, "base64"));
                  counts.files++;
                }
              }
            }
          }
        }
      } catch (e) {}

      await client.end();

      // Trigger db.syncAllFilesToDisk() to ensure all uploads are hydrated to disk
      try {
        const fileSyncRes = await db.syncAllFilesToDisk();
        counts.files += fileSyncRes.restoredCount;
      } catch (e) {}

      return { 
        success: true, 
        message: `Successfully restored data from PostgreSQL (${counts.registrations} registrations, ${counts.students} students, ${counts.problemStatements} problem statements, ${counts.criteria} criteria, ${counts.files} files).`, 
        counts 
      };
    }

    return { success: false, message: "Unknown database type." };
  } catch (err: any) {
    console.error("[External DB Restore Error]:", err);
    return { success: false, message: `Restore error: ${err.message}` };
  }
}


// Async SMTP email dispatch helper
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const settings = readSettings();
  if (!settings.emailEnabled) {
    console.log(`[Email Skipped] system-wide email is disabled. Target: ${to}, Subject: ${subject}`);
    return false;
  }

  const host = (settings.smtpHost || "").trim();
  const port = Number(settings.smtpPort) || 587;
  const user = (settings.smtpUser || "").trim();
  const pass = (settings.smtpPass || "").trim();
  const from = (settings.smtpFrom || "").trim() || `"SVEC SIH Support" <noreply@example.com>`;

  if (!host || !user || !pass) {
    console.warn(`[Email Failed] SMTP configuration is missing some fields (Host: ${host}, User: ${user}). Target: ${to}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false // avoids failing on self-signed certificates common in dev
      }
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlContent
    });

    console.log(`[Email Success] Message sent to ${to}. Subject: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[Email Error] Failed to send email to ${to}:`, err);
    return false;
  }
}

// Real SMS Dispatch Helper
async function sendRealSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  if (!settings.smsEnabled) {
    console.log(`[SMS Disabled] To: ${to}, Message: ${message}`);
    return { success: true };
  }

  const provider = settings.smsProvider || "twilio";
  const sanitizedTo = to.replace(/\s+/g, "").trim();

  if (provider === "twilio") {
    const sid = (settings.twilioSid || "").trim();
    const token = (settings.twilioAuthToken || "").trim();
    const from = (settings.twilioFrom || "").trim();

    if (!sid || !token || !from) {
      return { success: false, error: "Twilio SID, Auth Token, or From Number is missing." };
    }

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      // Twilio API accepts + prefixed country code
      const targetPhone = sanitizedTo.startsWith("+") ? sanitizedTo : (sanitizedTo.startsWith("91") && sanitizedTo.length === 12 ? `+${sanitizedTo}` : `+91${sanitizedTo}`);
      const body = new URLSearchParams({
        To: targetPhone,
        From: from,
        Body: message
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });

      const resData = await response.json() as any;
      if (response.ok) {
        console.log(`[Twilio SMS Success] Sent to ${sanitizedTo}. SID: ${resData.sid}`);
        return { success: true };
      } else {
        return { success: false, error: resData.message || `Twilio Error status ${response.status}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Twilio request exception" };
    }
  } else if (provider === "msg91") {
    const authKey = (settings.msg91AuthKey || "").trim();
    const senderId = (settings.msg91SenderId || "").trim();
    const route = (settings.msg91Route || "4").trim();

    if (!authKey) {
      return { success: false, error: "MSG91 Auth Key is missing." };
    }

    try {
      // MSG91 prefers 91 prefix without '+'
      const targetPhone = sanitizedTo.replace("+", "");
      const finalPhone = targetPhone.startsWith("91") && targetPhone.length === 12 ? targetPhone : `91${targetPhone}`;

      const response = await fetch(`https://api.msg91.com/api/v2/sendsms`, {
        method: "POST",
        headers: {
          "authkey": authKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: senderId || "SVECSI",
          route: route,
          sms: [
            {
              message: message,
              to: [finalPhone]
            }
          ]
        })
      });

      const resData = await response.text();
      if (response.ok) {
        console.log(`[MSG91 SMS Success] Sent to ${sanitizedTo}. Response: ${resData}`);
        return { success: true };
      } else {
        return { success: false, error: `MSG91 HTTP Error status ${response.status}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "MSG91 request exception" };
    }
  } else if (provider === "custom") {
    const url = (settings.smsCustomUrl || "").trim();
    const method = settings.smsCustomMethod || "POST";
    const headersStr = (settings.smsCustomHeaders || "").trim();
    const payloadStr = (settings.smsCustomPayload || "").trim();

    if (!url) {
      return { success: false, error: "Custom SMS HTTP Gateway URL is missing." };
    }

    try {
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (headersStr) {
        try {
          headers = { ...headers, ...JSON.parse(headersStr) };
        } catch (e: any) {
          console.warn("[Custom SMS Headers Error]", e);
        }
      }

      const cleanPhone = sanitizedTo.replace("+", "");
      let processedUrl = url
        .replace(/\{\{phone\}\}/g, encodeURIComponent(sanitizedTo))
        .replace(/\{\{message\}\}/g, encodeURIComponent(message));
      
      let processedPayload = payloadStr
        .replace(/\{\{phone\}\}/g, cleanPhone)
        .replace(/\{\{message\}\}/g, message);

      const requestOptions: any = {
        method,
        headers
      };

      if (method === "POST" && processedPayload) {
        requestOptions.body = processedPayload;
      }

      const response = await fetch(processedUrl, requestOptions);
      const resText = await response.text();
      if (response.ok) {
        console.log(`[Custom SMS Success] Sent to ${sanitizedTo}. Response: ${resText}`);
        return { success: true };
      } else {
        return { success: false, error: `Custom Gateway HTTP Status ${response.status}: ${resText}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Custom Gateway exception" };
    }
  }

  return { success: false, error: "Invalid SMS gateway provider selected." };
}

// Real WhatsApp Template Dispatch Helper
async function sendRealWhatsapp(to: string, templateName: string, variables: string[]): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  if (!settings.whatsappEnabled) {
    console.log(`[WhatsApp Disabled] To: ${to}, Template: ${templateName}`);
    return { success: true };
  }

  const provider = settings.whatsappProvider || "meta";
  const sanitizedTo = to.replace(/\s+/g, "").trim();

  if (provider === "meta") {
    const accessToken = (settings.whatsappAccessToken || "").trim();
    const phoneId = (settings.whatsappPhoneId || "").trim();

    if (!accessToken || !phoneId) {
      return { success: false, error: "Meta WhatsApp Token or Phone ID is missing." };
    }

    try {
      const cleanPhone = sanitizedTo.replace("+", "");
      const finalPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`;

      const parameters = variables.map(v => ({
        type: "text",
        text: v
      }));

      const body = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: finalPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US"
          },
          components: parameters.length > 0 ? [
            {
              type: "body",
              parameters: parameters
            }
          ] : []
        }
      };

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const resData = await response.json() as any;
      if (response.ok) {
        console.log(`[Meta WhatsApp Success] Sent to ${sanitizedTo}. Msg ID: ${resData.messages?.[0]?.id}`);
        return { success: true };
      } else {
        return { success: false, error: resData.error?.message || `Meta WhatsApp status ${response.status}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Meta WhatsApp exception" };
    }
  } else if (provider === "custom") {
    const url = (settings.whatsappCustomUrl || "").trim();
    const method = settings.whatsappCustomMethod || "POST";
    const headersStr = (settings.whatsappCustomHeaders || "").trim();
    const payloadStr = (settings.whatsappCustomPayload || "").trim();

    if (!url) {
      return { success: false, error: "Custom WhatsApp HTTP Gateway URL is missing." };
    }

    try {
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      if (headersStr) {
        try {
          headers = { ...headers, ...JSON.parse(headersStr) };
        } catch (e: any) {
          console.warn("[Custom WhatsApp Headers Error]", e);
        }
      }

      const cleanPhone = sanitizedTo.replace("+", "");
      const variablesJson = JSON.stringify(variables);
      const var1 = variables[0] || "";
      const var2 = variables[1] || "";
      const var3 = variables[2] || "";

      let processedUrl = url
        .replace(/\{\{phone\}\}/g, encodeURIComponent(sanitizedTo))
        .replace(/\{\{template\}\}/g, encodeURIComponent(templateName));
      
      let processedPayload = payloadStr
        .replace(/\{\{phone\}\}/g, cleanPhone)
        .replace(/\{\{template\}\}/g, templateName)
        .replace(/\{\{variables\}\}/g, variablesJson)
        .replace(/\{\{var1\}\}/g, var1)
        .replace(/\{\{var2\}\}/g, var2)
        .replace(/\{\{var3\}\}/g, var3);

      const requestOptions: any = {
        method,
        headers
      };

      if (method === "POST" && processedPayload) {
        requestOptions.body = processedPayload;
      }

      const response = await fetch(processedUrl, requestOptions);
      const resText = await response.text();
      if (response.ok) {
        console.log(`[Custom WhatsApp Success] Sent to ${sanitizedTo}. Response: ${resText}`);
        return { success: true };
      } else {
        return { success: false, error: `Custom WhatsApp status ${response.status}: ${resText}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Custom WhatsApp request exception" };
    }
  }

  return { success: false, error: "Invalid WhatsApp gateway provider selected." };
}


function getAdmins(): AdminUser[] {
  return db.readLocalFile<AdminUser[]>("admins.json", defaultDefaultAdmins);
}

function saveAdmins(admins: AdminUser[]) {
  db.writeLocalFile("admins.json", admins);
  db.saveAdmins(admins).catch(err => {
    console.error("Failed to sync admins to DB:", err);
  });
}

// ------------------- API ROUTES -------------------

// ==========================================
// SECURE FILE UPLOADS & SERVING
// ==========================================

// 1. Unified Multipart & Encrypted File Upload (PPT, PPTX, PDF, Images, Documents)
app.post(
  "/api/upload",
  extractUserOptional,
  upload.single("file"),
  (req, res) => {
    // A. Multipart file stream provided in req.file
    if (req.file) {
      const rawCategory = (req.body.category as UploadCategory) || "documents";
      const validCategories: UploadCategory[] = [
        "ppts", "images", "documents", "sample_ppts", "abstracts",
        "gallery", "homepage", "logos", "certificates", "media",
        "payment_proofs", "upi_qr"
      ];
      const validCategory: UploadCategory = validCategories.includes(rawCategory) ? rawCategory : "documents";

      // Role authorization: Strict admin requirement for official templates, certificates, and UPI QR codes
      if (["sample_ppts", "certificates", "upi_qr"].includes(validCategory)) {
        const isAdmin = (req as any).isAdmin || (req as any).adminRole;
        if (!isAdmin) {
          return res.status(403).json({ error: "Access Denied: Only administrators can upload official templates, certificates, and payment QR codes." });
        }
      }

      // If category is ppts or documents or abstracts, must be an authenticated student or admin
      if (["ppts", "documents", "abstracts", "media"].includes(validCategory)) {
        const isAuth = (req as any).studentUser || (req as any).adminUser || (req as any).isAdmin;
        if (!isAuth) {
          return res.status(401).json({ error: "Authentication required to upload proposals or project documents." });
        }
      }

      // Note: General "images", "gallery", "homepage", "logos", and "payment_proofs" are validated
      // by strict magic bytes, extension whitelisting, and UUID isolation so student forms, consent letters,
      // and admin editors can safely upload visuals without spurious 403 blocks.

      const saveResult = validateAndSaveFile({
        buffer: req.file.buffer,
        clientOriginalName: req.file.originalname,
        clientMimeType: req.file.mimetype,
        category: validCategory
      });

      if (!saveResult.success) {
        return res.status(400).json({ error: saveResult.error });
      }

      return res.json({ success: true, ...saveResult.file });
    }

    // B. Base64 JSON fallback with strict magic-byte validation
    if (req.body && req.body.data) {
      const { data, category, filename } = req.body;
      const validCategories: UploadCategory[] = [
        "ppts", "images", "documents", "sample_ppts", "abstracts",
        "gallery", "homepage", "logos", "certificates", "media"
      ];
      const rawCat = (category as UploadCategory) || "documents";
      const validCategory: UploadCategory = validCategories.includes(rawCat) ? rawCat : "documents";

      if (["sample_ppts", "certificates"].includes(validCategory)) {
        const isAdmin = (req as any).isAdmin || (req as any).adminRole;
        if (!isAdmin) {
          return res.status(403).json({ error: "Access Denied: Only administrators can upload official templates and certificates." });
        }
      }

      const saveResult = saveBase64Securely(data, validCategory, filename);
      if (!saveResult) {
        return res.status(400).json({ error: "Failed to process file. Signature mismatch or unsupported file type." });
      }

      return res.json({ success: true, ...saveResult });
    }

    return res.status(400).json({ error: "No file provided. Please send multipart/form-data with the 'file' field." });
  }
);

// 2. Specialized Multipart Endpoint: Student Team Proposal PPT / PDF Upload
app.post(
  "/api/registrations/my/upload-ppt",
  validateStudentJWT,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No presentation file attached. Please select a PPT, PPTX or PDF file." });
    }

    const studentEmail = (req as any).studentUser?.email?.trim().toLowerCase();
    if (!studentEmail) {
      return res.status(401).json({ error: "Unauthorized: Invalid student token." });
    }

    const registrations = readRegistrations();
    const idx = registrations.findIndex(r => r.studentEmail?.trim().toLowerCase() === studentEmail);
    if (idx === -1) {
      return res.status(404).json({ error: "No team registration found for this student account." });
    }

    const current = registrations[idx];
    const saveResult = validateAndSaveFile({
      buffer: req.file.buffer,
      clientOriginalName: req.file.originalname,
      clientMimeType: req.file.mimetype,
      category: "ppts"
    });

    if (!saveResult.success) {
      return res.status(400).json({ error: saveResult.error });
    }

    // Clean up old PPT from disk if existing
    if (current.pptFileUrl) {
      try {
        const oldFilename = path.basename(current.pptFileUrl);
        const oldPath = path.join(UPLOADS_PPTS_DIR, oldFilename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.warn("Could not remove old PPT file:", e);
      }
    }

    current.pptFileUrl = saveResult.file.url;
    current.pptFileName = req.file.originalname;
    current.pptBase64 = undefined; // Drop heavy base64
    registrations[idx] = current;
    writeRegistrations(registrations);

    // Sync to external DB in background
    syncRegistrationToExternalDB(current).catch(err => {
      console.error("Failed to sync registration after PPT upload:", err);
    });

    return res.json({
      success: true,
      message: "Proposal presentation file uploaded and verified successfully!",
      file: saveResult.file,
      registration: current
    });
  }
);

// 3. Specialized Multipart Endpoint: Admin Sample PPT / Proposal Template Upload
app.post(
  "/api/settings/sample-ppt/upload",
  authorize(["ADMIN", "SPOC"]),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No template file attached. Please select a PPT, PPTX or PDF file." });
    }

    const saveResult = validateAndSaveFile({
      buffer: req.file.buffer,
      clientOriginalName: req.file.originalname,
      clientMimeType: req.file.mimetype,
      category: "sample_ppts"
    });

    if (!saveResult.success) {
      return res.status(400).json({ error: saveResult.error });
    }

    const settings = readSettings();
    settings.samplePptFileName = req.file.originalname;
    settings.samplePptFileUrl = saveResult.file.url;
    if (!settings.samplePptUrl) {
      settings.samplePptUrl = saveResult.file.url;
    }
    writeSettings(settings);
    try {
      await db.saveSettings(settings);
    } catch (dbErr) {
      console.warn("Failed to persist sample PPT settings to DB:", dbErr);
    }

    return res.json({
      success: true,
      url: saveResult.file.url,
      message: "Sample PPT template uploaded successfully!",
      file: saveResult.file,
      settings
    });
  }
);

// 3B. Specialized Endpoint: Admin UPI QR Code Image Upload (Supports Multipart & Base64 JSON)
app.post(
  "/api/settings/upi-qr/upload",
  authorize(["ADMIN"]),
  upload.single("file"),
  (req, res) => {
    let savedFileUrl = "";
    let saveFileObj: any = null;

    if (req.file) {
      const saveResult = validateAndSaveFile({
        buffer: req.file.buffer,
        clientOriginalName: req.file.originalname,
        clientMimeType: req.file.mimetype,
        category: "upi_qr"
      });

      if (!saveResult.success) {
        return res.status(400).json({ error: saveResult.error });
      }
      savedFileUrl = saveResult.file.url;
      saveFileObj = saveResult.file;
    } else if (req.body && (req.body.fileBase64 || req.body.data || req.body.image)) {
      const base64Str = req.body.fileBase64 || req.body.data || req.body.image;
      const fileName = req.body.fileName || "upi_qr_code.png";
      const saved = saveBase64Securely(base64Str, "upi_qr", fileName);
      if (!saved) {
        return res.status(400).json({ error: "Failed to process base64 QR code image. Please check file format." });
      }
      savedFileUrl = saved.url;
      saveFileObj = saved;
    } else {
      return res.status(400).json({ error: "No image file attached. Please select a PNG, JPG, or WEBP QR code image." });
    }

    const settings = readSettings();
    settings.upiQrCodeUrl = savedFileUrl;
    settings.manualPaymentEnabled = true;
    writeSettings(settings);

    return res.json({
      success: true,
      message: "UPI QR code uploaded and configured successfully!",
      url: savedFileUrl,
      file: saveFileObj,
      settings
    });
  }
);

// 3C. Specialized Multipart Endpoint: Student Payment Proof / Screenshot Upload
app.post(
  "/api/registrations/my/upload-payment-proof",
  validateStudentJWT,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No payment proof attached. Please attach a screenshot (PNG, JPG, WEBP) or PDF receipt." });
    }

    const studentEmail = (req as any).studentUser?.email?.trim().toLowerCase();
    if (!studentEmail) {
      return res.status(401).json({ error: "Unauthorized: Invalid student token." });
    }

    const registrations = readRegistrations();
    const idx = registrations.findIndex(r => r.studentEmail?.trim().toLowerCase() === studentEmail);
    if (idx === -1) {
      return res.status(404).json({ error: "No team registration found for this student account." });
    }

    const current = registrations[idx];
    const saveResult = validateAndSaveFile({
      buffer: req.file.buffer,
      clientOriginalName: req.file.originalname,
      clientMimeType: req.file.mimetype,
      category: "payment_proofs"
    });

    if (!saveResult.success) {
      return res.status(400).json({ error: saveResult.error });
    }

    current.paymentProofUrl = saveResult.file.url;
    current.paymentProofFileName = req.file.originalname;
    current.paymentProofBase64 = undefined;
    current.paymentStatus = "pending_verification";
    if (req.body.upiTransactionId) {
      current.upiTransactionId = req.body.upiTransactionId.trim();
    }
    current.paymentRemarks = undefined; // Clear previous rejection remarks on resubmit
    registrations[idx] = current;
    writeRegistrations(registrations);

    // Sync to external DB in background
    syncRegistrationToExternalDB(current).catch(err => {
      console.error("Failed to sync registration after payment proof upload:", err);
    });

    return res.json({
      success: true,
      message: "Payment proof screenshot uploaded and submitted for SPOC verification!",
      file: saveResult.file,
      registration: current
    });
  }
);

// 4. Secure File Retrieval & Serving (Path Traversal Protected, MIME Verified & Auto-Hydrated from DB on Redeploy)
app.get("/api/uploads/:category/:filename", extractUserOptional, async (req, res) => {
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
    "upi_qr"
  ];

  if (!validCategories.includes(category as UploadCategory)) {
    return res.status(400).json({ error: "Invalid upload category." });
  }

  const cleanFilename = path.basename(filename);
  const targetDir = CATEGORY_DIR_MAP[category as UploadCategory] || path.join(UPLOADS_DIR, category);

  if (!isPathSafe(targetDir, cleanFilename)) {
    return res.status(400).json({ error: "Path traversal attempt detected." });
  }

  const filePath = path.join(targetDir, cleanFilename);

  // Content type mapping helper
  const ext = path.extname(cleanFilename).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".png") contentType = "image/png";
  else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  else if (ext === ".webp") contentType = "image/webp";
  else if (ext === ".gif") contentType = "image/gif";
  else if (ext === ".pdf") contentType = "application/pdf";
  else if (ext === ".pptx") contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  else if (ext === ".ppt") contentType = "application/vnd.ms-powerpoint";
  else if (ext === ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  else if (ext === ".doc") contentType = "application/msword";

  const isImage = ["images", "gallery", "homepage", "logos", "certificates", "upi_qr", "payment_proofs"].includes(category) || [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);

  // 1. If file is available on local disk in any standard uploads location, serve immediately
  const candidatePaths = [
    path.join(targetDir, cleanFilename),
    path.join(DATA_DIR, "uploads", category, cleanFilename),
    path.join(DATA_DIR, "uploads", "images", cleanFilename),
    path.join(DATA_DIR, "uploads", "documents", cleanFilename),
    path.join(DATA_DIR, "uploads", "ppts", cleanFilename),
    path.join(DATA_DIR, "uploads", "sample_ppts", cleanFilename),
    path.join(DATA_DIR, "uploads", "upi_qr", cleanFilename),
    path.join(DATA_DIR, "uploads", "payment_proofs", cleanFilename),
    path.join(process.cwd(), "uploads", category, cleanFilename),
    path.join(process.cwd(), "uploads", "images", cleanFilename),
    path.join(process.cwd(), "uploads", "documents", cleanFilename),
    path.join(process.cwd(), "uploads", "ppts", cleanFilename),
    path.join(process.cwd(), "uploads", "sample_ppts", cleanFilename),
    path.join(process.cwd(), "uploads", "upi_qr", cleanFilename),
    path.join(process.cwd(), "uploads", "payment_proofs", cleanFilename),
    path.join("/tmp/svec_uploads", category, cleanFilename),
    path.join("/tmp/svec_uploads", "images", cleanFilename),
    path.join("/tmp/svec_data/uploads", category, cleanFilename),
    path.join("/tmp/svec_data/uploads", "images", cleanFilename)
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      if (isImage) {
        res.setHeader("Content-Disposition", "inline");
      } else {
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(cleanFilename)}"`);
      }
      return res.sendFile(p);
    }
  }

  // 2. On-demand restoration from persistent Database / Cloud Storage (Survives Container Redeploys)
  try {
    const fileRecord = await db.getFileRecord(category, cleanFilename);
    if (fileRecord && fileRecord.dataBase64) {
      const cleanBase64 = fileRecord.dataBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.length > 0) {
        // Write back to container disk in all upload paths for fast subsequent requests
        const writeDirs = [
          targetDir,
          path.join(DATA_DIR, "uploads", category),
          path.join(process.cwd(), "uploads", category)
        ];
        for (const wd of writeDirs) {
          try {
            if (!fs.existsSync(wd)) fs.mkdirSync(wd, { recursive: true });
            fs.writeFileSync(path.join(wd, cleanFilename), buffer);
          } catch (e) {}
        }

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Type", fileRecord.mimeType || contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        if (isImage) {
          res.setHeader("Content-Disposition", "inline");
        } else {
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileRecord.originalName || cleanFilename)}"`);
        }
        return res.send(buffer);
      }
    }

    // 3. Fallback check for PPT presentations in registrations
    if (category === "ppts") {
      const registrations = await db.getRegistrations();
      const matchingReg = registrations.find(r => 
        (r.pptFileUrl && r.pptFileUrl.includes(cleanFilename)) || 
        (r.pptFileName && r.pptFileName === cleanFilename)
      );
      if (matchingReg && matchingReg.pptBase64) {
        const cleanBase64 = matchingReg.pptBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        if (buffer.length > 0) {
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(filePath, buffer);
          // Persist to app_files
          await db.saveFileRecord({
            category: "ppts",
            filename: cleanFilename,
            originalName: matchingReg.pptFileName || cleanFilename,
            mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            size: buffer.length,
            buffer
          });
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(matchingReg.pptFileName || cleanFilename)}"`);
          return res.send(buffer);
        }
      }
    }

    // 4. Fallback check for sample PPT in settings
    if (category === "sample_ppts") {
      const settings = await db.getSettings();
      if (settings.samplePptFileBase64) {
        const cleanBase64 = settings.samplePptFileBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        if (buffer.length > 0) {
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
          fs.writeFileSync(filePath, buffer);
          await db.saveFileRecord({
            category: "sample_ppts",
            filename: cleanFilename,
            originalName: settings.samplePptFileName || cleanFilename,
            mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            size: buffer.length,
            buffer
          });
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
          res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(settings.samplePptFileName || cleanFilename)}"`);
          return res.send(buffer);
        }
      }
    }
  } catch (lookupErr) {
    console.error(`[Upload Lookup Error] ${category}/${cleanFilename}:`, lookupErr);
  }

  return res.status(404).json({ error: "File not found." });
});

// Alias for /uploads/:category/:filename
app.get("/uploads/:category/:filename", (req, res) => {
  res.redirect(`/api/uploads/${encodeURIComponent(req.params.category)}/${encodeURIComponent(req.params.filename)}`);
});

// 5. Stream or download team PPT presentation directly from server disk / database (Authenticated)
app.get("/api/registrations/:id/ppt", validateParams(singleIdParamSchema), extractUserOptional, async (req, res) => {
  const { id } = req.params;
  const registrations = await db.getRegistrations();
  const reg = registrations.find(r => r.id === id || r.registrationId === id);

  if (!reg) {
    return res.status(404).json({ error: "Registration not found." });
  }

  // 1. Check if stored on disk via pptFileUrl
  if (reg.pptFileUrl) {
    const filename = path.basename(reg.pptFileUrl);
    const category = reg.pptFileUrl.includes("/ppts/") ? "ppts" : "documents";
    const targetDir = category === "ppts" ? UPLOADS_PPTS_DIR : UPLOADS_DOCS_DIR;

    if (!isPathSafe(targetDir, filename)) {
      return res.status(400).json({ error: "Invalid file path." });
    }

    const filePath = path.join(targetDir, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      const downloadName = reg.pptFileName || `${reg.teamName || "team"}_presentation${ext || ".pptx"}`;
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
      if (ext === ".pdf") res.setHeader("Content-Type", "application/pdf");
      else res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      return res.sendFile(filePath);
    }

    // Attempt restoration from db app_files
    const fileRecord = await db.getFileRecord(category, filename);
    if (fileRecord && fileRecord.dataBase64) {
      const cleanBase64 = fileRecord.dataBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.length > 0) {
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(filePath, buffer);
        const downloadName = reg.pptFileName || fileRecord.originalName || filename;
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Type", fileRecord.mimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
        return res.send(buffer);
      }
    }
  }

  // 2. Fallback to pptBase64
  if (reg.pptBase64) {
    try {
      const match = reg.pptBase64.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const base64Data = match ? match[2] : reg.pptBase64;
      const buffer = Buffer.from(base64Data, "base64");
      const downloadName = reg.pptFileName || `${reg.teamName || "team"}_presentation.pptx`;

      // Restore to disk for future requests
      const safeFilename = `${reg.registrationId || reg.id}_ppt.pptx`;
      const targetPath = path.join(UPLOADS_PPTS_DIR, safeFilename);
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, buffer);
      }

      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
      return res.send(buffer);
    } catch (err) {
      console.error("Error serving PPT base64 buffer:", err);
      return res.status(500).json({ error: "Failed to generate PPT download buffer." });
    }
  }

  return res.status(404).json({ error: "No presentation file found for this team." });
});

// Admin: Manual Database Restore Trigger
app.post("/api/admin/restore-from-db", authorize(["ADMIN"]), async (req, res) => {
  const result = await restoreDataFromExternalDB(req.body);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Admin: Export Full JSON State Backup
app.get("/api/admin/backup/export", authorize(["ADMIN"]), (req, res) => {
  const backup = {
    version: "2026.1",
    exportedAt: new Date().toISOString(),
    registrations: readRegistrations(),
    students: readStudents(),
    statements: readStatements(),
    settings: readSettings(),
    homepage: readHomepage(),
    customPages: readCustomPages(),
    evaluationCriteria: readCriteria(),
    menuItems: readMenuItems(),
    updates: readUpdates()
  };

  const filename = `SVEC_SIH_Backup_${new Date().toISOString().split("T")[0]}.json`;
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(backup, null, 2));
});

// Admin: Import and Restore Full JSON State Backup
app.post("/api/admin/backup/import", authorize(["ADMIN"]), (req, res) => {
  const backup = req.body;
  if (!backup || typeof backup !== "object") {
    return res.status(400).json({ error: "Invalid backup JSON format." });
  }

  if (Array.isArray(backup.registrations)) {
    writeRegistrations(backup.registrations);
  }
  if (Array.isArray(backup.students)) {
    writeStudents(backup.students);
  }
  if (Array.isArray(backup.statements)) {
    writeStatements(backup.statements);
  }
  if (backup.settings && typeof backup.settings === "object") {
    writeSettings(backup.settings);
  }
  if (backup.homepage && typeof backup.homepage === "object") {
    writeHomepage(backup.homepage);
  }
  if (Array.isArray(backup.customPages)) {
    writeCustomPages(backup.customPages);
  }
  if (Array.isArray(backup.evaluationCriteria)) {
    writeCriteria(backup.evaluationCriteria);
  }
  if (Array.isArray(backup.menuItems)) {
    writeMenuItems(backup.menuItems);
  }
  if (Array.isArray(backup.updates)) {
    writeUpdates(backup.updates);
  }

  res.json({
    success: true,
    message: "Full application state restored successfully from backup!",
    counts: {
      registrations: backup.registrations?.length || 0,
      students: backup.students?.length || 0,
      statements: backup.statements?.length || 0
    }
  });
});

// Student Auth: Register
app.post("/api/auth/register", validateBody(studentRegisterSchema), (req, res) => {
  const { email, password, gender, department, mobile } = req.body;

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();

  if (students.some(s => s.email === emailClean)) {
    return res.status(400).json({ error: "A student account with this email already exists." });
  }

  const passwordHash = hashPassword(password);
  const newStudent: Student = {
    id: Date.now().toString(),
    email: emailClean,
    passwordHash,
    createdAt: new Date().toISOString(),
    gender: gender || "",
    department: department || "",
    mobile: mobile || ""
  };

  students.push(newStudent);
  writeStudents(students);

  // Trigger background welcome email
  const welcomeSubject = "Welcome to SVEC SIH Hackathon Portal!";
  const welcomeHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <h2 style="color: #4f46e5; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: bold;">Welcome to SVEC SIH Hackathon Portal!</h2>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Hello,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your student registration portal account has been successfully created. You can now use your credentials to manage your team roster, select SIH problem statements, and complete your formal registration.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Your Registration Details:</h3>
        <p style="font-size: 13px; color: #475569; margin: 4px 0;"><strong>Student Email:</strong> ${newStudent.email}</p>
        <p style="font-size: 13px; color: #475569; margin: 4px 0;"><strong>Department:</strong> ${newStudent.department || "N/A"}</p>
        <p style="font-size: 13px; color: #475569; margin: 4px 0;"><strong>Mobile:</strong> ${newStudent.mobile || "N/A"}</p>
      </div>

      <p style="font-size: 14px; color: #334155; line-height: 1.6;">If you have any questions or require support, please contact your department coordinator or SPOC.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an automated system notification from SVEC Smart India Hackathon Portal. Please do not reply directly to this email.</p>
    </div>
  `;
  sendEmail(newStudent.email, welcomeSubject, welcomeHtml).catch(err => {
    console.error("Welcome email background task failed:", err);
  });

  const token = signStudentToken(
    { id: newStudent.id, email: newStudent.email, department: newStudent.department },
    "24h"
  );

  res.status(201).json({
    success: true,
    student: {
      id: newStudent.id,
      email: newStudent.email,
      gender: newStudent.gender,
      department: newStudent.department,
      mobile: newStudent.mobile
    },
    token
  });
});

// Student Auth: Login
app.post("/api/auth/login", validateBody(studentLoginSchema), (req, res) => {
  const { email, password } = req.body;

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();
  const studentIndex = students.findIndex(s => s.email === emailClean);

  if (studentIndex === -1) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const student = students[studentIndex];
  if (!verifyPassword(password, student.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Transparent migration to salted hash if stored as legacy hash
  if (!student.passwordHash.includes(":")) {
    try {
      students[studentIndex].passwordHash = hashPassword(password);
      writeStudents(students);
    } catch (migErr) {
      console.warn("Could not upgrade student password hash:", migErr);
    }
  }

  const token = signStudentToken(
    { id: student.id, email: student.email, department: student.department },
    "24h"
  );

  res.json({
    success: true,
    student: {
      id: student.id,
      email: student.email,
      gender: student.gender || "",
      department: student.department || "",
      mobile: student.mobile || ""
    },
    token
  });
});

// Public Settings (safe, hides secret)
app.get("/api/settings/public", async (req, res) => {
  const settings = await db.getSettings();
  res.json({
    feeEnabled: settings.feeEnabled,
    feeAmount: settings.feeAmount,
    paymentMode: settings.paymentMode || (settings.manualPaymentEnabled ? "manual_upi" : "gateway"),
    manualPaymentEnabled: settings.manualPaymentEnabled ?? (settings.paymentMode === "manual_upi" || !!settings.upiQrCodeUrl),
    upiQrCodeUrl: settings.upiQrCodeUrl || "",
    upiId: settings.upiId || "",
    upiPayeeName: settings.upiPayeeName || "Sri Vasavi Engineering College",
    upiInstructions: settings.upiInstructions || "",
    requirePaymentScreenshot: settings.requirePaymentScreenshot !== undefined ? settings.requirePaymentScreenshot : true,
    razorpayKeyId: settings.razorpayKeyId,
    jwtEnabled: !!settings.jwtEnabled,
    portalTheme: settings.portalTheme || "light",
    logoUrl: settings.logoUrl || "",
    portalTitle: settings.portalTitle || "SVEC - SIH Internal Hackathon 2026",
    portalCaption: settings.portalCaption || "Sri Vasavi Engineering College",
    teamMembersCount: settings.teamMembersCount ?? 5,
    genderDiversityRequired: settings.genderDiversityRequired !== undefined ? settings.genderDiversityRequired : true,
    
    // Lock updates
    lockStudentUpdates: settings.lockStudentUpdates ?? false,
    lockRegisterAnotherTeam: settings.lockRegisterAnotherTeam ?? false,

    // Certificates config
    enableCertificates: settings.enableCertificates ?? false,
    certificateSignatories: settings.certificateSignatories || [],
    certificateTitle: settings.certificateTitle || "CERTIFICATE OF PARTICIPATION",
    certificateSubtitle: settings.certificateSubtitle || "This is proudly presented to",
    certificateBody: settings.certificateBody || "",
    certificateSignatory1Name: settings.certificateSignatory1Name || "",
    certificateSignatory1Title: settings.certificateSignatory1Title || "",
    certificateSignatory2Name: settings.certificateSignatory2Name || "",
    certificateSignatory2Title: settings.certificateSignatory2Title || "",
    certificateBgType: settings.certificateBgType || "classic",
    certificateBgUrl: settings.certificateBgUrl || "",
    certificateBorderColor: settings.certificateBorderColor || "#4f46e5",
    certificateDateText: settings.certificateDateText || "July 17, 2026",
    creditsTitle: settings.creditsTitle ?? "Department of CSE",
    creditsContent: settings.creditsContent ?? "",
    creditsEnabled: settings.creditsEnabled !== undefined ? !!settings.creditsEnabled : true,

    // Sample PPT / Presentation Demo
    samplePptEnabled: settings.samplePptEnabled !== undefined ? !!settings.samplePptEnabled : true,
    samplePptUrl: settings.samplePptUrl || "",
    samplePptFileName: settings.samplePptFileName || "",
    samplePptFileBase64: settings.samplePptFileBase64 || "",
    samplePptFileUrl: settings.samplePptFileUrl || "",
    samplePptDescription: settings.samplePptDescription || "",

    // Consent Letter Template (Configured by Super Admin)
    consentLetterEnabled: settings.consentLetterEnabled !== undefined ? !!settings.consentLetterEnabled : true,
    consentLetterAicteNo: settings.consentLetterAicteNo || "1-3634005111",
    consentLetterPrincipalName: settings.consentLetterPrincipalName || "Dr. Ch. Rambabu",
    consentLetterDesignation1: settings.consentLetterDesignation1 || "Principal, Sri Vasavi Engineering College (Autonomous)",
    consentLetterDesignation2: settings.consentLetterDesignation2 || "Pedatadepalli, Tadepalligudem.",
    consentLetterSignatureUrl: settings.consentLetterSignatureUrl || "",
    consentLetterStampUrl: settings.consentLetterStampUrl || "",
    consentLetterShowSignature: settings.consentLetterShowSignature !== undefined ? !!settings.consentLetterShowSignature : true,
    consentLetterShowStamp: settings.consentLetterShowStamp !== undefined ? !!settings.consentLetterShowStamp : true,
    consentLetterIncludeLetterhead: settings.consentLetterIncludeLetterhead !== undefined ? !!settings.consentLetterIncludeLetterhead : true,
    consentLetterCustomSubject: settings.consentLetterCustomSubject || "Sub: Smart India Hackathon 2026 – Nomination",
    consentLetterBodyTemplate: settings.consentLetterBodyTemplate || "",
    consentLetterRequireSelection: settings.consentLetterRequireSelection !== undefined ? !!settings.consentLetterRequireSelection : true
  });
});

// Admin Settings (private, requires passcode, masks secret keys)
app.get("/api/settings", authorize(["ADMIN"]), async (req, res) => {
  const settings = await db.getSettings();
  res.json(sanitizeSettingsForAdmin(settings));
});

// Admin Update Settings
app.post("/api/settings", authorize(["ADMIN"]), validateBody(settingsSchema), (req, res) => {
  const { 
    feeEnabled, 
    feeAmount, 
    paymentMode,
    manualPaymentEnabled,
    upiQrCodeUrl,
    upiId,
    upiPayeeName,
    upiInstructions,
    requirePaymentScreenshot,
    razorpayKeyId, 
    razorpayKeySecret, 
    jwtEnabled,
    emailEnabled,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpFrom,
    portalTheme,
    logoUrl,
    portalTitle,
    portalCaption,
    teamMembersCount,
    genderDiversityRequired,

    // SMS variables
    smsEnabled,
    smsProvider,
    twilioSid,
    twilioAuthToken,
    twilioFrom,
    msg91AuthKey,
    msg91SenderId,
    msg91Route,
    smsCustomUrl,
    smsCustomMethod,
    smsCustomHeaders,
    smsCustomPayload,

    // WhatsApp variables
    whatsappEnabled,
    whatsappProvider,
    whatsappAccessToken,
    whatsappPhoneId,
    whatsappWabaId,
    whatsappCustomUrl,
    whatsappCustomMethod,
    whatsappCustomHeaders,
    whatsappCustomPayload,

    // Database options
    dbEnabled,
    dbType,
    dbHost,
    dbPort,
    dbName,
    dbUsername,
    dbPassword,
    dbCollectionOrTable,
    dbStatus,

    // Student profile updates lock & Certificates Customization
    lockStudentUpdates,
    lockRegisterAnotherTeam,
    enableCertificates,
    certificateTitle,
    certificateSubtitle,
    certificateBody,
    certificateSignatory1Name,
    certificateSignatory1Title,
    certificateSignatory2Name,
    certificateSignatory2Title,
    certificateBgType,
    certificateBgUrl,
    certificateBorderColor,
    certificateDateText,
    creditsTitle,
    creditsContent,
    creditsEnabled,

    // Sample PPT
    samplePptEnabled,
    samplePptUrl,
    samplePptFileName,
    samplePptFileBase64,
    samplePptFileUrl,
    samplePptDescription,

    // Consent Letter Template (Configured by Super Admin)
    consentLetterEnabled,
    consentLetterAicteNo,
    consentLetterPrincipalName,
    consentLetterDesignation1,
    consentLetterDesignation2,
    consentLetterSignatureUrl,
    consentLetterStampUrl,
    consentLetterShowSignature,
    consentLetterShowStamp,
    consentLetterIncludeLetterhead,
    consentLetterCustomSubject,
    consentLetterBodyTemplate,
    consentLetterRequireSelection
  } = req.body;

  const currentSettings = readSettings();

  // Resolve secret updates without overwriting when masked or blanking out unintentionally
  const resolvedRazorpaySecret = resolveSecretUpdate(razorpayKeySecret, currentSettings.razorpayKeySecret, process.env.RAZORPAY_KEY_SECRET);
  const resolvedSmtpPass = resolveSecretUpdate(smtpPass, currentSettings.smtpPass, process.env.SMTP_PASS || process.env.SMTP_PASSWORD);
  const resolvedTwilioToken = resolveSecretUpdate(twilioAuthToken, currentSettings.twilioAuthToken, process.env.TWILIO_AUTH_TOKEN);
  const resolvedMsg91Key = resolveSecretUpdate(msg91AuthKey, currentSettings.msg91AuthKey, process.env.MSG91_AUTH_KEY);
  const resolvedWhatsappToken = resolveSecretUpdate(whatsappAccessToken, currentSettings.whatsappAccessToken, process.env.WHATSAPP_ACCESS_TOKEN);
  const resolvedDbPassword = resolveSecretUpdate(dbPassword, currentSettings.dbPassword, process.env.DB_PASSWORD || process.env.PG_PASSWORD);

  // Automatically extract and save base64 image strings to filesystem if provided directly in payload
  let finalUpiQrCodeUrl = (upiQrCodeUrl || "").trim();
  if (finalUpiQrCodeUrl.startsWith("data:image/")) {
    const saved = saveBase64Securely(finalUpiQrCodeUrl, "upi_qr", "upi_qr_code.png");
    if (saved) {
      finalUpiQrCodeUrl = saved.url;
    }
  }

  let finalLogoUrl = (logoUrl || "").trim();
  if (finalLogoUrl.startsWith("data:image/")) {
    const saved = saveBase64Securely(finalLogoUrl, "logos", "svec_logo.png");
    if (saved) {
      finalLogoUrl = saved.url;
    }
  }

  let finalCertBgUrl = (certificateBgUrl || "").trim();
  if (finalCertBgUrl.startsWith("data:image/")) {
    const saved = saveBase64Securely(finalCertBgUrl, "certificates", "certificate_bg.png");
    if (saved) {
      finalCertBgUrl = saved.url;
    }
  }

  let finalSignatureUrl = consentLetterSignatureUrl !== undefined ? (consentLetterSignatureUrl || "").trim() : currentSettings.consentLetterSignatureUrl;
  if (finalSignatureUrl && finalSignatureUrl.startsWith("data:image/")) {
    const saved = saveBase64Securely(finalSignatureUrl, "images", "signature.png");
    if (saved) {
      finalSignatureUrl = saved.url;
    }
  }

  let finalStampUrl = consentLetterStampUrl !== undefined ? (consentLetterStampUrl || "").trim() : currentSettings.consentLetterStampUrl;
  if (finalStampUrl && finalStampUrl.startsWith("data:image/")) {
    const saved = saveBase64Securely(finalStampUrl, "images", "stamp.png");
    if (saved) {
      finalStampUrl = saved.url;
    }
  }

  const updated: FeeConfig = {
    ...currentSettings,
    feeEnabled: !!feeEnabled,
    feeAmount: Number(feeAmount) || 0,
    paymentMode: (paymentMode || "manual_upi") as any,
    manualPaymentEnabled: manualPaymentEnabled !== undefined ? !!manualPaymentEnabled : (paymentMode === "manual_upi"),
    upiQrCodeUrl: finalUpiQrCodeUrl,
    upiId: (upiId || "svec@upi").trim(),
    upiPayeeName: (upiPayeeName || "Sri Vasavi Engineering College").trim(),
    upiInstructions: (upiInstructions || "").trim(),
    requirePaymentScreenshot: requirePaymentScreenshot !== undefined ? !!requirePaymentScreenshot : true,
    razorpayKeyId: (razorpayKeyId || "").trim(),
    razorpayKeySecret: resolvedRazorpaySecret,
    jwtEnabled: !!jwtEnabled,
    emailEnabled: !!emailEnabled,
    smtpHost: (smtpHost || "").trim(),
    smtpPort: Number(smtpPort) || 587,
    smtpUser: (smtpUser || "").trim(),
    smtpPass: resolvedSmtpPass,
    smtpFrom: (smtpFrom || "").trim(),
    portalTheme: (portalTheme || "light").trim() as any,
    logoUrl: finalLogoUrl,
    portalTitle: (portalTitle || "SVEC - SIH Internal Hackathon 2026").trim(),
    portalCaption: (portalCaption || "Sri Vasavi Engineering College").trim(),
    teamMembersCount: teamMembersCount !== undefined ? Number(teamMembersCount) : 5,
    genderDiversityRequired: genderDiversityRequired !== undefined ? !!genderDiversityRequired : true,

    // SMS properties
    smsEnabled: !!smsEnabled,
    smsProvider: (smsProvider || "twilio").trim() as any,
    twilioSid: (twilioSid || "").trim(),
    twilioAuthToken: resolvedTwilioToken,
    twilioFrom: (twilioFrom || "").trim(),
    msg91AuthKey: resolvedMsg91Key,
    msg91SenderId: (msg91SenderId || "").trim(),
    msg91Route: (msg91Route || "4").trim(),
    smsCustomUrl: (smsCustomUrl || "").trim(),
    smsCustomMethod: (smsCustomMethod || "POST").trim() as any,
    smsCustomHeaders: (smsCustomHeaders || "").trim(),
    smsCustomPayload: (smsCustomPayload || "").trim(),

    // WhatsApp properties
    whatsappEnabled: !!whatsappEnabled,
    whatsappProvider: (whatsappProvider || "meta").trim() as any,
    whatsappAccessToken: resolvedWhatsappToken,
    whatsappPhoneId: (whatsappPhoneId || "").trim(),
    whatsappWabaId: (whatsappWabaId || "").trim(),
    whatsappCustomUrl: (whatsappCustomUrl || "").trim(),
    whatsappCustomMethod: (whatsappCustomMethod || "POST").trim() as any,
    whatsappCustomHeaders: (whatsappCustomHeaders || "").trim(),
    whatsappCustomPayload: (whatsappCustomPayload || "").trim(),

    // Database options
    dbEnabled: dbEnabled !== undefined ? !!dbEnabled : true,
    dbType: (dbType && dbType !== "none" ? dbType : "sql").trim() as any,
    dbHost: (dbHost || process.env.DB_HOST || "").trim(),
    dbPort: dbPort !== undefined && dbPort !== "" ? Number(dbPort) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined),
    dbName: (dbName || process.env.DB_NAME || "").trim(),
    dbUsername: (dbUsername || process.env.DB_USERNAME || "").trim(),
    dbPassword: resolvedDbPassword,
    dbCollectionOrTable: (dbCollectionOrTable || "registrations").trim(),
    dbStatus: (dbStatus || "Connected (Auto-Sync)").trim(),

    // Updates lock & certificates
    lockStudentUpdates: !!lockStudentUpdates,
    lockRegisterAnotherTeam: !!lockRegisterAnotherTeam,
    enableCertificates: !!enableCertificates,
    certificateTitle: (certificateTitle || "").trim(),
    certificateSubtitle: (certificateSubtitle || "").trim(),
    certificateBody: (certificateBody || "").trim(),
    certificateSignatory1Name: (certificateSignatory1Name || "").trim(),
    certificateSignatory1Title: (certificateSignatory1Title || "").trim(),
    certificateSignatory2Name: (certificateSignatory2Name || "").trim(),
    certificateSignatory2Title: (certificateSignatory2Title || "").trim(),
    certificateBgType: (certificateBgType || "classic") as any,
    certificateBgUrl: finalCertBgUrl,
    certificateBorderColor: (certificateBorderColor || "#4f46e5").trim(),
    certificateDateText: (certificateDateText || "").trim(),
    creditsTitle: (creditsTitle || "Department of CSE").trim(),
    creditsContent: (creditsContent || "").trim(),
    creditsEnabled: creditsEnabled !== undefined ? !!creditsEnabled : true,

    // Sample PPT / Presentation Demo
    samplePptEnabled: samplePptEnabled !== undefined ? !!samplePptEnabled : true,
    samplePptUrl: (samplePptUrl || "").trim(),
    samplePptFileName: (samplePptFileName || "").trim(),
    samplePptFileBase64: (samplePptFileBase64 || "").trim(),
    samplePptFileUrl: (samplePptFileUrl !== undefined ? (samplePptFileUrl || "").trim() : (currentSettings.samplePptFileUrl || "")),
    samplePptDescription: (samplePptDescription || "").trim(),

    // Consent Letter Template (Configured strictly by Super Admin)
    consentLetterEnabled: consentLetterEnabled !== undefined ? !!consentLetterEnabled : currentSettings.consentLetterEnabled,
    consentLetterAicteNo: consentLetterAicteNo !== undefined ? (consentLetterAicteNo || "").trim() : currentSettings.consentLetterAicteNo,
    consentLetterPrincipalName: consentLetterPrincipalName !== undefined ? (consentLetterPrincipalName || "").trim() : currentSettings.consentLetterPrincipalName,
    consentLetterDesignation1: consentLetterDesignation1 !== undefined ? (consentLetterDesignation1 || "").trim() : currentSettings.consentLetterDesignation1,
    consentLetterDesignation2: consentLetterDesignation2 !== undefined ? (consentLetterDesignation2 || "").trim() : currentSettings.consentLetterDesignation2,
    consentLetterSignatureUrl: finalSignatureUrl,
    consentLetterStampUrl: finalStampUrl,
    consentLetterShowSignature: consentLetterShowSignature !== undefined ? !!consentLetterShowSignature : currentSettings.consentLetterShowSignature,
    consentLetterShowStamp: consentLetterShowStamp !== undefined ? !!consentLetterShowStamp : currentSettings.consentLetterShowStamp,
    consentLetterIncludeLetterhead: consentLetterIncludeLetterhead !== undefined ? !!consentLetterIncludeLetterhead : currentSettings.consentLetterIncludeLetterhead,
    consentLetterCustomSubject: consentLetterCustomSubject !== undefined ? (consentLetterCustomSubject || "").trim() : currentSettings.consentLetterCustomSubject,
    consentLetterBodyTemplate: consentLetterBodyTemplate !== undefined ? (consentLetterBodyTemplate || "").trim() : currentSettings.consentLetterBodyTemplate,
    consentLetterRequireSelection: consentLetterRequireSelection !== undefined ? !!consentLetterRequireSelection : currentSettings.consentLetterRequireSelection
  };

  writeSettings(updated);
  // Never expose raw secrets in API responses
  res.json({ success: true, settings: sanitizeSettingsForAdmin(updated) });
});

// Dedicated Consent Letter Template Save Endpoint (Strictly Super Admin / SPOC)
app.post("/api/admin/consent-letter-template", authorize(["ADMIN"]), (req, res) => {
  const adminRole = (req as any).adminRole;
  if (adminRole !== "SPOC" && adminRole !== "ADMIN") {
    return res.status(403).json({
      error: "Forbidden: Consent Letter customization and global template modification is strictly reserved for Super Admin (SPOC)."
    });
  }

  const {
    consentLetterEnabled,
    consentLetterAicteNo,
    consentLetterPrincipalName,
    consentLetterDesignation1,
    consentLetterDesignation2,
    consentLetterSignatureUrl,
    consentLetterStampUrl,
    consentLetterShowSignature,
    consentLetterShowStamp,
    consentLetterIncludeLetterhead,
    consentLetterCustomSubject,
    consentLetterBodyTemplate,
    consentLetterRequireSelection
  } = req.body;

  const current = readSettings();
  const updated: FeeConfig = {
    ...current,
    consentLetterEnabled: consentLetterEnabled !== undefined ? !!consentLetterEnabled : current.consentLetterEnabled,
    consentLetterAicteNo: consentLetterAicteNo !== undefined ? (consentLetterAicteNo || "").trim() : current.consentLetterAicteNo,
    consentLetterPrincipalName: consentLetterPrincipalName !== undefined ? (consentLetterPrincipalName || "").trim() : current.consentLetterPrincipalName,
    consentLetterDesignation1: consentLetterDesignation1 !== undefined ? (consentLetterDesignation1 || "").trim() : current.consentLetterDesignation1,
    consentLetterDesignation2: consentLetterDesignation2 !== undefined ? (consentLetterDesignation2 || "").trim() : current.consentLetterDesignation2,
    consentLetterSignatureUrl: consentLetterSignatureUrl !== undefined ? (consentLetterSignatureUrl || "").trim() : current.consentLetterSignatureUrl,
    consentLetterStampUrl: consentLetterStampUrl !== undefined ? (consentLetterStampUrl || "").trim() : current.consentLetterStampUrl,
    consentLetterShowSignature: consentLetterShowSignature !== undefined ? !!consentLetterShowSignature : current.consentLetterShowSignature,
    consentLetterShowStamp: consentLetterShowStamp !== undefined ? !!consentLetterShowStamp : current.consentLetterShowStamp,
    consentLetterIncludeLetterhead: consentLetterIncludeLetterhead !== undefined ? !!consentLetterIncludeLetterhead : current.consentLetterIncludeLetterhead,
    consentLetterCustomSubject: consentLetterCustomSubject !== undefined ? (consentLetterCustomSubject || "").trim() : current.consentLetterCustomSubject,
    consentLetterBodyTemplate: consentLetterBodyTemplate !== undefined ? (consentLetterBodyTemplate || "").trim() : current.consentLetterBodyTemplate,
    consentLetterRequireSelection: consentLetterRequireSelection !== undefined ? !!consentLetterRequireSelection : current.consentLetterRequireSelection
  };

  writeSettings(updated);
  res.json({ success: true, message: "Consent Letter official template updated successfully.", template: updated });
});

// Download/Redirect to Sample PPT Presentation File
app.get("/api/settings/sample-ppt/download", async (req, res) => {
  const settings = readSettings();

  // 1. Check if stored on disk
  if (settings.samplePptFileUrl) {
    const filename = path.basename(settings.samplePptFileUrl);
    const filePath = path.join(UPLOADS_SAMPLE_PPTS_DIR, filename);
    if (fs.existsSync(filePath)) {
      const downloadName = settings.samplePptFileName || "SVEC_SIH_Sample_Proposal_Template.pptx";
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      return res.sendFile(filePath);
    }

    // Try restoring from DB if file exists in DB
    try {
      const record = await db.getFileRecord("sample_ppts", filename);
      if (record && record.dataBase64) {
        if (!fs.existsSync(UPLOADS_SAMPLE_PPTS_DIR)) {
          fs.mkdirSync(UPLOADS_SAMPLE_PPTS_DIR, { recursive: true });
        }
        const fileBuffer = Buffer.from(record.dataBase64, "base64");
        fs.writeFileSync(filePath, fileBuffer);
        const downloadName = settings.samplePptFileName || record.originalName || "SVEC_SIH_Sample_Proposal_Template.pptx";
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
        res.setHeader("Content-Type", record.mimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        return res.sendFile(filePath);
      }
    } catch (dbErr) {
      console.warn("Could not retrieve sample PPT from database:", dbErr);
    }

    if (settings.samplePptFileUrl.startsWith("/") || settings.samplePptFileUrl.startsWith("http")) {
      return res.redirect(settings.samplePptFileUrl);
    }
  }

  // 2. Fallback to base64
  if (settings.samplePptFileBase64) {
    try {
      const match = settings.samplePptFileBase64.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const base64Data = match ? match[2] : settings.samplePptFileBase64;
      const buffer = Buffer.from(base64Data, "base64");
      const filename = settings.samplePptFileName || "SVEC_SIH_Sample_Proposal_Template.pptx";

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    } catch (err) {
      console.error("Error serving sample PPT buffer:", err);
      return res.status(500).json({ error: "Failed to download sample PPT file." });
    }
  } else if (settings.samplePptUrl) {
    return res.redirect(settings.samplePptUrl);
  }
  return res.status(404).json({ error: "No sample PPT file or URL is currently configured by the admin." });
});

// POST test external DB connection & install schemas dynamically
app.post("/api/settings/test-db", authorize(["ADMIN"]), validateBody(testDbSchema), async (req, res) => {
  const { dbType, dbHost, dbPort, dbName, dbUsername, dbPassword, dbCollectionOrTable } = req.body;
  const currentSettings = readSettings();
  const resolvedDbPassword = resolveSecretUpdate(dbPassword, currentSettings.dbPassword, process.env.DB_PASSWORD || process.env.PG_PASSWORD);

  try {
    const initResult = await db.init({
      dbEnabled: true,
      dbType,
      dbHost,
      dbPort,
      dbName,
      dbUsername,
      dbPassword: resolvedDbPassword,
      dbCollectionOrTable
    });

    if (initResult.success) {
      const settings = readSettings();
      settings.dbStatus = `Connected Successfully (${dbType.toUpperCase()} Structured: ${new Date().toLocaleTimeString()})`;
      writeSettings(settings);

      // Trigger immediate synchronization of all existing datasets into the database
      const registrations = readRegistrations();
      for (const r of registrations) {
        await db.saveRegistration(r);
      }
      const students = readStudents();
      for (const s of students) {
        await db.saveStudent(s);
      }
      await db.saveProblemStatements(readStatements());
      await db.saveEvaluationCriteria(readCriteria());

      return res.json({ 
        success: true, 
        message: `Successfully connected to ${dbType.toUpperCase()}! All 10 industry-standard database tables & indexes (registrations, students, problem_statements, evaluation_criteria, team_evaluations, custom_pages, menu_items, live_updates, broadcast_logs, app_settings) structured and synced.` 
      });
    } else {
      const cleanMsg = (initResult.message || "Connection failed")
        .replace(/[0-9A-Fa-f]{10,}:error:[^:]+:[^:]+:[^:]+:[^:]+:\d+:[^\n]+/g, "SSL handshake error")
        .replace(/.*SSL alert number \d+.*/i, "SSL negotiation error: invalid TLS/SSL handshake with host")
        .trim();
      const settings = readSettings();
      settings.dbStatus = `Connection Failed: ${cleanMsg}`;
      writeSettings(settings);
      return res.status(500).json({ error: cleanMsg });
    }
  } catch (err: any) {
    const cleanMsg = (err?.message || "Connection failed")
      .replace(/[0-9A-Fa-f]{10,}:error:[^:]+:[^:]+:[^:]+:[^:]+:\d+:[^\n]+/g, "SSL handshake error")
      .replace(/.*SSL alert number \d+.*/i, "SSL negotiation error: invalid TLS/SSL handshake with host")
      .trim();
    const settings = readSettings();
    settings.dbStatus = `Connection Failed: ${cleanMsg}`;
    writeSettings(settings);

    return res.status(500).json({ error: `Connection notice: ${cleanMsg}. Please verify credentials, port and server reachability.` });
  }
});

// Broadcast Logging System
function readBroadcastLogs(): BroadcastLog[] {
  return db.readLocalFile<BroadcastLog[]>("broadcast_logs.json", []);
}

function writeBroadcastLog(log: Omit<BroadcastLog, "id" | "timestamp">) {
  try {
    const logs = readBroadcastLogs();
    const newLog: BroadcastLog = {
      ...log,
      id: `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (logs.length > 100) {
      logs.splice(100);
    }
    db.writeLocalFile("broadcast_logs.json", logs);
    db.saveBroadcastLog(newLog).catch(err => {
      console.error("Failed to sync broadcast log to DB:", err);
    });
  } catch (err) {
    console.error("Error writing broadcast log:", err);
  }
}

// Get Admin Broadcast Logs
app.get("/api/admin/broadcast-logs", authorize(["ADMIN", "STUDENT_SPOC"]), (req, res) => {
  res.json(readBroadcastLogs());
});

// Admin/Student SPOC Bulk Broadcast SMS API
app.post("/api/admin/broadcast-sms", authorize(["ADMIN", "STUDENT_SPOC"]), validateBody(broadcastSmsSchema), async (req, res) => {
  const settings = readSettings();
  if (!settings.smsEnabled) {
    return res.status(400).json({ error: "SMS System is disabled. Please enable SMS notifications and configure your SMS Gateway credentials in the Settings tab before sending broadcasts." });
  }

  const { message, recipientGroup, testMobile } = req.body;

  let recipients: string[] = [];
  if (recipientGroup === "test_single") {
    if (!testMobile || testMobile.trim().length < 10) {
      return res.status(400).json({ error: "A valid mobile number is required for testing." });
    }
    recipients = [testMobile.trim()];
  } else if (recipientGroup === "all_logins") {
    const students = readStudents();
    recipients = students.map(s => s.mobile || "").filter(m => m.trim().length >= 10);
  } else if (recipientGroup === "team_leads") {
    const regs = readRegistrations();
    recipients = regs.map(r => r.leadMobile || "").filter(m => m.trim().length >= 10);
  } else if (recipientGroup === "all_team_members") {
    const regs = readRegistrations();
    regs.forEach(r => {
      if (r.leadMobile) recipients.push(r.leadMobile);
      if (r.member1Phone) recipients.push(r.member1Phone);
      if (r.member2Phone) recipients.push(r.member2Phone);
      if (r.member3Phone) recipients.push(r.member3Phone);
      if (r.member4Phone) recipients.push(r.member4Phone);
      if (r.member5Phone) recipients.push(r.member5Phone);
    });
  }

  const uniqueRecipients = Array.from(new Set(recipients.map(r => r.trim()).filter(Boolean)));
  if (uniqueRecipients.length === 0) {
    return res.status(400).json({ error: `No recipients with valid mobile numbers found in group: "${recipientGroup}".` });
  }

  console.log(`[SMS Broadcast] Dispatched bulk SMS to ${uniqueRecipients.length} recipients: "${message}"`);

  let successCount = 0;
  let failCount = 0;
  let lastError = "";

  for (const recipient of uniqueRecipients) {
    const result = await sendRealSms(recipient, message);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
      lastError = result.error || "Unknown error";
    }
  }

  const status = failCount === uniqueRecipients.length ? "failed" : "completed";
  const statusMsg = failCount > 0 
    ? `SMS broadcast finished. Sent: ${successCount}, Failed: ${failCount}. Last error: ${lastError}` 
    : `SMS broadcast sent successfully to ${uniqueRecipients.length} recipients!`;

  writeBroadcastLog({
    channel: "SMS",
    message,
    recipientGroup,
    recipientCount: uniqueRecipients.length,
    sender: (req as any).adminUser || "system_admin",
    status: status
  });

  if (status === "failed") {
    return res.status(500).json({ error: `All SMS dispatch attempts failed. Error: ${lastError}` });
  }

  res.json({
    success: true,
    recipientCount: uniqueRecipients.length,
    message: statusMsg
  });
});

// Admin/Student SPOC Bulk Broadcast WhatsApp API
app.post("/api/admin/broadcast-whatsapp", authorize(["ADMIN", "STUDENT_SPOC"]), validateBody(broadcastWhatsappSchema), async (req, res) => {
  const settings = readSettings();
  if (!settings.whatsappEnabled) {
    return res.status(400).json({ error: "WhatsApp System is disabled. Please enable WhatsApp notifications and configure your WhatsApp Business API credentials in the Settings tab before sending broadcasts." });
  }

  const { templateName, variables, recipientGroup, testMobile } = req.body;

  let recipients: string[] = [];
  if (recipientGroup === "test_single") {
    if (!testMobile || testMobile.trim().length < 10) {
      return res.status(400).json({ error: "A valid mobile number is required for testing." });
    }
    recipients = [testMobile.trim()];
  } else if (recipientGroup === "all_logins") {
    const students = readStudents();
    recipients = students.map(s => s.mobile || "").filter(m => m.trim().length >= 10);
  } else if (recipientGroup === "team_leads") {
    const regs = readRegistrations();
    recipients = regs.map(r => r.leadMobile || "").filter(m => m.trim().length >= 10);
  } else if (recipientGroup === "all_team_members") {
    const regs = readRegistrations();
    regs.forEach(r => {
      if (r.leadMobile) recipients.push(r.leadMobile);
      if (r.member1Phone) recipients.push(r.member1Phone);
      if (r.member2Phone) recipients.push(r.member2Phone);
      if (r.member3Phone) recipients.push(r.member3Phone);
      if (r.member4Phone) recipients.push(r.member4Phone);
      if (r.member5Phone) recipients.push(r.member5Phone);
    });
  }

  const uniqueRecipients = Array.from(new Set(recipients.map(r => r.trim()).filter(Boolean)));
  if (uniqueRecipients.length === 0) {
    return res.status(400).json({ error: `No recipients with valid mobile numbers found in group: "${recipientGroup}".` });
  }

  let msgText = `[Template: ${templateName}]`;
  const varsArray = Array.isArray(variables) ? variables : [];
  if (varsArray.length > 0) {
    msgText += ` - Variables: ${varsArray.join(" | ")}`;
  }

  console.log(`[WhatsApp Broadcast] Sending WhatsApp template "${templateName}" to ${uniqueRecipients.length} recipients.`);

  let successCount = 0;
  let failCount = 0;
  let lastError = "";

  for (const recipient of uniqueRecipients) {
    const result = await sendRealWhatsapp(recipient, templateName, varsArray);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
      lastError = result.error || "Unknown error";
    }
  }

  const status = failCount === uniqueRecipients.length ? "failed" : "completed";
  const statusMsg = failCount > 0 
    ? `WhatsApp broadcast finished. Sent: ${successCount}, Failed: ${failCount}. Last error: ${lastError}` 
    : `WhatsApp template broadcast dispatched successfully to ${uniqueRecipients.length} recipients!`;

  writeBroadcastLog({
    channel: "WhatsApp",
    message: msgText,
    recipientGroup,
    recipientCount: uniqueRecipients.length,
    sender: (req as any).adminUser || "system_admin",
    status: status
  });

  if (status === "failed") {
    return res.status(500).json({ error: `All WhatsApp dispatch attempts failed. Error: ${lastError}` });
  }

  res.json({
    success: true,
    recipientCount: uniqueRecipients.length,
    message: statusMsg
  });
});

// Admin/Student SPOC Bulk Broadcast Email API
app.post("/api/admin/broadcast-email", authorize(["ADMIN", "STUDENT_SPOC"]), validateBody(broadcastEmailSchema), async (req, res) => {
  const settings = readSettings();
  if (!settings.emailEnabled) {
    return res.status(400).json({ error: "Email System is disabled. Please enable email notifications and configure SMTP credentials in the Settings tab before sending broadcasts." });
  }

  const { subject, message, recipientGroup, testEmail } = req.body;

  let recipientEmails: string[] = [];

  if (recipientGroup === "test_single") {
    if (!testEmail || !/\S+@\S+\.\S+/.test(testEmail)) {
      return res.status(400).json({ error: "A valid test email address is required." });
    }
    recipientEmails = [testEmail.trim()];
  } else if (recipientGroup === "all_logins") {
    const students = readStudents();
    recipientEmails = students.map(s => s.email);
  } else if (recipientGroup === "team_leads") {
    const regs = readRegistrations();
    recipientEmails = regs.map(r => r.studentEmail || "").filter(email => !!email);
  } else if (recipientGroup === "all_team_members") {
    const regs = readRegistrations();
    regs.forEach(r => {
      if (r.studentEmail) recipientEmails.push(r.studentEmail);
      if (r.member1Email) recipientEmails.push(r.member1Email);
      if (r.member2Email) recipientEmails.push(r.member2Email);
      if (r.member3Email) recipientEmails.push(r.member3Email);
      if (r.member4Email) recipientEmails.push(r.member4Email);
      if (r.member5Email) recipientEmails.push(r.member5Email);
    });
  } else {
    return res.status(400).json({ error: "Invalid recipient group selected." });
  }

  // Sanitize, filter empty/invalid, lowercase, and deduplicate
  const emailRegex = /\S+@\S+\.\S+/;
  const sanitized = recipientEmails
    .map(e => e.trim().toLowerCase())
    .filter(e => !!e && emailRegex.test(e));
  
  const uniqueRecipients = Array.from(new Set(sanitized));

  if (uniqueRecipients.length === 0) {
    return res.status(400).json({ error: `No recipients found in the group: "${recipientGroup}".` });
  }

  // Send success response early indicating process has started
  writeBroadcastLog({
    channel: "Email",
    subject,
    message,
    recipientGroup,
    recipientCount: uniqueRecipients.length,
    sender: (req as any).adminUser || "system_admin",
    status: "completed"
  });

  res.json({
    success: true,
    recipientCount: uniqueRecipients.length,
    message: `Broadcast queued successfully! Initiated sending to ${uniqueRecipients.length} recipients.`
  });

  // Execute actual sending in the background
  const formattedHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
      <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 18px; font-weight: bold;">SVEC SIH Hackathon Updates</h2>
        <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Official Announcement</span>
      </div>
      <div style="font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an official announcement from SVEC Smart India Hackathon Administration.</p>
    </div>
  `;

  // Process sending in chunks to avoid overloading or rate limits (e.g. 5 at a time)
  (async () => {
    console.log(`[Broadcast] Starting email broadcast for subject: "${subject}" to ${uniqueRecipients.length} students.`);
    const chunkSize = 5;
    for (let i = 0; i < uniqueRecipients.length; i += chunkSize) {
      const chunk = uniqueRecipients.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(email => 
          sendEmail(email, subject, formattedHtml).catch(err => {
            console.error(`[Broadcast] Error sending to ${email}:`, err);
          })
        )
      );
      // Brief sleep between chunks
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log(`[Broadcast] Completed email broadcast for subject: "${subject}".`);
  })().catch(err => {
    console.error("[Broadcast] Critical background error during broadcast processing:", err);
  });
});

// Create Razorpay Order - Server-Authoritative Fee Calculation & Ledger Registration
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const settings = readSettings();
    const { studentEmail, registrationId, teamName } = req.body || {};

    const orderResult = await createAuthoritativePaymentOrder({
      studentEmail,
      registrationId,
      teamName,
      settings
    });

    res.json({
      success: true,
      orderId: orderResult.orderId,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: orderResult.keyId,
      receipt: orderResult.receipt
    });
  } catch (err: any) {
    console.error("[Payment Security] Order creation error:", err);
    res.status(400).json({ error: err.message || "Failed to create payment order" });
  }
});


// Admin login endpoint
app.post("/api/admin/login", validateBody(adminLoginSchema), (req, res) => {
  const { username, password, role } = req.body;

  try {
    const admins = getAdmins();
    const cleanUsername = username.trim().toLowerCase();

    // 1. Try finding by matching username and role if provided
    let adminIndex = -1;
    if (role) {
      adminIndex = admins.findIndex(
        a => a.username.trim().toLowerCase() === cleanUsername && 
             (a.role === role || normalizeRole(a.role) === normalizeRole(role))
      );
    }

    // 2. Fallback: match by username alone if not found or role not specified
    if (adminIndex === -1) {
      adminIndex = admins.findIndex(a => a.username.trim().toLowerCase() === cleanUsername);
    }

    if (adminIndex === -1) {
      return res.status(401).json({ error: "Invalid username or account not found. Please check your credentials." });
    }

    const admin = admins[adminIndex];
    if (!verifyPassword(password, admin.passwordHash)) {
      return res.status(401).json({ error: "Invalid password for user " + admin.username });
    }

    // Transparent upgrade of legacy SHA-256 hash to salted PBKDF2/SHA-256
    if (!admin.passwordHash.includes(":")) {
      try {
        admins[adminIndex].passwordHash = hashPassword(password);
        saveAdmins(admins);
      } catch (upgradeErr) {
        console.warn("Could not upgrade admin password hash:", upgradeErr);
      }
    }

    const token = signAdminToken(
      { username: admin.username, role: admin.role as any, department: admin.department || "" },
      "24h"
    );

    res.json({
      success: true,
      token,
      role: admin.role,
      username: admin.username,
      department: admin.department || ""
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
});

// Admin check passcode / token verification
app.post("/api/admin/verify", (req, res) => {
  const { passcode } = req.body;
  if (!passcode || typeof passcode !== "string") {
    return res.status(401).json({ error: "Passcode or token is required." });
  }

  const cleanPasscode = passcode.startsWith("Bearer ") ? passcode.slice(7).trim() : passcode.trim();

  // 1. Verify as signed JWT admin token
  const decoded = verifyAdminToken(cleanPasscode);
  if (decoded) {
    return res.json({ success: true, role: decoded.role, username: decoded.username, department: decoded.department || "" });
  }

  // 2. Master pass code verification
  const masterPasscode = getAdminPasscode();
  if (masterPasscode && cleanPasscode === masterPasscode) {
    return res.json({ success: true, role: "SPOC", username: "system_admin", department: "" });
  }

  res.status(401).json({ error: "Invalid or expired admin session token." });
});

// GET list of admins (Super Admin SPOC and Department SPOC)
app.get("/api/admin/manage-admins", authorize(["ADMIN", "DEPT_SPOC"]), (req, res) => {
  try {
    const admins = getAdmins();
    const userRole = (req as any).userRole;
    const safeAdmins = admins.map(a => ({ username: a.username, role: a.role, department: a.department || "" }));

    if (userRole === "DEPT_SPOC") {
      // Dept SPOC can see Evaluators to manage them for their event operations
      const evaluatorsOnly = safeAdmins.filter(a => normalizeRole(a.role) === "EVALUATOR" || a.username.toLowerCase() === ((req as any).adminUser || "").toLowerCase());
      return res.json(evaluatorsOnly);
    }

    res.json(safeAdmins);
  } catch (err) {
    res.status(500).json({ error: "Failed to read admins list" });
  }
});

// POST a new admin (Super Admin SPOC & Department SPOC for creating evaluators)
app.post("/api/admin/manage-admins", authorize(["ADMIN", "DEPT_SPOC"]), validateBody(manageAdminCreateSchema), (req, res) => {
  const { username, password, role, department } = req.body;
  const userRole = (req as any).userRole;
  const cleanUsername = username.trim();

  // If DEPT_SPOC is creating an admin account, they can only create Evaluator accounts
  if (userRole === "DEPT_SPOC") {
    const normRole = normalizeRole(role);
    if (normRole !== "EVALUATOR") {
      return res.status(403).json({ error: "Department SPOC is only authorized to create Evaluator accounts." });
    }
  }

  try {
    const admins = getAdmins();
    const exists = admins.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Admin or Evaluator with this username already exists." });
    }

    const assignedDept = (normalizeRole(role) === "DEPT_SPOC") ? (department || "").trim() : "";

    const newAdmin: AdminUser = {
      username: cleanUsername,
      passwordHash: hashPassword(password),
      role: role as any,
      department: assignedDept
    };

    admins.push(newAdmin);
    saveAdmins(admins);
    res.json({ success: true, message: `Account for ${cleanUsername} created successfully as ${role}${assignedDept ? ` (${assignedDept})` : ""}.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to save new admin" });
  }
});

// DELETE an admin (Super Admin SPOC and Department SPOC for evaluators)
app.delete("/api/admin/manage-admins/:username", authorize(["ADMIN", "DEPT_SPOC"]), (req, res) => {
  const targetUsername = req.params.username.trim().toLowerCase();
  const userRole = (req as any).userRole;
  
  if (targetUsername === "deepak0554") {
    return res.status(400).json({ error: "Cannot delete the primary SPOC admin." });
  }

  const currentAdminUser = ((req as any).adminUser || "").toLowerCase();
  if (targetUsername === currentAdminUser) {
    return res.status(400).json({ error: "You cannot delete your own admin account while logged in." });
  }

  try {
    const admins = getAdmins();
    const targetAdmin = admins.find(a => a.username.toLowerCase() === targetUsername);
    if (!targetAdmin) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    if (userRole === "DEPT_SPOC" && normalizeRole(targetAdmin.role) !== "EVALUATOR") {
      return res.status(403).json({ error: "Department SPOC can only remove Evaluator accounts." });
    }

    const filtered = admins.filter(a => a.username.toLowerCase() !== targetUsername);
    saveAdmins(filtered);
    res.json({ success: true, message: "Account removed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete admin" });
  }
});

// GET list of problem statements
app.get("/api/problem-statements", async (req, res) => {
  try {
    const dbStatements = await db.getProblemStatements();
    if (dbStatements && dbStatements.length > 0) {
      return res.json(dbStatements);
    }
  } catch (e) {
    console.warn("[Problem Statements] DB query notice, using local:", e);
  }
  res.json(readStatements());
});

// POST a new problem statement (Admin)
app.post("/api/problem-statements", authorize(["ADMIN", "STUDENT_SPOC"]), validateBody(problemStatementSchema), async (req, res) => {
  const { code, title, category, organization } = req.body;

  let statements: ProblemStatement[];
  try {
    statements = await db.getProblemStatements();
  } catch {
    statements = readStatements();
  }
  
  // Check code uniqueness
  if (statements.some(s => s.code.toLowerCase() === code.trim().toLowerCase())) {
    return res.status(400).json({ error: "A problem statement with this Code already exists." });
  }

  const newStatement: ProblemStatement = {
    id: Date.now().toString(),
    code: code.trim(),
    title: title.trim(),
    category: category === "Hardware" ? "Hardware" : "Software",
    organization: organization.trim()
  };

  statements.push(newStatement);
  await writeStatements(statements);
  res.status(201).json(newStatement);
});

// POST bulk upload problem statements (Admin)
app.post("/api/problem-statements/bulk", authorize(["ADMIN", "STUDENT_SPOC"]), validateBody(bulkProblemStatementsSchema), async (req, res) => {
  const { statements: newStatements, action } = req.body; // action: 'merge' or 'replace'

  const validated: ProblemStatement[] = [];
  const errors: string[] = [];

  for (let i = 0; i < newStatements.length; i++) {
    const item = newStatements[i];
    const code = item.code?.toString().trim();
    const title = item.title?.toString().trim();
    const category = item.category?.toString().trim();
    const organization = item.organization?.toString().trim();

    if (!code || !title || !category || !organization) {
      errors.push(`Row ${i + 1}: All fields (code, title, category, organization) are required.`);
      continue;
    }

    const catNormalized = (category.toLowerCase() === "hardware" || category.toLowerCase() === "h") ? "Hardware" : "Software";

    validated.push({
      id: `${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      code,
      title,
      category: catNormalized,
      organization
    });
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed for some rows", details: errors });
  }

  let currentStatements: ProblemStatement[];
  try {
    currentStatements = await db.getProblemStatements();
  } catch {
    currentStatements = readStatements();
  }
  let finalStatements: ProblemStatement[] = [];

  if (action === "replace") {
    // Map existing codes to IDs to avoid breaking existing mappings
    const codeToIdMap = new Map<string, string>();
    currentStatements.forEach(s => {
      codeToIdMap.set(s.code.toLowerCase(), s.id);
    });

    finalStatements = validated.map(v => {
      const existingId = codeToIdMap.get(v.code.toLowerCase());
      if (existingId) {
        v.id = existingId;
      }
      return v;
    });
  } else {
    // Merge: upsert matching codes, insert new
    const map = new Map<string, ProblemStatement>();
    currentStatements.forEach(s => {
      map.set(s.code.toLowerCase(), s);
    });

    validated.forEach(v => {
      const existing = map.get(v.code.toLowerCase());
      if (existing) {
        map.set(v.code.toLowerCase(), {
          ...existing,
          title: v.title,
          category: v.category,
          organization: v.organization
        });
      } else {
        map.set(v.code.toLowerCase(), v);
      }
    });

    finalStatements = Array.from(map.values());
  }

  await writeStatements(finalStatements);
  res.json({ success: true, count: validated.length, total: finalStatements.length });
});

// PUT update a problem statement (Admin)
app.put("/api/problem-statements/:id", authorize(["ADMIN", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), validateBody(problemStatementSchema), async (req, res) => {
  const { id } = req.params;
  const { code, title, category, organization } = req.body;

  let statements: ProblemStatement[];
  try {
    statements = await db.getProblemStatements();
  } catch {
    statements = readStatements();
  }
  const idx = statements.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Problem statement not found" });
  }

  // Check code uniqueness excluding self
  if (statements.some(s => s.id !== id && s.code.toLowerCase() === code.trim().toLowerCase())) {
    return res.status(400).json({ error: "A problem statement with this Code already exists." });
  }

  statements[idx] = {
    id,
    code: code.trim(),
    title: title.trim(),
    category: category === "Hardware" ? "Hardware" : "Software",
    organization: organization.trim()
  };

  await writeStatements(statements);
  res.json(statements[idx]);
});

// DELETE a problem statement (Admin)
app.delete("/api/problem-statements/:id", authorize(["ADMIN", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), async (req, res) => {
  const { id } = req.params;
  let statements: ProblemStatement[];
  try {
    statements = await db.getProblemStatements();
  } catch {
    statements = readStatements();
  }
  const filtered = statements.filter(s => s.id !== id);
  
  if (filtered.length === statements.length) {
    return res.status(404).json({ error: "Problem statement not found" });
  }

  await writeStatements(filtered);
  res.json({ success: true, message: "Deleted successfully" });
});

// POST restore default problem statements (Admin)
app.post("/api/problem-statements/restore-default", authorize(["ADMIN", "STUDENT_SPOC"]), async (req, res) => {
  await writeStatements(defaultStatements);
  res.json({
    success: true,
    message: "Default problem statements restored and synchronized with database.",
    statements: defaultStatements
  });
});

// POST retrieve / refresh problem statements from database (Admin)
app.post("/api/problem-statements/sync", authorize(["ADMIN", "STUDENT_SPOC"]), async (req, res) => {
  try {
    const dbStatements = await db.getProblemStatements();
    if (dbStatements && dbStatements.length > 0) {
      await writeStatements(dbStatements);
      return res.json({
        success: true,
        message: `Successfully retrieved and verified ${dbStatements.length} problem statements from central database.`,
        statements: dbStatements
      });
    } else {
      const current = readStatements();
      await db.saveProblemStatements(current);
      return res.json({
        success: true,
        message: `Synced ${current.length} problem statements to database.`,
        statements: current
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to sync problem statements with database: " + err.message });
  }
});

// GET public list of finalized/selected teams (Public view for Selected Teams)
app.get("/api/registrations/selected", (req, res) => {
  try {
    const allRegistrations = readRegistrations();
    const selected = allRegistrations
      .filter(r => r.isFinalSelected === true || r.approvalStatus === "approved")
      .map(r => ({
        id: r.id,
        registrationId: r.registrationId,
        teamName: r.teamName,
        leadName: r.leadName,
        leadDepartment: r.leadDepartment,
        leadAcademicYear: r.leadAcademicYear,
        mentorName: r.mentorName,
        problemStatementId: r.problemStatementId,
        hasFemaleMember: r.hasFemaleMember,
        member1: r.member1,
        member2: r.member2,
        member3: r.member3,
        member4: r.member4,
        member5: r.member5,
        selectionNotes: r.selectionNotes || "",
        submittedAt: r.submittedAt
      }));
    res.json(selected);
  } catch (err) {
    console.error("Error fetching selected teams:", err);
    res.status(500).json({ error: "Failed to fetch selected teams" });
  }
});

// GET registrations (Admin, Dept SPOC, Student SPOC, Evaluator, Faculty)
app.get("/api/registrations", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]), (req, res) => {
  const allRegistrations = readRegistrations();
  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;

  if (userRole === "DEPT_SPOC" && adminDept) {
    const filtered = allRegistrations.filter(r => isDepartmentMatch(r.leadDepartment, adminDept));
    return res.json(filtered);
  }

  res.json(allRegistrations);
});

// GET evaluation criteria (Admin/Evaluators/Faculty)
app.get("/api/admin/evaluation-criteria", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]), (req, res) => {
  res.json(readCriteria());
});

// POST update evaluation criteria (SPOC Super Admin only)
app.post("/api/admin/evaluation-criteria", authorize(["ADMIN"]), validateBody(updateEvaluationCriteriaBodySchema), (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC (Super Admin) can manage evaluation criteria." });
  }
  const { criteria } = req.body;
  writeCriteria(criteria);
  res.json({ success: true, message: "Evaluation criteria updated successfully." });
});

// POST assign evaluator to a team registration (Admin, Dept SPOC, Student SPOC)
app.post("/api/admin/registrations/:id/assign-evaluator", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), validateBody(assignEvaluatorSchema), (req, res) => {
  const { id } = req.params;
  const { evaluatorUsername } = req.body; // can be empty string to unassign

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(registrations[idx].leadDepartment, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You can only assign evaluators to teams in your department (${adminDept}).` });
  }

  registrations[idx].assignedEvaluator = evaluatorUsername || undefined;
  writeRegistrations(registrations);

  res.json({ success: true, message: "Evaluator assigned successfully." });
});

// GET all evaluations or for specific registration (Admin / Dept SPOC / Evaluator / SPOC / Faculty)
app.get("/api/admin/evaluations", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]), async (req, res) => {
  try {
    const { registrationId } = req.query;
    const evaluations = await db.getEvaluations(registrationId as string | undefined);
    const userRole = (req as any).userRole;
    const adminDept = (req as any).adminDepartment;

    if (userRole === "DEPT_SPOC" && adminDept) {
      const registrations = readRegistrations();
      const deptRegIds = new Set(
        registrations.filter(r => isDepartmentMatch(r.leadDepartment, adminDept)).map(r => r.id)
      );
      const filtered = evaluations.filter(e => deptRegIds.has(e.registrationId));
      return res.json(filtered);
    }

    res.json(evaluations);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch evaluations from database: " + err.message });
  }
});

// POST evaluate/score team (Evaluator role, Dept SPOC, Super Admin)
app.post("/api/admin/registrations/:id/evaluate", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]), validateParams(singleIdParamSchema), validateBody(evaluateTeamSchema), async (req, res) => {
  const role = (req as any).adminRole;
  const username = (req as any).adminUser;
  const dept = (req as any).adminDepartment;
  const { id } = req.params;
  const { scores, notes, status } = req.body;

  const result = await evaluationService.submitEvaluation({
    registrationId: id,
    evaluatorUsername: username || "Jury",
    evaluatorRole: role,
    evaluatorDepartment: dept,
    scores,
    notes,
    status
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: result.error || "Failed to submit evaluation" },
      message: result.error || "Failed to submit evaluation"
    });
  }

  res.json({
    success: true,
    evaluation: result.evaluation,
    message: "Team evaluation submitted and stored in database successfully."
  });
});

// POST toggle evaluation lock for a team (Super Admin & Dept SPOC)
app.post("/api/admin/registrations/:id/evaluation-lock", authorize(["ADMIN", "DEPT_SPOC"]), validateParams(singleIdParamSchema), validateBody(toggleEvaluationLockSchema), async (req, res) => {
  const { id } = req.params;
  const { locked } = req.body;
  const username = (req as any).adminUser || "ADMIN";

  const result = await evaluationService.toggleEvaluationLock(id, !!locked, username);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: result.error || "Failed to toggle evaluation lock" },
      message: result.error || "Failed to toggle evaluation lock"
    });
  }

  res.json({
    success: true,
    isEvaluationLocked: result.isEvaluationLocked,
    message: result.isEvaluationLocked ? "Team evaluation locked successfully." : "Team evaluation unlocked successfully."
  });
});


// POST finalize student selection (SPOC & Dept SPOC for department teams)
app.post("/api/admin/registrations/:id/finalize-selection", authorize(["ADMIN", "DEPT_SPOC"]), validateParams(singleIdParamSchema), validateBody(finalizeSelectionSchema), (req, res) => {
  const { id } = req.params;
  const { isSelected, selectionNotes } = req.body;

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(registrations[idx].leadDepartment, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You can only select teams in your department (${adminDept}).` });
  }

  registrations[idx].isFinalSelected = !!isSelected;
  registrations[idx].selectionNotes = selectionNotes || "";

  writeRegistrations(registrations);
  res.json({ success: true, message: `Team selection finalized.` });
});

// POST update registration approval status (SPOC / Admin / Dept SPOC / Student SPOC)
app.post("/api/admin/registrations/:id/approval-status", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), validateBody(updateApprovalStatusSchema), (req, res) => {
  const { id } = req.params;
  const { approvalStatus, approvalNotes } = req.body;

  const allowedStatuses = ["pending", "verified", "under_review", "rejected"];
  if (approvalStatus && !allowedStatuses.includes(approvalStatus)) {
    return res.status(400).json({ error: "Invalid approval status. Must be one of: " + allowedStatuses.join(", ") });
  }

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(registrations[idx].leadDepartment, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You can only update approval status for teams in your department (${adminDept}).` });
  }

  const adminName = (req as any).adminUser || (req as any).adminRole || "Admin";
  const updatedStatus = approvalStatus || "pending";

  registrations[idx].approvalStatus = updatedStatus;
  if (approvalNotes !== undefined) {
    registrations[idx].approvalNotes = approvalNotes;
  }
  if (updatedStatus === "verified") {
    registrations[idx].verifiedAt = new Date().toISOString();
    registrations[idx].verifiedBy = adminName;
  } else if (updatedStatus === "pending") {
    registrations[idx].verifiedAt = undefined;
    registrations[idx].verifiedBy = undefined;
  }

  writeRegistrations(registrations);

  // Sync to external DB in background if configured
  syncRegistrationToExternalDB(registrations[idx]).catch(err => {
    console.error("Failed to sync updated registration approval status to external DB:", err);
  });

  res.json({ success: true, message: `Registration approval status updated to ${updatedStatus}.`, registration: registrations[idx] });
});

// GET own registration (Student lookup)
app.get("/api/registrations/my", validateStudentJWT, (req, res) => {
  const email = req.query.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required." });
  }

  const settings = readSettings();
  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Accessing another student's registration is not allowed." });
    }
  }

  const emailClean = email.trim().toLowerCase();
  const registrations = readRegistrations();
  const myReg = registrations.find(r => r.studentEmail?.trim().toLowerCase() === emailClean);

  if (!myReg) {
    return res.json({ found: false, registration: null });
  }

  res.json({ found: true, registration: myReg });
});

// PUT update own project proposal (Student portal)
app.put("/api/registrations/my/proposal", validateStudentJWT, validateBody(updateProposalSchema), (req, res) => {
  const { email, abstract, implementationSteps, pptFileName, pptBase64, proposalStatus } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
  }

  const settings = readSettings();
  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Accessing another student's registration is not allowed." });
    }
  }

  const emailClean = email.trim().toLowerCase();
  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.studentEmail?.trim().toLowerCase() === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "No team registration found for this student account." });
  }

  const current = registrations[idx];

  // Authoritative Business Rules validation for proposal submissions & deadlines
  const proposalValidation = validateProposalSubmission(req.body, current, settings);
  if (!proposalValidation.isValid) {
    return res.status(400).json({
      error: proposalValidation.errors[0],
      errors: proposalValidation.errors,
      warnings: proposalValidation.warnings
    });
  }

  let pptFileUrl = current.pptFileUrl || "";
  if (pptBase64 && typeof pptBase64 === "string" && pptBase64.startsWith("data:")) {
    const safePptName = pptFileName || `${current.teamName || "team"}_presentation.pptx`;
    const savedPpt = saveBase64File(pptBase64, "ppts", safePptName);
    if (savedPpt) {
      pptFileUrl = savedPpt.url;
    }
  }

  registrations[idx] = {
    ...current,
    abstract: abstract !== undefined ? abstract.trim() : current.abstract,
    implementationSteps: implementationSteps !== undefined ? implementationSteps.trim() : current.implementationSteps,
    pptFileName: pptFileName !== undefined ? pptFileName : current.pptFileName,
    pptBase64: pptBase64 !== undefined ? pptBase64 : current.pptBase64,
    pptFileUrl: pptFileUrl || current.pptFileUrl,
    proposalStatus: proposalStatus || current.proposalStatus || "saved"
  };

  writeRegistrations(registrations);

  // Sync to external DB in the background
  syncRegistrationToExternalDB(registrations[idx]).catch(err => {
    console.error("Failed to sync proposal update to external DB in background:", err);
  });

  res.json({ success: true, registration: registrations[idx], message: proposalStatus === "submitted" ? "Proposal submitted successfully!" : "Proposal saved successfully!" });
});

// GET a student's profile
app.get("/api/students/profile", validateStudentJWT, (req, res) => {
  const email = req.query.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required." });
  }

  const settings = readSettings();
  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Accessing another student's profile is not allowed." });
    }
  }

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();
  const student = students.find(s => s.email === emailClean);

  if (!student) {
    return res.status(404).json({ error: "Student profile not found." });
  }

  res.json({
    id: student.id,
    email: student.email,
    gender: student.gender || "",
    department: student.department || "",
    mobile: student.mobile || "",
    createdAt: student.createdAt
  });
});

// PUT update student's profile
app.put("/api/students/profile", validateStudentJWT, validateBody(studentProfileUpdateSchema), (req, res) => {
  const { email, gender, department, mobile } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
  }

  const settings = readSettings();
  if (settings.lockStudentUpdates) {
    return res.status(403).json({ error: "Profile updates are currently locked by the SPOC administrator." });
  }

  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Accessing another student's profile is not allowed." });
    }
  }

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();
  const idx = students.findIndex(s => s.email === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "Student account not found." });
  }

  students[idx] = {
    ...students[idx],
    gender: gender !== undefined ? gender : students[idx].gender,
    department: department !== undefined ? department : students[idx].department,
    mobile: mobile !== undefined ? mobile : students[idx].mobile
  };

  writeStudents(students);

  res.json({
    success: true,
    student: {
      id: students[idx].id,
      email: students[idx].email,
      gender: students[idx].gender,
      department: students[idx].department,
      mobile: students[idx].mobile
    }
  });
});

// POST student reset/change their own password
app.post("/api/students/change-password", validateStudentJWT, validateBody(changePasswordSchema), (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  const tokenEmail = (req as any).studentUser?.email;
  if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
    return res.status(403).json({ error: "Forbidden: Modifying another student's password is not allowed." });
  }

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();
  const idx = students.findIndex(s => s.email === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "Student account not found." });
  }

  // Verify old password
  if (!verifyPassword(oldPassword, students[idx].passwordHash)) {
    return res.status(400).json({ error: "Incorrect current password." });
  }

  students[idx].passwordHash = hashPassword(newPassword);
  writeStudents(students);

  res.json({ success: true, message: "Your password has been changed successfully." });
});

// PUT update student's own team member details
app.put("/api/registrations/my/team", validateStudentJWT, validateBody(updateTeamRosterSchema), (req, res) => {
  const settings = readSettings();
  if (settings.lockStudentUpdates) {
    return res.status(403).json({ error: "Team details and roster updates are currently locked by the SPOC administrator." });
  }

  const {
    email,
    leadName,
    leadMobile,
    leadGender,
    member1,
    member1Gender,
    member1Email,
    member1Phone,
    member2,
    member2Gender,
    member2Email,
    member2Phone,
    member3,
    member3Gender,
    member3Email,
    member3Phone,
    member4,
    member4Gender,
    member4Email,
    member4Phone,
    member5,
    member5Gender,
    member5Email,
    member5Phone,
    mentorName
  } = req.body;

  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Modifying another student's team is not allowed." });
    }
  }

  const emailClean = email.trim().toLowerCase();
  const registrations = readRegistrations();
  const statements = readStatements();
  const idx = registrations.findIndex(r => r.studentEmail?.trim().toLowerCase() === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "No team registration found for this student account." });
  }

  const current = registrations[idx];

  // Authoritative validation of team update & roster rules
  const mergedData = {
    ...current,
    ...req.body,
    teamName: current.teamName, // Keep team name unchanged
    problemStatementId: current.problemStatementId // Keep problem statement unchanged
  };

  const validationResult = validateTeamRegistration(
    mergedData,
    settings,
    registrations,
    statements,
    {
      isUpdate: true,
      currentRegistrationId: current.registrationId,
      authenticatedStudentEmail: (req as any).studentUser?.email
    }
  );

  if (!validationResult.isValid) {
    return res.status(400).json({
      error: validationResult.errors[0],
      errors: validationResult.errors,
      warnings: validationResult.warnings
    });
  }

  const count = settings.teamMembersCount ?? 5;

  registrations[idx] = {
    ...current,
    leadName: leadName !== undefined ? leadName.trim() : current.leadName,
    leadMobile: leadMobile !== undefined ? leadMobile.trim() : current.leadMobile,
    leadGender: leadGender !== undefined ? leadGender : current.leadGender,
    member1: count >= 1 ? (member1 !== undefined ? member1.trim() : current.member1) : "",
    member1Gender: count >= 1 ? (member1Gender !== undefined ? member1Gender : current.member1Gender) : "",
    member1Email: count >= 1 ? (member1Email !== undefined ? member1Email.trim() : current.member1Email) : "",
    member1Phone: count >= 1 ? (member1Phone !== undefined ? member1Phone.trim() : current.member1Phone) : "",
    member2: count >= 2 ? (member2 !== undefined ? member2.trim() : current.member2) : "",
    member2Gender: count >= 2 ? (member2Gender !== undefined ? member2Gender : current.member2Gender) : "",
    member2Email: count >= 2 ? (member2Email !== undefined ? member2Email.trim() : current.member2Email) : "",
    member2Phone: count >= 2 ? (member2Phone !== undefined ? member2Phone.trim() : current.member2Phone) : "",
    member3: count >= 3 ? (member3 !== undefined ? member3.trim() : current.member3) : "",
    member3Gender: count >= 3 ? (member3Gender !== undefined ? member3Gender : current.member3Gender) : "",
    member3Email: count >= 3 ? (member3Email !== undefined ? member3Email.trim() : current.member3Email) : "",
    member3Phone: count >= 3 ? (member3Phone !== undefined ? member3Phone.trim() : current.member3Phone) : "",
    member4: count >= 4 ? (member4 !== undefined ? member4.trim() : current.member4) : "",
    member4Gender: count >= 4 ? (member4Gender !== undefined ? member4Gender : current.member4Gender) : "",
    member4Email: count >= 4 ? (member4Email !== undefined ? member4Email.trim() : current.member4Email) : "",
    member4Phone: count >= 4 ? (member4Phone !== undefined ? member4Phone.trim() : current.member4Phone) : "",
    member5: count >= 5 ? (member5 !== undefined ? member5.trim() : current.member5) : "",
    member5Gender: count >= 5 ? (member5Gender !== undefined ? member5Gender : current.member5Gender) : "",
    member5Email: count >= 5 ? (member5Email !== undefined ? member5Email.trim() : current.member5Email) : "",
    member5Phone: count >= 5 ? (member5Phone !== undefined ? member5Phone.trim() : current.member5Phone) : "",
    mentorName: mentorName !== undefined ? mentorName.trim() : current.mentorName
  };

  writeRegistrations(registrations);

  // Sync to external DB in the background
  syncRegistrationToExternalDB(registrations[idx]).catch(err => {
    console.error("Failed to sync team update to external DB in background:", err);
  });

  res.json({ success: true, message: "Team roster and contact details updated successfully.", registration: registrations[idx] });
});

// POST change own admin password (for any logged-in Admin, including Student SPOC / Evaluator)
app.post("/api/admin/change-password", authorize(["ADMIN", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]), validateBody(changePasswordSchema), (req, res) => {
  const currentAdminUser = (req as any).adminUser;
  const { oldPassword, newPassword } = req.body;

  try {
    const admins = getAdmins();
    const idx = admins.findIndex(a => a.username.toLowerCase() === currentAdminUser.toLowerCase());

    if (idx === -1) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    // Verify old password
    if (!verifyPassword(oldPassword, admins[idx].passwordHash)) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    admins[idx].passwordHash = hashPassword(newPassword);
    saveAdmins(admins);

    res.json({ success: true, message: "Your administrative password has been changed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to change admin password." });
  }
});

// POST reset admin password (Super Admin SPOC only)
app.post("/api/admin/manage-admins/:username/reset-password", authorize(["ADMIN"]), validateBody(resetPasswordAdminSchema), (req, res) => {
  const targetUsername = req.params.username.trim().toLowerCase();
  const { newPassword } = req.body;

  try {
    const admins = getAdmins();
    const idx = admins.findIndex(a => a.username.toLowerCase() === targetUsername);

    if (idx === -1) {
      return res.status(404).json({ error: "Admin not found." });
    }

    admins[idx].passwordHash = hashPassword(newPassword);
    saveAdmins(admins);

    res.json({ success: true, message: `Password for admin ${admins[idx].username} reset successfully.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset admin password." });
  }
});

// GET all students (Admin / Dept SPOC / Student SPOC)
app.get("/api/admin/students", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), (req, res) => {
  const students = readStudents();
  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;

  let filtered = students;
  if (userRole === "DEPT_SPOC" && adminDept) {
    filtered = students.filter(s => isDepartmentMatch(s.department, adminDept));
  }

  res.json(filtered.map(s => ({
    id: s.id,
    email: s.email,
    createdAt: s.createdAt,
    gender: s.gender || "N/A",
    department: s.department || "N/A",
    mobile: s.mobile || "N/A"
  })));
});

// POST reset student password (Admin / Dept SPOC / Student SPOC)
app.post("/api/admin/students/:id/reset-password", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), validateBody(resetPasswordAdminSchema), (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const students = readStudents();
  const idx = students.findIndex(s => s.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Student not found." });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(students[idx].department, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You can only manage students in your department (${adminDept}).` });
  }

  students[idx].passwordHash = hashPassword(newPassword);
  writeStudents(students);

  res.json({ success: true, message: "Student password reset successfully." });
});

// DELETE student user (Admin / Dept SPOC / Student SPOC)
app.delete("/api/admin/students/:id", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), (req, res) => {
  const { id } = req.params;
  const students = readStudents();
  const idx = students.findIndex(s => s.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Student not found." });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(students[idx].department, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You can only delete students in your department (${adminDept}).` });
  }

  const filtered = students.filter(s => s.id !== id);
  writeStudents(filtered);
  res.json({ success: true, message: "Student account deleted successfully." });
});

// POST dynamic check for team name uniqueness
app.get("/api/registrations/check-team", (req, res) => {
  const name = req.query.name;
  if (!name || typeof name !== "string") {
    return res.json({ available: true });
  }

  const registrations = readRegistrations();
  const exists = registrations.some(
    r => r.teamName.trim().toLowerCase() === name.trim().toLowerCase()
  );
  res.json({ available: !exists });
});

// POST submit a registration
app.post("/api/registrations", validateStudentJWT, validateBody(teamRegistrationSchema), async (req, res) => {
  const {
    teamName,
    leadName,
    leadDepartment,
    leadMobile,
    leadGender,
    leadAcademicYear,
    member1,
    member1Gender,
    member1Email,
    member1Phone,
    member1AcademicYear,
    member2,
    member2Gender,
    member2Email,
    member2Phone,
    member2AcademicYear,
    member3,
    member3Gender,
    member3Email,
    member3Phone,
    member3AcademicYear,
    member4,
    member4Gender,
    member4Email,
    member4Phone,
    member4AcademicYear,
    member5,
    member5Gender,
    member5Email,
    member5Phone,
    member5AcademicYear,
    mentorName,
    problemStatementId,
    studentEmail,
    paymentId,
    orderId,
    signature
  } = req.body;

  const settings = readSettings();
  const registrations = readRegistrations();
  const statements = readStatements();

  // 1. Authoritative Backend Business Rules Validation
  const tokenStudentEmail = (req as any).studentUser?.email;
  const validationResult = validateTeamRegistration(
    req.body,
    settings,
    registrations,
    statements,
    {
      isUpdate: false,
      authenticatedStudentEmail: tokenStudentEmail
    }
  );

  if (!validationResult.isValid) {
    return res.status(400).json({
      error: validationResult.errors[0],
      errors: validationResult.errors,
      warnings: validationResult.warnings
    });
  }

  // 2. Authoritative Payment Verification & Security
  let paymentStatus: "free" | "paid" | "pending" | "pending_verification" | "rejected" = "free";
  let paymentMode: "gateway" | "manual_upi" | "free" = "free";
  let verifiedAmountPaid = 0;
  let finalPaymentProofUrl = req.body.paymentProofUrl || "";

  const isManualUpi =
    settings.feeEnabled &&
    (settings.paymentMode === "manual_upi" ||
      settings.manualPaymentEnabled ||
      req.body.paymentMode === "manual_upi" ||
      !!req.body.paymentProofUrl ||
      !!req.body.paymentProofBase64 ||
      !!req.body.upiTransactionId ||
      !settings.razorpayKeyId ||
      settings.razorpayKeyId === "rzp_test_mock");

  if (settings.feeEnabled) {
    if (isManualUpi) {
      paymentMode = "manual_upi";
      paymentStatus = "pending_verification";
      verifiedAmountPaid = settings.feeAmount || 0;

      // Handle payment proof base64 upload if provided directly in payload
      if (req.body.paymentProofBase64 && typeof req.body.paymentProofBase64 === "string" && req.body.paymentProofBase64.startsWith("data:")) {
        const safeProofName = req.body.paymentProofFileName || `${teamName.trim().replace(/[^a-zA-Z0-9]/g, "_")}_payment_proof.png`;
        const savedProof = saveBase64Securely(req.body.paymentProofBase64, "payment_proofs", safeProofName);
        if (savedProof) {
          finalPaymentProofUrl = savedProof.url;
        }
      }
    } else {
      // Gateway flow
      paymentMode = "gateway";
      if (!paymentId || !orderId) {
        return res.status(400).json({ error: "Payment verification details (Order ID and Payment ID) are required." });
      }

      const payResult = await verifyAuthoritativePayment({
        orderId,
        paymentId,
        signature,
        teamName: teamName.trim(),
        studentEmail: studentEmail?.trim(),
        settings
      });

      if (!payResult.verified) {
        return res.status(400).json({ error: payResult.error || "Payment verification failed." });
      }

      paymentStatus = "paid";
      verifiedAmountPaid = payResult.amountPaid;
    }
  }

  // 3. Generate Registration ID (e.g. SIH-REG-1001)
  let nextSeq = 1001;
  if (registrations.length > 0) {
    // extract highest number from IDs like "SIH-REG-X"
    const seqs = registrations.map(r => {
      const parts = r.registrationId.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? 0 : num;
    });
    nextSeq = Math.max(...seqs) + 1;
  }
  const registrationId = `SIH-REG-${nextSeq}`;

  let pptFileUrl = "";
  if (req.body.pptBase64 && typeof req.body.pptBase64 === "string" && req.body.pptBase64.startsWith("data:")) {
    const safePptName = req.body.pptFileName || `${teamName.trim()}_presentation.pptx`;
    const savedPpt = saveBase64File(req.body.pptBase64, "ppts", safePptName);
    if (savedPpt) {
      pptFileUrl = savedPpt.url;
    }
  }

  const count = settings.teamMembersCount ?? 5;
  const hasFemaleMember = (leadGender || "").toLowerCase() === "female" ||
    (count >= 1 && (member1Gender || "").toLowerCase() === "female") ||
    (count >= 2 && (member2Gender || "").toLowerCase() === "female") ||
    (count >= 3 && (member3Gender || "").toLowerCase() === "female") ||
    (count >= 4 && (member4Gender || "").toLowerCase() === "female") ||
    (count >= 5 && (member5Gender || "").toLowerCase() === "female");

  const newRegistration: Registration = {
    id: Date.now().toString(),
    registrationId,
    teamName: teamName.trim(),
    leadName: leadName.trim(),
    leadDepartment: leadDepartment.trim(),
    leadMobile: leadMobile.trim(),
    leadGender: leadGender || "",
    leadAcademicYear: (leadAcademicYear || "").trim(),
    member1: count >= 1 ? (member1 || "").trim() : "",
    member1Gender: count >= 1 ? (member1Gender || "") : "",
    member1Email: count >= 1 ? (member1Email || "") : "",
    member1Phone: count >= 1 ? (member1Phone || "") : "",
    member1AcademicYear: count >= 1 ? (member1AcademicYear || "").trim() : "",
    member2: count >= 2 ? (member2 || "").trim() : "",
    member2Gender: count >= 2 ? (member2Gender || "") : "",
    member2Email: count >= 2 ? (member2Email || "") : "",
    member2Phone: count >= 2 ? (member2Phone || "") : "",
    member2AcademicYear: count >= 2 ? (member2AcademicYear || "").trim() : "",
    member3: count >= 3 ? (member3 || "").trim() : "",
    member3Gender: count >= 3 ? (member3Gender || "") : "",
    member3Email: count >= 3 ? (member3Email || "") : "",
    member3Phone: count >= 3 ? (member3Phone || "") : "",
    member3AcademicYear: count >= 3 ? (member3AcademicYear || "").trim() : "",
    member4: count >= 4 ? (member4 || "").trim() : "",
    member4Gender: count >= 4 ? (member4Gender || "") : "",
    member4Email: count >= 4 ? (member4Email || "") : "",
    member4Phone: count >= 4 ? (member4Phone || "") : "",
    member4AcademicYear: count >= 4 ? (member4AcademicYear || "").trim() : "",
    member5: count >= 5 ? (member5 || "").trim() : "",
    member5Gender: count >= 5 ? (member5Gender || "") : "",
    member5Email: count >= 5 ? (member5Email || "") : "",
    member5Phone: count >= 5 ? (member5Phone || "") : "",
    member5AcademicYear: count >= 5 ? (member5AcademicYear || "").trim() : "",
    hasFemaleMember: !!hasFemaleMember,
    mentorName: mentorName.trim(),
    problemStatementId,
    submittedAt: new Date().toISOString(),
    studentEmail: studentEmail?.trim() || undefined,
    paymentStatus,
    paymentMode,
    paymentId: paymentId || (isManualUpi ? `upi_${Date.now()}` : undefined),
    orderId: orderId || (isManualUpi ? `upi_ord_${Date.now()}` : undefined),
    amountPaid: paymentStatus === "paid" || paymentStatus === "pending_verification" ? verifiedAmountPaid : undefined,
    paymentProofUrl: finalPaymentProofUrl || undefined,
    paymentProofFileName: req.body.paymentProofFileName || undefined,
    upiTransactionId: req.body.upiTransactionId?.trim() || undefined,
    approvalStatus: "pending",
    abstract: req.body.abstract?.trim() || undefined,
    implementationSteps: req.body.implementationSteps?.trim() || undefined,
    pptFileName: req.body.pptFileName || undefined,
    pptBase64: req.body.pptBase64 || undefined,
    pptFileUrl: pptFileUrl || undefined,
    proposalStatus: req.body.proposalStatus || (req.body.pptBase64 ? "saved" : undefined)
  };

  registrations.push(newRegistration);
  writeRegistrations(registrations);

  // Sync to external DB in the background
  syncRegistrationToExternalDB(newRegistration).catch(err => {
    console.error("Failed to sync registration to external DB in background:", err);
  });

  // Trigger background confirmation emails to all team members
  try {
    const pStatements = readStatements();
    const matchedPS = pStatements.find(s => s.id === problemStatementId);
    const psDetails = matchedPS ? `${matchedPS.code}: ${matchedPS.title}` : "Selected SIH Problem Statement";

    const teamEmails = [
      studentEmail?.trim(),
      member1Email?.trim(),
      member2Email?.trim(),
      member3Email?.trim(),
      member4Email?.trim(),
      member5Email?.trim()
    ].filter((email): email is string => !!email && /\S+@\S+\.\S+/.test(email));

    const uniqueTeamEmails = Array.from(new Set(teamEmails.map(e => e.toLowerCase())));

    if (uniqueTeamEmails.length > 0) {
      const confirmSubject = `SIH Hackathon Registration Confirmed - Team: ${teamName}`;
      let rosterHtml = `<strong>Team Members roster:</strong><br/>`;
      rosterHtml += `1. ${leadName} (Leader, Mobile: ${leadMobile})<br/>`;
      if (count >= 1 && member1) rosterHtml += `2. ${member1} (${member1Email || "No Email"})<br/>`;
      if (count >= 2 && member2) rosterHtml += `3. ${member2} (${member2Email || "No Email"})<br/>`;
      if (count >= 3 && member3) rosterHtml += `4. ${member3} (${member3Email || "No Email"})<br/>`;
      if (count >= 4 && member4) rosterHtml += `5. ${member4} (${member4Email || "No Email"})<br/>`;
      if (count >= 5 && member5) rosterHtml += `6. ${member5} (${member5Email || "No Email"})`;

      const confirmHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Registration Confirmed</span>
            <h2 style="color: #4f46e5; margin-top: 8px; margin-bottom: 4px; font-size: 22px; font-weight: bold;">Smart India Hackathon</h2>
            <p style="font-size: 14px; color: #64748b; margin-top: 0;">SVEC Campus Hackathon Edition</p>
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Congratulations!</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your team <strong>${teamName}</strong> has been successfully registered for the SVEC internal selection hackathon for Smart India Hackathon (SIH).</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Hackathon Registration Summary:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Registration ID:</strong></td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: bold; color: #4f46e5;">${registrationId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Team Name:</strong></td>
                <td style="padding: 6px 0; font-weight: bold;">${teamName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Team Leader:</strong></td>
                <td style="padding: 6px 0;">${leadName} (${leadDepartment})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Problem Statement:</strong></td>
                <td style="padding: 6px 0; font-weight: 500;">${psDetails}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Mentor Name:</strong></td>
                <td style="padding: 6px 0;">${mentorName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;"><strong>Fee Payment Status:</strong></td>
                <td style="padding: 6px 0; text-transform: uppercase; font-size: 11px;"><span style="background-color: ${paymentStatus === "paid" ? "#d1fae5" : "#f3f4f6"}; color: ${paymentStatus === "paid" ? "#065f46" : "#374151"}; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${paymentStatus}</span></td>
              </tr>
            </table>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #1e40af; line-height: 1.5;">
            ${rosterHtml}
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6;">You can log in to the portal at any time to view your confirmation slip, upload your project proposal PPT/abstract, or update your team profile.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an automated confirmation from SVEC Smart India Hackathon Portal.</p>
        </div>
      `;

      // Dispatch to each member in background
      Promise.all(uniqueTeamEmails.map(email => sendEmail(email, confirmSubject, confirmHtml))).catch(err => {
        console.error("Failed to send some of the team registration confirmation emails:", err);
      });
    }
  } catch (err) {
    console.error("Error setting up team registration email dispatch:", err);
  }

  res.status(201).json({
    success: true,
    registration: newRegistration,
    message: "Registration successful!"
  });
});

// POST verify-payment for a pending registration
app.post("/api/registrations/verify-payment", validateStudentJWT, validateBody(verifyPaymentSchema), async (req, res) => {
  const { registrationId, paymentId, orderId, signature } = req.body;

  try {
    const settings = readSettings();
    const registrations = readRegistrations();
    const idx = registrations.findIndex(r => r.registrationId === registrationId);

    if (idx === -1) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const registration = registrations[idx];

    // Authoritative payment verification
    const payResult = await verifyAuthoritativePayment({
      orderId,
      paymentId,
      signature,
      registrationId,
      teamName: registration.teamName,
      studentEmail: registration.studentEmail,
      settings
    });

    if (!payResult.verified) {
      return res.status(400).json({ error: payResult.error || "Payment signature verification failed." });
    }

    registration.paymentStatus = "paid";
    registration.paymentId = paymentId;
    registration.orderId = orderId;
    registration.amountPaid = payResult.amountPaid;
    registration.submittedAt = new Date().toISOString(); // Update submission timestamp on payment confirmation

    registrations[idx] = registration;
    writeRegistrations(registrations);

    // Sync to external DB in the background on payment confirmation
    syncRegistrationToExternalDB(registration).catch(err => {
      console.error("Failed to sync registration to external DB in background on payment:", err);
    });

    // Trigger background confirmation emails to all team members
    try {
      const pStatements = readStatements();
      const matchedPS = pStatements.find(s => s.id === registration.problemStatementId);
      const psDetails = matchedPS ? `${matchedPS.code}: ${matchedPS.title}` : "Selected SIH Problem Statement";

      const count = settings.teamMembersCount ?? 5;
      const teamEmails = [
        registration.studentEmail?.trim(),
        registration.member1Email?.trim(),
        registration.member2Email?.trim(),
        registration.member3Email?.trim(),
        registration.member4Email?.trim(),
        registration.member5Email?.trim()
      ].filter((email): email is string => !!email && /\S+@\S+\.\S+/.test(email));

      const uniqueTeamEmails = Array.from(new Set(teamEmails.map(e => e.toLowerCase())));

      if (uniqueTeamEmails.length > 0) {
        const confirmSubject = `SIH Hackathon Registration Confirmed - Team: ${registration.teamName}`;
        let rosterHtml = `<strong>Team Members roster:</strong><br/>`;
        rosterHtml += `1. ${registration.leadName} (Leader, Mobile: ${registration.leadMobile})<br/>`;
        if (count >= 1 && registration.member1) rosterHtml += `2. ${registration.member1} (${registration.member1Email || "No Email"})<br/>`;
        if (count >= 2 && registration.member2) rosterHtml += `3. ${registration.member2} (${registration.member2Email || "No Email"})<br/>`;
        if (count >= 3 && registration.member3) rosterHtml += `4. ${registration.member3} (${registration.member3Email || "No Email"})<br/>`;
        if (count >= 4 && registration.member4) rosterHtml += `5. ${registration.member4} (${registration.member4Email || "No Email"})<br/>`;
        if (count >= 5 && registration.member5) rosterHtml += `6. ${registration.member5} (${registration.member5Email || "No Email"})`;

        const confirmHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">Registration Confirmed</span>
              <h2 style="color: #4f46e5; margin-top: 8px; margin-bottom: 4px; font-size: 22px; font-weight: bold;">Smart India Hackathon</h2>
              <p style="font-size: 14px; color: #64748b; margin-top: 0;">SVEC Campus Hackathon Edition</p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0;">
              <h3 style="margin-top: 0; color: #0f172a; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Hackathon Registration Summary:</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 130px;">Registration ID:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${registration.registrationId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Team Name:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${registration.teamName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Problem Code:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${psDetails}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Mentor Name:</td>
                  <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${registration.mentorName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Payment Status:</td>
                  <td style="padding: 6px 0; text-transform: uppercase; font-size: 11px;"><span style="background-color: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: bold;">PAID</span></td>
                </tr>
              </table>
            </div>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #1e40af; line-height: 1.5;">
              <strong>Team Registered!</strong> You can now log into the Student Portal to upload your presentation and track your ideas status.
            </div>

            <div style="font-size: 12px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
              ${rosterHtml}
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">This is an automated confirmation from SVEC Smart India Hackathon Portal.</p>
          </div>
        `;

        // Dispatch to each member in background
        Promise.all(uniqueTeamEmails.map(email => sendEmail(email, confirmSubject, confirmHtml))).catch(err => {
          console.error("Failed to send some of the team registration confirmation emails:", err);
        });
      }
    } catch (err) {
      console.error("Error setting up team registration email dispatch:", err);
    }

    res.json({ success: true, registration });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to verify signature: " + err.message });
  }
});

// PUT update a registration (Admin / Dept SPOC / Student SPOC)
app.put("/api/registrations/:id", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), validateBody(updateRegistrationAdminSchema), (req, res) => {
  const { id } = req.params;
  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found" });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(registrations[idx].leadDepartment, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You are only permitted to edit teams in your department (${adminDept}).` });
  }

  const current = registrations[idx];
  const updatedBody = req.body;

  // Compute updated hasFemaleMember dynamically from updated genders if provided
  const leadGender = updatedBody.leadGender !== undefined ? updatedBody.leadGender : current.leadGender;
  const member1Gender = updatedBody.member1Gender !== undefined ? updatedBody.member1Gender : current.member1Gender;
  const member2Gender = updatedBody.member2Gender !== undefined ? updatedBody.member2Gender : current.member2Gender;
  const member3Gender = updatedBody.member3Gender !== undefined ? updatedBody.member3Gender : current.member3Gender;
  const member4Gender = updatedBody.member4Gender !== undefined ? updatedBody.member4Gender : current.member4Gender;
  const member5Gender = updatedBody.member5Gender !== undefined ? updatedBody.member5Gender : current.member5Gender;

  const calculatedHasFemale = 
    (leadGender || "").toLowerCase() === "female" ||
    (member1Gender || "").toLowerCase() === "female" ||
    (member2Gender || "").toLowerCase() === "female" ||
    (member3Gender || "").toLowerCase() === "female" ||
    (member4Gender || "").toLowerCase() === "female" ||
    (member5Gender || "").toLowerCase() === "female";

  let pptFileUrl = current.pptFileUrl || "";
  if (updatedBody.pptBase64 && typeof updatedBody.pptBase64 === "string" && updatedBody.pptBase64.startsWith("data:")) {
    const safePptName = updatedBody.pptFileName || current.pptFileName || `${current.teamName || "team"}_presentation.pptx`;
    const savedPpt = saveBase64File(updatedBody.pptBase64, "ppts", safePptName);
    if (savedPpt) {
      pptFileUrl = savedPpt.url;
    }
  }

  const updated = {
    ...current,
    ...req.body,
    pptFileUrl: pptFileUrl || current.pptFileUrl,
    hasFemaleMember: calculatedHasFemale,
    id: current.id, // cannot modify id
    registrationId: current.registrationId // cannot modify registrationId
  };

  registrations[idx] = updated;
  writeRegistrations(registrations);

  // Sync to external DB in the background
  syncRegistrationToExternalDB(updated).catch(err => {
    console.error("Failed to sync updated registration to external DB in background:", err);
  });

  res.json({ success: true, registration: updated });
});

// POST verify manual UPI payment (Admin / Dept SPOC / Student SPOC)
app.post("/api/registrations/:id/verify-manual-payment", authorize(["ADMIN", "DEPT_SPOC", "STUDENT_SPOC"]), validateParams(singleIdParamSchema), (req, res) => {
  const { id } = req.params;
  const { action, remarks } = req.body; // action: "approve" | "reject"

  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "Action must be either 'approve' or 'reject'." });
  }

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found" });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(registrations[idx].leadDepartment, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You are only permitted to verify teams in your department (${adminDept}).` });
  }

  const current = registrations[idx];
  const settings = readSettings();
  const verifierName = (req as any).adminUser?.name || (req as any).adminUser?.username || userRole;

  if (action === "approve") {
    current.paymentStatus = "paid";
    current.amountPaid = settings.feeAmount || current.amountPaid || 0;
    current.paymentVerifiedBy = verifierName;
    current.paymentVerifiedAt = new Date().toISOString();
    current.paymentRemarks = remarks || "UPI payment verified & approved.";
  } else {
    current.paymentStatus = "rejected";
    current.paymentRemarks = remarks || "Payment proof could not be verified. Please re-upload a clear transaction screenshot or UTR number.";
    current.paymentVerifiedBy = verifierName;
    current.paymentVerifiedAt = new Date().toISOString();
  }

  registrations[idx] = current;
  writeRegistrations(registrations);

  // Sync to external DB in background
  syncRegistrationToExternalDB(current).catch(err => {
    console.error("Failed to sync verified registration to external DB in background:", err);
  });

  // Send status update notification email to team
  if (current.studentEmail) {
    const isApproved = action === "approve";
    const statusSubject = isApproved
      ? `Payment Verified & Registration Approved - Team ${current.teamName}`
      : `Payment Verification Update - Action Required for Team ${current.teamName}`;

    const statusHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: ${isApproved ? '#dcfce7' : '#fee2e2'}; color: ${isApproved ? '#166534' : '#991b1b'}; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
            ${isApproved ? 'Payment Approved' : 'Payment Needs Revision'}
          </span>
          <h2 style="color: #4f46e5; margin-top: 12px; margin-bottom: 4px; font-size: 20px; font-weight: bold;">Smart India Hackathon 2026</h2>
          <p style="font-size: 14px; color: #64748b; margin-top: 0;">SVEC Campus Hackathon</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 18px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0f172a;">Team: ${current.teamName} (${current.registrationId})</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;"><strong>Status:</strong> ${isApproved ? 'Verified & Approved' : 'Payment Proof Rejected'}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;"><strong>Verified By:</strong> ${verifierName}</p>
          ${remarks ? `<p style="margin: 0; font-size: 13px; color: #334155;"><strong>Coordinator Remarks:</strong> ${remarks}</p>` : ''}
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          ${isApproved 
            ? 'Your payment screenshot has been verified by the coordinator. Your team is officially registered for the hackathon.' 
            : 'Your payment proof could not be verified. Please log into the Student Portal to check the remarks and upload a clear screenshot of your transaction.'}
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">SVEC Smart India Hackathon Portal</p>
      </div>
    `;

    sendEmail(current.studentEmail, statusSubject, statusHtml).catch(err => {
      console.error("Failed to dispatch payment status email:", err);
    });
  }

  return res.json({
    success: true,
    message: action === "approve" ? "Manual payment verified and registration approved!" : "Payment marked as rejected.",
    registration: current
  });
});

// DELETE a registration (Super Admin SPOC & Dept SPOC for department teams)
app.delete("/api/registrations/:id", authorize(["ADMIN", "DEPT_SPOC"]), validateParams(singleIdParamSchema), (req, res) => {
  const { id } = req.params;
  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found" });
  }

  const userRole = (req as any).userRole;
  const adminDept = (req as any).adminDepartment;
  if (userRole === "DEPT_SPOC" && adminDept && !isDepartmentMatch(registrations[idx].leadDepartment, adminDept)) {
    return res.status(403).json({ error: `Access Denied: You are only permitted to delete teams in your department (${adminDept}).` });
  }

  const filtered = registrations.filter(r => r.id !== id);

  writeRegistrations(filtered);
  res.json({ success: true, message: "Registration deleted successfully" });
});


// ------------------- LANDING PAGE & CUSTOM MENUS ENDPOINTS -------------------

// 1. GET Homepage content (Public)
app.get("/api/homepage", async (req, res) => {
  const content = await db.getHomepageContent();
  res.json(content);
});

// 2. POST Save Homepage content (Admin SPOC only)
app.post("/api/homepage", authorize(["ADMIN"]), validateBody(homepageContentSchema), (req, res) => {
  const content = req.body as HomepageContent;
  writeHomepage(content);
  res.json({ success: true, message: "Homepage details updated successfully!", content });
});

// Live Updates Endpoints (Public & Admin)
app.get("/api/updates", async (req, res) => {
  const updates = await db.getLiveUpdates();
  res.json(updates);
});

app.post("/api/updates", authorize(["ADMIN"]), validateBody(updatesArraySchema), (req, res) => {
  const updates = req.body;
  writeUpdates(updates);
  res.json({ success: true, message: "Live updates updated successfully!", updates });
});

// 3. GET Custom dynamic pages list (Public)
app.get("/api/custom-pages", async (req, res) => {
  const pages = await db.getCustomPages();
  res.json(pages);
});

// 4. POST Save/Create/Update Custom dynamic page (Admin SPOC only)
app.post("/api/custom-pages", authorize(["ADMIN"]), validateBody(customPageSchema), (req, res) => {
  const pageInput = req.body as Partial<CustomPage>;

  const slug = (pageInput.slug || "").trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  if (!slug) {
    return res.status(400).json({ error: "Invalid page slug." });
  }

  const pages = readCustomPages();
  const existingIndex = pages.findIndex(p => p.id === pageInput.id || p.slug === slug);

  const updatedPage: CustomPage = {
    id: pageInput.id || Date.now().toString(),
    title: (pageInput.title || "").trim(),
    slug,
    content: pageInput.content || "",
    published: pageInput.published !== undefined ? pageInput.published : true,
    createdAt: pageInput.createdAt || new Date().toISOString()
  };

  if (existingIndex !== -1) {
    // Check if we are updating another page with the same slug
    if (pages[existingIndex].id !== updatedPage.id) {
      return res.status(400).json({ error: "Another page with this slug already exists." });
    }
    pages[existingIndex] = updatedPage;
  } else {
    pages.push(updatedPage);
  }

  writeCustomPages(pages);
  res.json({ success: true, message: "Custom page saved successfully!", page: updatedPage });
});

// 5. DELETE Custom dynamic page (Admin SPOC only)
app.delete("/api/custom-pages/:id", authorize(["ADMIN"]), validateParams(singleIdParamSchema), (req, res) => {
  const { id } = req.params;
  const pages = readCustomPages();
  const filtered = pages.filter(p => p.id !== id);

  if (filtered.length === pages.length) {
    return res.status(404).json({ error: "Custom page not found." });
  }

  writeCustomPages(filtered);
  res.json({ success: true, message: "Custom page deleted successfully!" });
});

// 6. GET Navigation menu items (Public)
app.get("/api/menu", async (req, res) => {
  const items = await db.getMenuItems();
  res.json(items);
});

// 7. POST Save Navigation menu items configuration (Admin SPOC only)
app.post("/api/menu", authorize(["ADMIN"]), validateBody(menuItemsArraySchema), (req, res) => {
  const items = req.body as MenuItem[];
  writeMenuItems(items);
  res.json({ success: true, message: "Navigation menu configuration updated successfully!", menu: items });
});

// Centralized API 404 handler for undefined /api/* endpoints
app.all("/api/*", notFoundHandler);

// Centralized Express Error Handling Middleware for all application errors
app.use(errorHandler);


// ------------------- VITE OR STATIC FRONTEND -------------------

async function startServer() {
  // Validate critical security secrets and JWT configuration at boot
  validateAuthStartup();

  // Initialize and connect database on startup
  try {
    const settings = readSettings();
    await db.init(settings);
    
    // If DB is actively connected, await full state restore during boot
    if (db.isPostgres() || db.isMongo()) {
      try {
        await restoreDataFromExternalDB();
      } catch (err: any) {
        console.warn("[Startup DB Restore Notice]:", err?.message || err);
      }
    }

    // Auto-restore and hydrate all persistent images, documents, and PPT presentations from database to disk
    await db.syncAllFilesToDisk();
  } catch (dbErr) {
    console.error("[Database Startup Initialization Error]:", dbErr);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!IS_VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

startServer();

export default app;
