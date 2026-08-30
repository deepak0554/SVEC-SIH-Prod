import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Razorpay from "razorpay";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { ProblemStatement, Registration, Student, FeeConfig, HomepageContent, CustomPage, MenuItem } from "./src/types";
import { db, TeamEvaluation, defaultCriteria, defaultStatements } from "./server/db";

const JWT_SECRET = process.env.JWT_SECRET || "svec_sih_hackathon_jwt_secret_2026";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "50mb" })); // Allow larger payloads for base64 images/PPT

// Ensure data directory and file uploads storage exist
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = process.env.DATA_DIR || (IS_VERCEL ? "/tmp/svec_data" : path.join(process.cwd(), "data"));
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const UPLOADS_PPTS_DIR = path.join(UPLOADS_DIR, "ppts");
const UPLOADS_IMAGES_DIR = path.join(UPLOADS_DIR, "images");
const UPLOADS_DOCS_DIR = path.join(UPLOADS_DIR, "documents");
const UPLOADS_SAMPLE_PPTS_DIR = path.join(UPLOADS_DIR, "sample_ppts");

// Ensure all persistent storage directories exist
[DATA_DIR, UPLOADS_DIR, UPLOADS_PPTS_DIR, UPLOADS_IMAGES_DIR, UPLOADS_DOCS_DIR, UPLOADS_SAMPLE_PPTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploads statically directly from server disk
app.use("/api/uploads", express.static(UPLOADS_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

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

// Helper to decode and save base64 files (images, PPTs, templates) directly to server disk
function saveBase64File(
  base64Data: string,
  category: "ppts" | "images" | "documents" | "sample_ppts",
  suggestedName?: string
): { url: string; filename: string; size: number; relativePath: string } | null {
  if (!base64Data || typeof base64Data !== "string") return null;

  try {
    let cleanBase64 = base64Data.trim();
    let ext = ".bin";

    // Detect MIME type and extension if Data URL
    if (cleanBase64.startsWith("data:")) {
      const match = cleanBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        const mime = match[1].toLowerCase();
        if (mime.includes("presentation") || mime.includes("powerpoint") || mime.includes("pptx")) ext = ".pptx";
        else if (mime.includes("pdf")) ext = ".pdf";
        else if (mime.includes("png")) ext = ".png";
        else if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";
        else if (mime.includes("webp")) ext = ".webp";
        else if (mime.includes("gif")) ext = ".gif";
        else if (mime.includes("svg")) ext = ".svg";
        cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, "");
      }
    }

    if (suggestedName) {
      const parsedExt = path.extname(suggestedName);
      if (parsedExt) ext = parsedExt;
    }

    const safeBaseName = (suggestedName ? path.basename(suggestedName, ext) : "file")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);

    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${safeBaseName}${ext}`;
    const targetDir = path.join(UPLOADS_DIR, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, uniqueFilename);
    const buffer = Buffer.from(cleanBase64, "base64");
    fs.writeFileSync(targetPath, buffer);

    const relativeUrl = `/api/uploads/${category}/${encodeURIComponent(uniqueFilename)}`;
    return {
      url: relativeUrl,
      filename: uniqueFilename,
      size: buffer.length,
      relativePath: `/uploads/${category}/${uniqueFilename}`
    };
  } catch (err) {
    console.error(`[Upload Storage Error] Failed to save base64 file to ${category}:`, err);
    return null;
  }
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

// Helpers to read/write files
function readCriteria(): any[] {
  try {
    const data = fs.readFileSync(CRITERIA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return defaultCriteria;
  }
}

function writeCriteria(criteria: any[]) {
  fs.writeFileSync(CRITERIA_FILE, JSON.stringify(criteria, null, 2), "utf-8");
  syncMetadataToExternalDB("evaluation_criteria", criteria).catch(err => {
    console.error("Failed to sync evaluation criteria to DB:", err);
  });
}
function readStatements(): ProblemStatement[] {
  try {
    const data = fs.readFileSync(STATEMENTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return defaultStatements;
  }
}

function writeStatements(statements: ProblemStatement[]) {
  fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(statements, null, 2), "utf-8");
  syncMetadataToExternalDB("problem_statements", statements).catch(err => {
    console.error("Failed to sync problem statements to DB:", err);
  });
}

function readRegistrations(): Registration[] {
  try {
    const data = fs.readFileSync(REGISTRATIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeRegistrations(registrations: Registration[]) {
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2), "utf-8");
  const settings = readSettings();
  if (settings.dbEnabled && settings.dbType !== "none") {
    Promise.all(registrations.map(r => syncRegistrationToExternalDB(r))).catch(err => {
      console.error("Failed to sync registrations batch to external DB:", err);
    });
  }
}

function readStudents(): Student[] {
  try {
    const data = fs.readFileSync(STUDENTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeStudents(students: Student[]) {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), "utf-8");
  syncMetadataToExternalDB("students", students).catch(err => {
    console.error("Failed to sync students to DB:", err);
  });
}

function readHomepage(): HomepageContent {
  try {
    const data = fs.readFileSync(HOMEPAGE_FILE, "utf-8");
    const parsed = JSON.parse(data) as HomepageContent;
    if (!parsed.patrons) {
      parsed.patrons = [
        { id: "p1", name: "Sri G. Satyanarayana", position: "President", imageUrl: "" },
        { id: "p2", name: "Sri Ch. V. V. Subba Rao", position: "Secretary", imageUrl: "" },
        { id: "p3", name: "Sri K. Venkateswara Rao", position: "Technical Director", imageUrl: "" },
        { id: "p4", name: "Dr. Ch. Rambabu", position: "Principal", imageUrl: "" }
      ];
      fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }
    return parsed;
  } catch (err) {
    return defaultHomepageContent;
  }
}

function writeHomepage(content: HomepageContent) {
  const processed = processHomepageImages(content);
  fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(processed, null, 2), "utf-8");
  syncMetadataToExternalDB("homepage_content", processed).catch(err => {
    console.error("Failed to sync homepage content to DB:", err);
  });
}

function readUpdates(): any[] {
  try {
    const data = fs.readFileSync(UPDATES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return [
      { id: "1", text: "Registrations are now open for Sri Vasavi Internal Hackathon 2026!", createdAt: new Date().toISOString(), isImportant: true },
      { id: "2", text: "Important: Every team must have at least one female member.", createdAt: new Date().toISOString(), isImportant: false },
      { id: "3", text: "All teams must submit their abstract PPT before the deadline.", createdAt: new Date().toISOString(), isImportant: false }
    ];
  }
}

function writeUpdates(updates: any[]) {
  fs.writeFileSync(UPDATES_FILE, JSON.stringify(updates, null, 2), "utf-8");
  syncMetadataToExternalDB("live_updates", updates).catch(err => {
    console.error("Failed to sync live updates to DB:", err);
  });
}

function readCustomPages(): CustomPage[] {
  try {
    const data = fs.readFileSync(PAGES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return defaultCustomPages;
  }
}

function writeCustomPages(pages: CustomPage[]) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2), "utf-8");
  syncMetadataToExternalDB("custom_pages", pages).catch(err => {
    console.error("Failed to sync custom pages to DB:", err);
  });
}

function readMenuItems(): MenuItem[] {
  try {
    const data = fs.readFileSync(MENU_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return defaultMenuItems;
  }
}

function writeMenuItems(items: MenuItem[]) {
  fs.writeFileSync(MENU_FILE, JSON.stringify(items, null, 2), "utf-8");
  syncMetadataToExternalDB("menu_items", items).catch(err => {
    console.error("Failed to sync menu items to DB:", err);
  });
}


function readSettings(): FeeConfig {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    return {
      feeEnabled: parsed.feeEnabled ?? false,
      feeAmount: parsed.feeAmount ?? 499,
      razorpayKeyId: parsed.razorpayKeyId ?? "",
      razorpayKeySecret: parsed.razorpayKeySecret ?? "",
      jwtEnabled: parsed.jwtEnabled ?? false,
      emailEnabled: parsed.emailEnabled ?? false,
      smtpHost: parsed.smtpHost ?? "",
      smtpPort: parsed.smtpPort ?? 587,
      smtpUser: parsed.smtpUser ?? "",
      smtpPass: parsed.smtpPass ?? "",
      smtpFrom: parsed.smtpFrom ?? "",
      portalTheme: parsed.portalTheme ?? "light",
      logoUrl: parsed.logoUrl ?? "",
      portalTitle: parsed.portalTitle ?? "SVEC - SIH Internal Hackathon 2026",
      portalCaption: parsed.portalCaption ?? "Sri Vasavi Engineering College",
      teamMembersCount: parsed.teamMembersCount ?? 5,
      genderDiversityRequired: parsed.genderDiversityRequired ?? true,

      // SMS config
      smsEnabled: parsed.smsEnabled ?? false,
      smsProvider: parsed.smsProvider ?? "twilio",
      twilioSid: parsed.twilioSid ?? "",
      twilioAuthToken: parsed.twilioAuthToken ?? "",
      twilioFrom: parsed.twilioFrom ?? "",
      msg91AuthKey: parsed.msg91AuthKey ?? "",
      msg91SenderId: parsed.msg91SenderId ?? "",
      msg91Route: parsed.msg91Route ?? "4",
      smsCustomUrl: parsed.smsCustomUrl ?? "",
      smsCustomMethod: parsed.smsCustomMethod ?? "POST",
      smsCustomHeaders: parsed.smsCustomHeaders ?? "",
      smsCustomPayload: parsed.smsCustomPayload ?? "",

      // WhatsApp config
      whatsappEnabled: parsed.whatsappEnabled ?? false,
      whatsappProvider: parsed.whatsappProvider ?? "meta",
      whatsappAccessToken: parsed.whatsappAccessToken ?? "",
      whatsappPhoneId: parsed.whatsappPhoneId ?? "",
      whatsappWabaId: parsed.whatsappWabaId ?? "",
      whatsappCustomUrl: parsed.whatsappCustomUrl ?? "",
      whatsappCustomMethod: parsed.whatsappCustomMethod ?? "POST",
      whatsappCustomHeaders: parsed.whatsappCustomHeaders ?? "",
      whatsappCustomPayload: parsed.whatsappCustomPayload ?? "",

      // External DB config
      dbEnabled: parsed.dbEnabled ?? false,
      dbType: parsed.dbType ?? "none",
      dbHost: parsed.dbHost ?? "",
      dbPort: parsed.dbPort !== undefined ? Number(parsed.dbPort) : undefined,
      dbName: parsed.dbName ?? "",
      dbUsername: parsed.dbUsername ?? "",
      dbPassword: parsed.dbPassword ?? "",
      dbCollectionOrTable: parsed.dbCollectionOrTable ?? "registrations",
      dbStatus: parsed.dbStatus ?? "Not Connected",

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
      samplePptDescription: parsed.samplePptDescription ?? "Official SIH 2026 SVEC Presentation Format (8 Slides: Problem, Proposed Solution, Tech Stack, Feasibility, Architecture, Milestones, Budget, Team)."
    };
  } catch (err) {
    return {
      feeEnabled: false,
      feeAmount: 499,
      razorpayKeyId: "",
      razorpayKeySecret: "",
      jwtEnabled: false,
      emailEnabled: false,
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPass: "",
      smtpFrom: "",
      portalTheme: "light",
      logoUrl: "",
      portalTitle: "SVEC - SIH Internal Hackathon 2026",
      portalCaption: "Sri Vasavi Engineering College",
      teamMembersCount: 5,
      genderDiversityRequired: true,

      smsEnabled: false,
      smsProvider: "twilio",
      twilioSid: "",
      twilioAuthToken: "",
      twilioFrom: "",
      msg91AuthKey: "",
      msg91SenderId: "",
      msg91Route: "4",
      smsCustomUrl: "",
      smsCustomMethod: "POST",
      smsCustomHeaders: "",
      smsCustomPayload: "",

      whatsappEnabled: false,
      whatsappProvider: "meta",
      whatsappAccessToken: "",
      whatsappPhoneId: "",
      whatsappWabaId: "",
      whatsappCustomUrl: "",
      whatsappCustomMethod: "POST",
      whatsappCustomHeaders: "",
      whatsappCustomPayload: "",

      dbEnabled: false,
      dbType: "none",
      dbHost: "",
      dbPort: undefined,
      dbName: "",
      dbUsername: "",
      dbPassword: "",
      dbCollectionOrTable: "registrations",
      dbStatus: "Not Connected",

      lockStudentUpdates: false,
      lockRegisterAnotherTeam: false,
      enableCertificates: false,
      certificateTitle: "CERTIFICATE OF PARTICIPATION",
      certificateSubtitle: "This is proudly presented to",
      certificateBody: "for outstanding participation in the SVEC Smart India Hackathon 2026 Internal Hackathon. Their team demonstrated outstanding design, creative technical engineering, and dedicated problem-solving skills in developing solutions for high-impact challenges.",
      certificateSignatory1Name: "Dr. Ch. Rambabu",
      certificateSignatory1Title: "Principal & Chairman, SVEC",
      certificateSignatory2Name: "Dr. K. Shirin Bhanu",
      certificateSignatory2Title: "SIH College SPOC & Convenor",
      certificateSignatories: [
        { id: "sig-1", name: "Dr. Ch. Rambabu", title: "Principal & Chairman, SVEC" },
        { id: "sig-2", name: "Dr. K. Shirin Bhanu", title: "SIH College SPOC & Convenor" }
      ],
      certificateBgType: "classic",
      certificateBgUrl: "",
      certificateBorderColor: "#4f46e5",
      certificateDateText: "July 17, 2026",
      creditsTitle: "Department of CSE",
      creditsContent: "### Department of Computer Science & Engineering\n\nSri Vasavi Engineering College has spearheaded this Internal Hackathon Portal to encourage real-world problem solving among students.\n\n**Mentorship Team:** Department Faculty\n**Student Contributors:** CSE Batch 2026",
      creditsEnabled: true,

      // Sample PPT defaults
      samplePptEnabled: true,
      samplePptUrl: "",
      samplePptFileName: "",
      samplePptFileBase64: "",
      samplePptDescription: "Official SIH 2026 SVEC Presentation Format (8 Slides: Problem, Proposed Solution, Tech Stack, Feasibility, Architecture, Milestones, Budget, Team)."
    };
  }
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

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2), "utf-8");
  if (updatedSettings.dbEnabled) {
    syncSettingsToExternalDB(updatedSettings).catch(err => {
      console.error("Failed to sync settings to external DB on write:", err);
    });
    // Trigger dynamic metadata sync in background to keep all portal configurations updated in DB
    syncMetadataToExternalDB("problem_statements", readStatements()).catch(err => {
      console.error("Failed to sync problem statements to DB on settings write:", err);
    });
    syncMetadataToExternalDB("homepage_content", readHomepage()).catch(err => {
      console.error("Failed to sync homepage content to DB on settings write:", err);
    });
    syncMetadataToExternalDB("custom_pages", readCustomPages()).catch(err => {
      console.error("Failed to sync custom pages to DB on settings write:", err);
    });
    syncMetadataToExternalDB("menu_items", readMenuItems()).catch(err => {
      console.error("Failed to sync menu items to DB on settings write:", err);
    });
  }
}

// Sync app settings dynamically to configured external MongoDB or SQL
async function syncSettingsToExternalDB(settings: FeeConfig): Promise<{ success: boolean; error?: string }> {
  if (!settings.dbEnabled || settings.dbType === "none") {
    return { success: true };
  }

  const { dbType, dbHost, dbPort, dbName, dbUsername, dbPassword } = settings;

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
      const collection = db.collection("app_settings");
      
      // Upsert document based on id "system_settings"
      await collection.updateOne(
        { id: "system_settings" },
        { $set: { id: "system_settings", ...settings, updatedAt: new Date().toISOString() } },
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

      // Create table query to ensure it exists
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS app_settings (
          id VARCHAR(255) PRIMARY KEY,
          settings_json TEXT
        );
      `;
      await client.query(createTableSql);

      const insertSql = `
        INSERT INTO app_settings (id, settings_json)
        VALUES ('system_settings', $1)
        ON CONFLICT (id) DO UPDATE SET settings_json = EXCLUDED.settings_json;
      `;
      await client.query(insertSql, [JSON.stringify(settings)]);
      await client.end();
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[External DB Error] Sync failed for app settings:`, err);
    return { success: false, error: err.message };
  }
}

// Sync app metadata dynamically to configured external MongoDB or SQL
async function syncMetadataToExternalDB(key: string, data: any): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  if (!settings.dbEnabled || settings.dbType === "none") {
    return { success: true };
  }

  const { dbType, dbHost, dbPort, dbName, dbUsername, dbPassword } = settings;

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
      const collection = db.collection("app_metadata");
      
      // Upsert document based on key
      await collection.updateOne(
        { id: key },
        { $set: { id: key, data: data, updatedAt: new Date().toISOString() } },
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

      // Create table query to ensure it exists
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS app_metadata (
          id VARCHAR(255) PRIMARY KEY,
          metadata_json TEXT
        );
      `;
      await client.query(createTableSql);

      const insertSql = `
        INSERT INTO app_metadata (id, metadata_json)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET metadata_json = EXCLUDED.metadata_json;
      `;
      await client.query(insertSql, [key, JSON.stringify(data)]);
      await client.end();
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[External DB Error] Sync failed for app metadata (${key}):`, err);
    return { success: false, error: err.message };
  }
}


// Sync single registration dynamically to configured external MongoDB or SQL
async function syncRegistrationToExternalDB(registration: Registration): Promise<{ success: boolean; error?: string }> {
  const settings = readSettings();
  if (!settings.dbEnabled || settings.dbType === "none") {
    return { success: true };
  }

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

      // Create table query to ensure it exists
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          id VARCHAR(255) PRIMARY KEY,
          registration_id VARCHAR(255),
          team_name VARCHAR(255),
          lead_name VARCHAR(255),
          lead_department VARCHAR(255),
          lead_mobile VARCHAR(20),
          lead_gender VARCHAR(50),
          member1 VARCHAR(255),
          member1_gender VARCHAR(50),
          member1_email VARCHAR(255),
          member1_phone VARCHAR(20),
          member2 VARCHAR(255),
          member2_gender VARCHAR(50),
          member2_email VARCHAR(255),
          member2_phone VARCHAR(20),
          member3 VARCHAR(255),
          member3_gender VARCHAR(50),
          member3_email VARCHAR(255),
          member3_phone VARCHAR(20),
          member4 VARCHAR(255),
          member4_gender VARCHAR(50),
          member4_email VARCHAR(255),
          member4_phone VARCHAR(20),
          member5 VARCHAR(255),
          member5_gender VARCHAR(50),
          member5_email VARCHAR(255),
          member5_phone VARCHAR(20),
          has_female_member BOOLEAN,
          mentor_name VARCHAR(255),
          problem_statement_id VARCHAR(255),
          submitted_at VARCHAR(255),
          student_email VARCHAR(255),
          payment_status VARCHAR(50),
          payment_id VARCHAR(255),
          order_id VARCHAR(255),
          amount_paid INT,
          abstract TEXT,
          implementation_steps TEXT,
          ppt_file_name VARCHAR(255),
          ppt_base64 TEXT,
          proposal_status VARCHAR(50)
        );
      `;
      await client.query(createTableSql);

      const insertSql = `
        INSERT INTO ${tableName} (
          id, registration_id, team_name, lead_name, lead_department, lead_mobile, lead_gender,
          member1, member1_gender, member1_email, member1_phone,
          member2, member2_gender, member2_email, member2_phone,
          member3, member3_gender, member3_email, member3_phone,
          member4, member4_gender, member4_email, member4_phone,
          member5, member5_gender, member5_email, member5_phone,
          has_female_member, mentor_name, problem_statement_id, submitted_at, student_email,
          payment_status, payment_id, order_id, amount_paid, abstract, implementation_steps,
          ppt_file_name, ppt_base64, proposal_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, $26, $27,
          $28, $29, $30, $31, $32,
          $33, $34, $35, $36, $37, $38,
          $39, $40, $41
        ) ON CONFLICT (id) DO UPDATE SET
          registration_id = EXCLUDED.registration_id,
          team_name = EXCLUDED.team_name,
          lead_name = EXCLUDED.lead_name,
          lead_department = EXCLUDED.lead_department,
          lead_mobile = EXCLUDED.lead_mobile,
          lead_gender = EXCLUDED.lead_gender,
          member1 = EXCLUDED.member1,
          member1_gender = EXCLUDED.member1_gender,
          member1_email = EXCLUDED.member1_email,
          member1_phone = EXCLUDED.member1_phone,
          member2 = EXCLUDED.member2,
          member2_gender = EXCLUDED.member2_gender,
          member2_email = EXCLUDED.member2_email,
          member2_phone = EXCLUDED.member2_phone,
          member3 = EXCLUDED.member3,
          member3_gender = EXCLUDED.member3_gender,
          member3_email = EXCLUDED.member3_email,
          member3_phone = EXCLUDED.member3_phone,
          member4 = EXCLUDED.member4,
          member4_gender = EXCLUDED.member4_gender,
          member4_email = EXCLUDED.member4_email,
          member4_phone = EXCLUDED.member4_phone,
          member5 = EXCLUDED.member5,
          member5_gender = EXCLUDED.member5_gender,
          member5_email = EXCLUDED.member5_email,
          member5_phone = EXCLUDED.member5_phone,
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
          ppt_base64 = EXCLUDED.ppt_base64,
          proposal_status = EXCLUDED.proposal_status
      `;

      const values = [
        registration.id,
        registration.registrationId,
        registration.teamName,
        registration.leadName,
        registration.leadDepartment,
        registration.leadMobile,
        registration.leadGender || "",
        registration.member1 || "",
        registration.member1Gender || "",
        registration.member1Email || "",
        registration.member1Phone || "",
        registration.member2 || "",
        registration.member2Gender || "",
        registration.member2Email || "",
        registration.member2Phone || "",
        registration.member3 || "",
        registration.member3Gender || "",
        registration.member3Email || "",
        registration.member3Phone || "",
        registration.member4 || "",
        registration.member4Gender || "",
        registration.member4Email || "",
        registration.member4Phone || "",
        registration.member5 || "",
        registration.member5Gender || "",
        registration.member5Email || "",
        registration.member5Phone || "",
        registration.hasFemaleMember,
        registration.mentorName,
        registration.problemStatementId,
        registration.submittedAt,
        registration.studentEmail || "",
        registration.paymentStatus || "free",
        registration.paymentId || "",
        registration.orderId || "",
        registration.amountPaid !== undefined ? registration.amountPaid : null,
        registration.abstract || "",
        registration.implementationSteps || "",
        registration.pptFileName || "",
        registration.pptBase64 || "",
        registration.proposalStatus || "saved"
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
async function restoreDataFromExternalDB(): Promise<{ success: boolean; message: string; counts?: any }> {
  const settings = readSettings();
  const dbType = settings.dbType || (process.env.MONGODB_URI ? "mongodb" : (process.env.DATABASE_URL || process.env.PG_HOST ? "sql" : "none"));
  
  if (!settings.dbEnabled && !process.env.DATABASE_URL && !process.env.MONGODB_URI && !process.env.PG_HOST) {
    return { success: false, message: "No external database configured or enabled." };
  }

  if (dbType === "none") {
    return { success: false, message: "Database type is set to none." };
  }

  try {
    const counts = { registrations: 0, students: 0, metadata: 0 };

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
      const db = client.db(settings.dbName || "svec_sih");

      // 1. Restore Registrations
      const regColl = db.collection(settings.dbCollectionOrTable || "registrations");
      const dbRegistrations = (await regColl.find({}).toArray()) as any[];
      if (dbRegistrations && dbRegistrations.length > 0) {
        const localRegs = readRegistrations();
        const localMap = new Map(localRegs.map(r => [r.id, r]));
        for (const reg of dbRegistrations) {
          const { _id, ...cleanReg } = reg;
          if (cleanReg.id) {
            // Restore PPT to disk if base64 exists and local file does not exist
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
        console.log(`[External DB] Restored ${mergedRegs.length} registrations from MongoDB.`);
      }

      // 2. Restore Students
      const studentColl = db.collection("students");
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
        console.log(`[External DB] Restored ${mergedStudents.length} students from MongoDB.`);
      }

      // 3. Restore Metadata (Problem statements, homepage, pages, criteria, menu)
      const metaColl = db.collection("app_metadata");
      const metaDocs = await metaColl.find({}).toArray();
      for (const doc of metaDocs) {
        if (doc.key === "problem_statements" && Array.isArray(doc.data)) {
          fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(doc.data, null, 2), "utf-8");
          counts.metadata++;
        } else if (doc.key === "homepage_content" && doc.data?.sihDetails) {
          fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(doc.data, null, 2), "utf-8");
          counts.metadata++;
        } else if (doc.key === "custom_pages" && Array.isArray(doc.data)) {
          fs.writeFileSync(PAGES_FILE, JSON.stringify(doc.data, null, 2), "utf-8");
          counts.metadata++;
        } else if (doc.key === "evaluation_criteria" && Array.isArray(doc.data)) {
          fs.writeFileSync(CRITERIA_FILE, JSON.stringify(doc.data, null, 2), "utf-8");
          counts.metadata++;
        } else if (doc.key === "menu_items" && Array.isArray(doc.data)) {
          fs.writeFileSync(MENU_FILE, JSON.stringify(doc.data, null, 2), "utf-8");
          counts.metadata++;
        }
      }

      await client.close();
      return { success: true, message: `Successfully restored data from MongoDB (${counts.registrations} registrations, ${counts.students} students).`, counts };

    } else if (dbType === "sql") {
      const { default: pg } = await import("pg");
      const clientConfig = process.env.DATABASE_URL 
        ? { connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false } }
        : {
            host: settings.dbHost,
            port: settings.dbPort || 5432,
            database: settings.dbName,
            user: settings.dbUsername,
            password: settings.dbPassword,
            ssl: (settings.dbHost?.includes("localhost") || settings.dbHost?.includes("127.0.0.1")) ? undefined : { rejectUnauthorized: false }
          };

      const client = new pg.Client(clientConfig);
      await client.connect();

      const tableName = settings.dbCollectionOrTable || "registrations";
      
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [tableName]);

      if (tableCheck.rows[0]?.exists) {
        const result = await client.query(`SELECT * FROM ${tableName}`);
        if (result.rows && result.rows.length > 0) {
          const localRegs = readRegistrations();
          const localMap = new Map(localRegs.map(r => [r.id, r]));
          for (const row of result.rows) {
            const mappedReg: Registration = {
              id: row.id,
              registrationId: row.registration_id,
              teamName: row.team_name,
              leadName: row.lead_name,
              leadDepartment: row.lead_department,
              leadMobile: row.lead_mobile,
              leadGender: row.lead_gender,
              member1: row.member1,
              member1Gender: row.member1_gender,
              member1Email: row.member1_email,
              member1Phone: row.member1_phone,
              member2: row.member2,
              member2Gender: row.member2_gender,
              member2Email: row.member2_email,
              member2Phone: row.member2_phone,
              member3: row.member3,
              member3Gender: row.member3_gender,
              member3Email: row.member3_email,
              member3Phone: row.member3_phone,
              member4: row.member4,
              member4Gender: row.member4_gender,
              member4Email: row.member4_email,
              member4Phone: row.member4_phone,
              member5: row.member5,
              member5Gender: row.member5_gender,
              member5Email: row.member5_email,
              member5Phone: row.member5_phone,
              hasFemaleMember: row.has_female_member,
              mentorName: row.mentor_name,
              problemStatementId: row.problem_statement_id,
              submittedAt: row.submitted_at,
              studentEmail: row.student_email,
              paymentStatus: row.payment_status,
              paymentId: row.payment_id,
              orderId: row.order_id,
              amountPaid: row.amount_paid,
              abstract: row.abstract,
              implementationSteps: row.implementation_steps,
              pptFileName: row.ppt_file_name,
              pptBase64: row.ppt_base64,
              proposalStatus: row.proposal_status
            };

            if (mappedReg.pptBase64) {
              const saved = saveBase64File(mappedReg.pptBase64, "ppts", mappedReg.pptFileName || `${mappedReg.teamName}_presentation.pptx`);
              if (saved) mappedReg.pptFileUrl = saved.url;
            }

            localMap.set(mappedReg.id, mappedReg);
          }
          const mergedRegs = Array.from(localMap.values());
          fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify(mergedRegs, null, 2), "utf-8");
          counts.registrations = mergedRegs.length;
          console.log(`[External DB] Restored ${mergedRegs.length} registrations from PostgreSQL.`);
        }
      }

      const metaCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'app_metadata'
        );
      `);

      if (metaCheck.rows[0]?.exists) {
        const metaRes = await client.query(`SELECT key, data_json FROM app_metadata`);
        for (const row of metaRes.rows) {
          try {
            const data = JSON.parse(row.data_json);
            if (row.key === "problem_statements" && Array.isArray(data)) {
              fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(data, null, 2), "utf-8");
              counts.metadata++;
            } else if (row.key === "homepage_content" && data?.sihDetails) {
              fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
              counts.metadata++;
            } else if (row.key === "custom_pages" && Array.isArray(data)) {
              fs.writeFileSync(PAGES_FILE, JSON.stringify(data, null, 2), "utf-8");
              counts.metadata++;
            } else if (row.key === "evaluation_criteria" && Array.isArray(data)) {
              fs.writeFileSync(CRITERIA_FILE, JSON.stringify(data, null, 2), "utf-8");
              counts.metadata++;
            } else if (row.key === "menu_items" && Array.isArray(data)) {
              fs.writeFileSync(MENU_FILE, JSON.stringify(data, null, 2), "utf-8");
              counts.metadata++;
            } else if (row.key === "students" && Array.isArray(data)) {
              fs.writeFileSync(STUDENTS_FILE, JSON.stringify(data, null, 2), "utf-8");
              counts.students = data.length;
            }
          } catch (e) {
            console.error(`Error parsing metadata ${row.key}:`, e);
          }
        }
      }

      await client.end();
      return { success: true, message: `Successfully restored data from PostgreSQL (${counts.registrations} registrations, ${counts.students} students).`, counts };
    }

    return { success: false, message: "Unknown database type." };
  } catch (err: any) {
    console.error("[External DB Restore Error]:", err);
    return { success: false, message: err.message };
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


// Student JWT authentication validation middleware
function validateStudentJWT(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
      (req as any).studentUser = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Your session has expired. Please log in again." });
    }
  }

  const settings = readSettings();
  if (settings.jwtEnabled) {
    return res.status(401).json({ error: "Missing or invalid authorization token" });
  }

  next();
}


// Admin passcode configuration (defaults to 'SIHAdmin2026')
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "SIHAdmin2026";
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");

interface AdminUser {
  username: string;
  passwordHash: string;
  role: "SPOC" | "Student SPOC" | "Evaluator";
}

let needsWrite = !fs.existsSync(ADMINS_FILE);
if (!needsWrite) {
  try {
    const existingAdmins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const hasDeepak = existingAdmins.some(a => a.username.toLowerCase() === "deepak0554");
    if (!hasDeepak) {
      needsWrite = true;
    }
  } catch (err) {
    needsWrite = true;
  }
}

if (needsWrite) {
  const defaultAdmins: AdminUser[] = [
    {
      username: "Deepak0554",
      passwordHash: crypto.createHash("sha256").update("SIH@2026").digest("hex"),
      role: "SPOC"
    },
    {
      username: "studentspoc",
      passwordHash: crypto.createHash("sha256").update("studpassword").digest("hex"),
      role: "Student SPOC"
    }
  ];
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(defaultAdmins, null, 2), "utf-8");
}

// Auth validation middleware
function validateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const passcode = req.headers["x-admin-passcode"] as string;
  if (!passcode) {
    return res.status(401).json({ error: "Unauthorized access code" });
  }

  // 1. Support master ADMIN_PASSCODE bypass
  if (passcode === ADMIN_PASSCODE) {
    (req as any).adminRole = "SPOC";
    (req as any).adminUser = "system_admin";
    return next();
  }

  // 2. Try verifying as signed JWT admin token
  try {
    const decoded = jwt.verify(passcode, JWT_SECRET) as { username: string; role: string; isAdmin: boolean };
    if (decoded && decoded.isAdmin) {
      (req as any).adminRole = decoded.role;
      (req as any).adminUser = decoded.username;
      return next();
    }
  } catch (err) {
    // If not a valid JWT token, fall back to old-style raw token check for seamless transition/session compatibility
  }

  // 3. Fallback: Old-style raw token compatibility check
  if (passcode.startsWith("ADMIN:")) {
    const parts = passcode.split(":");
    if (parts.length === 3) {
      const role = parts[1];
      const username = parts[2];
      try {
        const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
        const exists = admins.some(a => a.username.toLowerCase() === username.toLowerCase() && a.role === role);
        if (exists) {
          (req as any).adminRole = role;
          (req as any).adminUser = username;
          return next();
        }
      } catch (err) {
        console.error("Failed to read admins for validation:", err);
      }
    }
  }

  res.status(401).json({ error: "Unauthorized or invalid admin session" });
}

// ------------------- API ROUTES -------------------

// Upload files (Images, PPTs, Templates) directly to server storage
app.post("/api/upload", (req, res) => {
  const { data, category, filename } = req.body;
  if (!data || typeof data !== "string") {
    return res.status(400).json({ error: "Missing or invalid file data." });
  }

  const validCategory = (category === "ppts" || category === "images" || category === "sample_ppts" || category === "documents") 
    ? category 
    : "documents";

  const result = saveBase64File(data, validCategory, filename);
  if (!result) {
    return res.status(500).json({ error: "Failed to save file to server storage." });
  }

  res.json({ success: true, ...result });
});

// Stream or download team PPT presentation directly from server disk
app.get("/api/registrations/:id/ppt", (req, res) => {
  const { id } = req.params;
  const registrations = readRegistrations();
  const reg = registrations.find(r => r.id === id || r.registrationId === id);

  if (!reg) {
    return res.status(404).json({ error: "Registration not found." });
  }

  // 1. Check if stored on disk via pptFileUrl
  if (reg.pptFileUrl) {
    const filename = path.basename(reg.pptFileUrl);
    const category = reg.pptFileUrl.includes("/ppts/") ? "ppts" : "documents";
    const filePath = path.join(UPLOADS_DIR, category, filename);
    if (fs.existsSync(filePath)) {
      const downloadName = reg.pptFileName || `${reg.teamName || "team"}_presentation.pptx`;
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(downloadName)}"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      return res.sendFile(filePath);
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
app.post("/api/admin/restore-from-db", validateAdmin, async (req, res) => {
  const result = await restoreDataFromExternalDB();
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Admin: Export Full JSON State Backup
app.get("/api/admin/backup/export", validateAdmin, (req, res) => {
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
app.post("/api/admin/backup/import", validateAdmin, (req, res) => {
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
app.post("/api/auth/register", (req, res) => {
  const { email, password, gender, department, mobile } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();

  if (students.some(s => s.email === emailClean)) {
    return res.status(400).json({ error: "A student account with this email already exists." });
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
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

  const token = jwt.sign(
    { id: newStudent.id, email: newStudent.email },
    JWT_SECRET,
    { expiresIn: "1d" }
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
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();
  const student = students.find(s => s.email === emailClean);

  if (!student) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const incomingHash = crypto.createHash("sha256").update(password).digest("hex");
  if (incomingHash !== student.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign(
    { id: student.id, email: student.email },
    JWT_SECRET,
    { expiresIn: "1d" }
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
app.get("/api/settings/public", (req, res) => {
  const settings = readSettings();
  res.json({
    feeEnabled: settings.feeEnabled,
    feeAmount: settings.feeAmount,
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
    samplePptDescription: settings.samplePptDescription || ""
  });
});

// Admin Settings (private, requires passcode)
app.get("/api/settings", validateAdmin, (req, res) => {
  if ((req as any).adminRole === "Student SPOC") {
    return res.status(403).json({ error: "Access Denied: Student SPOC is not authorized to access system settings." });
  }
  const settings = readSettings();
  res.json(settings);
});

// Admin Update Settings
app.post("/api/settings", validateAdmin, (req, res) => {
  if ((req as any).adminRole === "Student SPOC") {
    return res.status(403).json({ error: "Access Denied: Student SPOC is not authorized to update system settings." });
  }
  const { 
    feeEnabled, 
    feeAmount, 
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
    samplePptDescription
  } = req.body;
  
  if (feeEnabled && (feeAmount === undefined || feeAmount < 0)) {
    return res.status(400).json({ error: "A valid fee amount is required when fee is enabled." });
  }

  const updated: FeeConfig = {
    feeEnabled: !!feeEnabled,
    feeAmount: Number(feeAmount) || 0,
    razorpayKeyId: (razorpayKeyId || "").trim(),
    razorpayKeySecret: (razorpayKeySecret || "").trim(),
    jwtEnabled: !!jwtEnabled,
    emailEnabled: !!emailEnabled,
    smtpHost: (smtpHost || "").trim(),
    smtpPort: Number(smtpPort) || 587,
    smtpUser: (smtpUser || "").trim(),
    smtpPass: (smtpPass || "").trim(),
    smtpFrom: (smtpFrom || "").trim(),
    portalTheme: (portalTheme || "light").trim() as any,
    logoUrl: (logoUrl || "").trim(),
    portalTitle: (portalTitle || "SVEC - SIH Internal Hackathon 2026").trim(),
    portalCaption: (portalCaption || "Sri Vasavi Engineering College").trim(),
    teamMembersCount: teamMembersCount !== undefined ? Number(teamMembersCount) : 5,
    genderDiversityRequired: genderDiversityRequired !== undefined ? !!genderDiversityRequired : true,

    // SMS properties
    smsEnabled: !!smsEnabled,
    smsProvider: (smsProvider || "twilio").trim() as any,
    twilioSid: (twilioSid || "").trim(),
    twilioAuthToken: (twilioAuthToken || "").trim(),
    twilioFrom: (twilioFrom || "").trim(),
    msg91AuthKey: (msg91AuthKey || "").trim(),
    msg91SenderId: (msg91SenderId || "").trim(),
    msg91Route: (msg91Route || "4").trim(),
    smsCustomUrl: (smsCustomUrl || "").trim(),
    smsCustomMethod: (smsCustomMethod || "POST").trim() as any,
    smsCustomHeaders: (smsCustomHeaders || "").trim(),
    smsCustomPayload: (smsCustomPayload || "").trim(),

    // WhatsApp properties
    whatsappEnabled: !!whatsappEnabled,
    whatsappProvider: (whatsappProvider || "meta").trim() as any,
    whatsappAccessToken: (whatsappAccessToken || "").trim(),
    whatsappPhoneId: (whatsappPhoneId || "").trim(),
    whatsappWabaId: (whatsappWabaId || "").trim(),
    whatsappCustomUrl: (whatsappCustomUrl || "").trim(),
    whatsappCustomMethod: (whatsappCustomMethod || "POST").trim() as any,
    whatsappCustomHeaders: (whatsappCustomHeaders || "").trim(),
    whatsappCustomPayload: (whatsappCustomPayload || "").trim(),

    // Database options
    dbEnabled: !!dbEnabled,
    dbType: (dbType || "none").trim() as any,
    dbHost: (dbHost || "").trim(),
    dbPort: dbPort !== undefined && dbPort !== "" ? Number(dbPort) : undefined,
    dbName: (dbName || "").trim(),
    dbUsername: (dbUsername || "").trim(),
    dbPassword: (dbPassword || "").trim(),
    dbCollectionOrTable: (dbCollectionOrTable || "registrations").trim(),
    dbStatus: (dbStatus || "Not Connected").trim(),

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
    certificateBgUrl: (certificateBgUrl || "").trim(),
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
    samplePptDescription: (samplePptDescription || "").trim()
  };

  writeSettings(updated);
  res.json({ success: true, settings: updated });
});

// Download/Redirect to Sample PPT Presentation File
app.get("/api/settings/sample-ppt/download", (req, res) => {
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
app.post("/api/settings/test-db", validateAdmin, async (req, res) => {
  if ((req as any).adminRole === "Student SPOC") {
    return res.status(403).json({ error: "Access Denied: Student SPOC is not authorized to configure system settings." });
  }

  const { dbType, dbHost, dbPort, dbName, dbUsername, dbPassword, dbCollectionOrTable } = req.body;

  if (!dbHost || !dbName) {
    return res.status(400).json({ error: "Host/Server URL and Database Name are required." });
  }

  try {
    const initResult = await db.init({
      dbEnabled: true,
      dbType,
      dbHost,
      dbPort,
      dbName,
      dbUsername,
      dbPassword,
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
      const settings = readSettings();
      settings.dbStatus = `Connection Failed: ${initResult.message}`;
      writeSettings(settings);
      return res.status(500).json({ error: initResult.message });
    }
  } catch (err: any) {
    const settings = readSettings();
    settings.dbStatus = `Connection Failed: ${err.message}`;
    writeSettings(settings);

    return res.status(500).json({ error: `Connection failed: ${err.message}. Please double check credentials, port and server reachability.` });
  }
});

// Broadcast Logging System
interface BroadcastLog {
  id: string;
  channel: "Email" | "SMS" | "WhatsApp";
  subject?: string;
  message: string;
  recipientGroup: string;
  recipientCount: number;
  timestamp: string;
  sender: string;
  status: "completed" | "failed" | "queued";
}

function readBroadcastLogs(): BroadcastLog[] {
  try {
    if (!fs.existsSync(BROADCAST_LOGS_FILE)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(BROADCAST_LOGS_FILE, "utf-8"));
  } catch (err) {
    return [];
  }
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
    fs.writeFileSync(BROADCAST_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing broadcast log:", err);
  }
}

// Get Admin Broadcast Logs
app.get("/api/admin/broadcast-logs", validateAdmin, (req, res) => {
  res.json(readBroadcastLogs());
});

// Admin/Student SPOC Bulk Broadcast SMS API
app.post("/api/admin/broadcast-sms", validateAdmin, async (req, res) => {
  const settings = readSettings();
  if (!settings.smsEnabled) {
    return res.status(400).json({ error: "SMS System is disabled. Please enable SMS notifications and configure your SMS Gateway credentials in the Settings tab before sending broadcasts." });
  }

  const { message, recipientGroup, testMobile } = req.body;
  if (!message || !recipientGroup) {
    return res.status(400).json({ error: "Message content and recipient group are required." });
  }

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
app.post("/api/admin/broadcast-whatsapp", validateAdmin, async (req, res) => {
  const settings = readSettings();
  if (!settings.whatsappEnabled) {
    return res.status(400).json({ error: "WhatsApp System is disabled. Please enable WhatsApp notifications and configure your WhatsApp Business API credentials in the Settings tab before sending broadcasts." });
  }

  const { templateName, variables, recipientGroup, testMobile } = req.body;
  if (!templateName || !recipientGroup) {
    return res.status(400).json({ error: "Template selection and recipient group are required." });
  }

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
app.post("/api/admin/broadcast-email", validateAdmin, async (req, res) => {
  const settings = readSettings();
  if (!settings.emailEnabled) {
    return res.status(400).json({ error: "Email System is disabled. Please enable email notifications and configure SMTP credentials in the Settings tab before sending broadcasts." });
  }

  const { subject, message, recipientGroup, testEmail } = req.body;
  if (!subject || !message || !recipientGroup) {
    return res.status(400).json({ error: "Subject, message and recipient group are required." });
  }

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

// Create Razorpay Order
app.post("/api/payments/create-order", async (req, res) => {
  try {
    const settings = readSettings();
    if (!settings.feeEnabled) {
      return res.status(400).json({ error: "Registration fee is currently disabled by administrator." });
    }

    if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
      return res.status(400).json({ error: "Razorpay payment credentials are not configured by the administrator." });
    }

    if (settings.razorpayKeyId === "rzp_test_mock") {
      return res.json({
        success: true,
        orderId: `order_mock_${Date.now()}`,
        amount: Math.round(settings.feeAmount * 100),
        currency: "INR",
        keyId: "rzp_test_mock"
      });
    }

    // Initialize Razorpay lazily
    const razorpayInstance = new Razorpay({
      key_id: settings.razorpayKeyId,
      key_secret: settings.razorpayKeySecret
    });

    const options = {
      amount: Math.round(settings.feeAmount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_sih_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: settings.razorpayKeyId
    });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ error: err.message || "Failed to create payment order" });
  }
});


// Admin login endpoint
app.post("/api/admin/login", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Username, password and role selection are required." });
  }

  try {
    const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const admin = admins.find(
      a => a.username.trim().toLowerCase() === username.trim().toLowerCase() && a.role === role
    );

    if (!admin) {
      return res.status(401).json({ error: "Invalid username, password, or role selection." });
    }

    const hash = crypto.createHash("sha256").update(password).digest("hex");
    if (hash !== admin.passwordHash) {
      return res.status(401).json({ error: "Invalid username, password, or role selection." });
    }

    const token = jwt.sign(
      { username: admin.username, role: admin.role, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      role: admin.role,
      username: admin.username
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
});

// Admin check passcode (keeps backward compatibility)
app.post("/api/admin/verify", (req, res) => {
  const { passcode } = req.body;
  if (!passcode) {
    return res.status(401).json({ error: "Passcode is required." });
  }

  if (passcode === ADMIN_PASSCODE) {
    return res.json({ success: true, role: "SPOC", username: "system_admin" });
  }

  // 1. Try verifying as signed JWT admin token
  try {
    const decoded = jwt.verify(passcode, JWT_SECRET) as { username: string; role: string; isAdmin: boolean };
    if (decoded && decoded.isAdmin) {
      return res.json({ success: true, role: decoded.role, username: decoded.username });
    }
  } catch (err) {
    // If not a valid JWT token, fall back to old-style raw token check for seamless transition/session compatibility
  }

  // 2. Fallback: Old-style raw token check
  if (passcode.startsWith("ADMIN:")) {
    const parts = passcode.split(":");
    if (parts.length === 3) {
      const role = parts[1];
      const username = parts[2];
      try {
        const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
        const exists = admins.some(a => a.username.toLowerCase() === username.toLowerCase() && a.role === role);
        if (exists) {
          return res.json({ success: true, role, username });
        }
      } catch (err) {
        console.error("Failed to read admins for verification check:", err);
      }
    }
  }

  res.status(401).json({ error: "Invalid passcode or admin session" });
});

// GET list of admins (Super Admin SPOC only)
app.get("/api/admin/manage-admins", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC (Super Admin) can manage admin accounts." });
  }
  try {
    const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const safeAdmins = admins.map(a => ({ username: a.username, role: a.role }));
    res.json(safeAdmins);
  } catch (err) {
    res.status(500).json({ error: "Failed to read admins list" });
  }
});

// POST a new admin (Super Admin SPOC only)
app.post("/api/admin/manage-admins", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC (Super Admin) can manage admin accounts." });
  }
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Username, password and role are required." });
  }

  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters long." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const exists = admins.some(a => a.username.toLowerCase() === cleanUsername.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Admin with this username already exists." });
    }

    const newAdmin: AdminUser = {
      username: cleanUsername,
      passwordHash: crypto.createHash("sha256").update(password).digest("hex"),
      role: (role === "SPOC" || role === "Student SPOC" || role === "Evaluator") ? role : "Student SPOC"
    };

    admins.push(newAdmin);
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), "utf-8");
    res.json({ success: true, message: `Admin ${cleanUsername} created successfully as ${role}.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to save new admin" });
  }
});

// DELETE an admin (Super Admin SPOC only)
app.delete("/api/admin/manage-admins/:username", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC (Super Admin) can manage admin accounts." });
  }
  const targetUsername = req.params.username.trim().toLowerCase();
  
  if (targetUsername === "deepak0554") {
    return res.status(400).json({ error: "Cannot delete the primary SPOC admin." });
  }

  const currentAdminUser = ((req as any).adminUser || "").toLowerCase();
  if (targetUsername === currentAdminUser) {
    return res.status(400).json({ error: "You cannot delete your own admin account while logged in." });
  }

  try {
    const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const filtered = admins.filter(a => a.username.toLowerCase() !== targetUsername);
    if (filtered.length === admins.length) {
      return res.status(404).json({ error: "Admin user not found." });
    }

    fs.writeFileSync(ADMINS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    res.json({ success: true, message: "Admin account removed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete admin" });
  }
});

// GET list of problem statements
app.get("/api/problem-statements", (req, res) => {
  res.json(readStatements());
});

// POST a new problem statement (Admin)
app.post("/api/problem-statements", validateAdmin, (req, res) => {
  const { code, title, category, organization } = req.body;
  if (!code || !title || !category || !organization) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const statements = readStatements();
  
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
  writeStatements(statements);
  res.status(201).json(newStatement);
});

// POST bulk upload problem statements (Admin)
app.post("/api/problem-statements/bulk", validateAdmin, (req, res) => {
  const { statements: newStatements, action } = req.body; // action: 'merge' or 'replace'
  
  if (!Array.isArray(newStatements)) {
    return res.status(400).json({ error: "Invalid data format. Expected an array of statements under 'statements'." });
  }

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

  const currentStatements = readStatements();
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

  writeStatements(finalStatements);
  res.json({ success: true, count: validated.length, total: finalStatements.length });
});

// PUT update a problem statement (Admin)
app.put("/api/problem-statements/:id", validateAdmin, (req, res) => {
  const { id } = req.params;
  const { code, title, category, organization } = req.body;
  
  if (!code || !title || !category || !organization) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const statements = readStatements();
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

  writeStatements(statements);
  res.json(statements[idx]);
});

// DELETE a problem statement (Admin)
app.delete("/api/problem-statements/:id", validateAdmin, (req, res) => {
  const { id } = req.params;
  const statements = readStatements();
  const filtered = statements.filter(s => s.id !== id);
  
  if (filtered.length === statements.length) {
    return res.status(404).json({ error: "Problem statement not found" });
  }

  writeStatements(filtered);
  res.json({ success: true, message: "Deleted successfully" });
});

// GET registrations (Admin)
app.get("/api/registrations", validateAdmin, (req, res) => {
  res.json(readRegistrations());
});

// GET evaluation criteria (Admin/Evaluators)
app.get("/api/admin/evaluation-criteria", validateAdmin, (req, res) => {
  res.json(readCriteria());
});

// POST update evaluation criteria (SPOC Super Admin only)
app.post("/api/admin/evaluation-criteria", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC (Super Admin) can manage evaluation criteria." });
  }
  const { criteria } = req.body;
  if (!Array.isArray(criteria)) {
    return res.status(400).json({ error: "Criteria must be an array." });
  }
  writeCriteria(criteria);
  res.json({ success: true, message: "Evaluation criteria updated successfully." });
});

// POST assign evaluator to a team registration
app.post("/api/admin/registrations/:id/assign-evaluator", validateAdmin, (req, res) => {
  const role = (req as any).adminRole;
  if (role !== "SPOC" && role !== "Student SPOC") {
    return res.status(403).json({ error: "Access Denied: Not authorized to assign evaluators." });
  }
  const { id } = req.params;
  const { evaluatorUsername } = req.body; // can be empty string to unassign

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }

  registrations[idx].assignedEvaluator = evaluatorUsername || undefined;
  writeRegistrations(registrations);

  res.json({ success: true, message: "Evaluator assigned successfully." });
});

// GET all evaluations or for specific registration (Admin / Evaluator / SPOC)
app.get("/api/admin/evaluations", validateAdmin, async (req, res) => {
  try {
    const { registrationId } = req.query;
    const evaluations = await db.getEvaluations(registrationId as string | undefined);
    res.json(evaluations);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch evaluations from database: " + err.message });
  }
});

// POST evaluate/score team (Evaluator role)
app.post("/api/admin/registrations/:id/evaluate", validateAdmin, async (req, res) => {
  const role = (req as any).adminRole;
  const username = (req as any).adminUser;
  if (role !== "Evaluator" && role !== "SPOC" && role !== "Student SPOC") {
    return res.status(403).json({ error: "Access Denied: Only Evaluators and SPOC admins can score teams." });
  }

  const { id } = req.params;
  const { scores, notes, status } = req.body;

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }

  // Ensure evaluator is the assigned one if role is Evaluator
  if (role === "Evaluator" && registrations[idx].assignedEvaluator !== username) {
    return res.status(403).json({ error: "Access Denied: You are not assigned to evaluate this team." });
  }

  const totalScore = scores ? Object.values(scores).reduce((a: any, b: any) => Number(a) + (Number(b) || 0), 0) : 0;

  registrations[idx].evaluatorScores = scores || {};
  registrations[idx].evaluationNotes = notes || "";
  registrations[idx].evaluationStatus = status || "completed";

  writeRegistrations(registrations);

  // Save into structured database table
  await db.saveEvaluation({
    id: `eval_${id}_${Date.now()}`,
    registrationId: id,
    evaluatorUsername: username || "SPOC",
    scores: scores || {},
    totalScore: Number(totalScore),
    notes: notes || "",
    status: status || "completed",
    evaluatedAt: new Date().toISOString()
  });

  res.json({ success: true, message: "Team evaluation submitted and stored in database successfully." });
});

// POST finalize student selection (SPOC only)
app.post("/api/admin/registrations/:id/finalize-selection", validateAdmin, (req, res) => {
  const role = (req as any).adminRole;
  if (role !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC can manage selection status." });
  }

  const { id } = req.params;
  const { isSelected, selectionNotes } = req.body;

  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found." });
  }

  registrations[idx].isFinalSelected = !!isSelected;
  registrations[idx].selectionNotes = selectionNotes || "";

  writeRegistrations(registrations);
  res.json({ success: true, message: `Team selection finalized.` });
});

// POST update registration approval status (SPOC / Admin / Evaluator)
app.post("/api/admin/registrations/:id/approval-status", validateAdmin, (req, res) => {
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
app.put("/api/registrations/my/proposal", validateStudentJWT, (req, res) => {
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

  if (proposalStatus === "submitted") {
    if (!abstract || !abstract.trim() || !implementationSteps || !implementationSteps.trim() || !pptFileName) {
      return res.status(400).json({ error: "All fields (Abstract, Implementation Steps, and PPT Upload) are required to submit." });
    }
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
app.put("/api/students/profile", validateStudentJWT, (req, res) => {
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
app.post("/api/students/change-password", validateStudentJWT, (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: "Email, old password, and new password are required." });
  }

  const settings = readSettings();
  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Modifying another student's password is not allowed." });
    }
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  const emailClean = email.trim().toLowerCase();
  const students = readStudents();
  const idx = students.findIndex(s => s.email === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "Student account not found." });
  }

  // Verify old password
  const oldHash = crypto.createHash("sha256").update(oldPassword).digest("hex");
  if (oldHash !== students[idx].passwordHash) {
    return res.status(400).json({ error: "Incorrect current password." });
  }

  students[idx].passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
  writeStudents(students);

  res.json({ success: true, message: "Your password has been changed successfully." });
});

// PUT update student's own team member details
app.put("/api/registrations/my/team", validateStudentJWT, (req, res) => {
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

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
  }

  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Modifying another student's team is not allowed." });
    }
  }

  const emailClean = email.trim().toLowerCase();
  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.studentEmail?.trim().toLowerCase() === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "No team registration found for this student account." });
  }

  const current = registrations[idx];

  const count = settings.teamMembersCount ?? 5;

  // Under SIH guidelines, check if at least one female member is present in the team
  let hasFemale = (leadGender || current.leadGender || "").toLowerCase() === "female";
  if (count >= 1 && (member1Gender || current.member1Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 2 && (member2Gender || current.member2Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 3 && (member3Gender || current.member3Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 4 && (member4Gender || current.member4Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 5 && (member5Gender || current.member5Gender || "").toLowerCase() === "female") hasFemale = true;

  if (settings.genderDiversityRequired && count > 0 && !hasFemale) {
    return res.status(400).json({ error: `SIH guidelines require at least one female student in each ${count + 1}-member team. Please ensure at least one member has gender set to Female.` });
  }

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

// POST change own admin password (for any logged-in Admin, including Student SPOC)
app.post("/api/admin/change-password", validateAdmin, (req, res) => {
  const currentAdminUser = (req as any).adminUser;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "Old password and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  try {
    const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const idx = admins.findIndex(a => a.username.toLowerCase() === currentAdminUser.toLowerCase());

    if (idx === -1) {
      return res.status(404).json({ error: "Admin account not found." });
    }

    // Verify old password hash
    const oldHash = crypto.createHash("sha256").update(oldPassword).digest("hex");
    if (oldHash !== admins[idx].passwordHash) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    admins[idx].passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), "utf-8");

    res.json({ success: true, message: "Your administrative password has been changed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to change admin password." });
  }
});

// POST reset admin password (Super Admin SPOC only)
app.post("/api/admin/manage-admins/:username/reset-password", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC (Super Admin) can reset admin passwords." });
  }
  const targetUsername = req.params.username.trim().toLowerCase();
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const admins: AdminUser[] = JSON.parse(fs.readFileSync(ADMINS_FILE, "utf-8"));
    const idx = admins.findIndex(a => a.username.toLowerCase() === targetUsername);

    if (idx === -1) {
      return res.status(404).json({ error: "Admin not found." });
    }

    admins[idx].passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), "utf-8");

    res.json({ success: true, message: `Password for admin ${admins[idx].username} reset successfully.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset admin password." });
  }
});

// GET all students (Admin)
app.get("/api/admin/students", validateAdmin, (req, res) => {
  const students = readStudents();
  res.json(students.map(s => ({
    id: s.id,
    email: s.email,
    createdAt: s.createdAt,
    gender: s.gender || "N/A",
    department: s.department || "N/A",
    mobile: s.mobile || "N/A"
  })));
});

// POST reset student password (Admin)
app.post("/api/admin/students/:id/reset-password", validateAdmin, (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  const students = readStudents();
  const idx = students.findIndex(s => s.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Student not found." });
  }

  const passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
  students[idx].passwordHash = passwordHash;
  writeStudents(students);

  res.json({ success: true, message: "Student password reset successfully." });
});

// DELETE student user (Admin)
app.delete("/api/admin/students/:id", validateAdmin, (req, res) => {
  const { id } = req.params;
  const students = readStudents();
  const filtered = students.filter(s => s.id !== id);

  if (filtered.length === students.length) {
    return res.status(404).json({ error: "Student not found." });
  }

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
app.post("/api/registrations", validateStudentJWT, (req, res) => {
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
    hasFemaleMember,
    mentorName,
    problemStatementId,
    studentEmail,
    paymentId,
    orderId,
    signature
  } = req.body;

  const settings = readSettings();
  const count = settings.teamMembersCount ?? 5;

  // Validation
  if (
    !teamName ||
    !leadName ||
    !leadDepartment ||
    !leadMobile ||
    hasFemaleMember === undefined ||
    !mentorName ||
    !problemStatementId
  ) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  // Validate only the configured number of members are provided
  if (count >= 1 && !member1) return res.status(400).json({ error: "Member 1 Name is required." });
  if (count >= 2 && !member2) return res.status(400).json({ error: "Member 2 Name is required." });
  if (count >= 3 && !member3) return res.status(400).json({ error: "Member 3 Name is required." });
  if (count >= 4 && !member4) return res.status(400).json({ error: "Member 4 Name is required." });
  if (count >= 5 && !member5) return res.status(400).json({ error: "Member 5 Name is required." });

  if (settings.jwtEnabled) {
    const tokenEmail = (req as any).studentUser?.email;
    if (tokenEmail && tokenEmail.toLowerCase() !== studentEmail.trim().toLowerCase()) {
      return res.status(403).json({ error: "Forbidden: Submitting a registration under another student's account is not allowed." });
    }
  }

  // Validate that there is at least one female student in the team based on gender fields
  let hasFemale = (leadGender || "").toLowerCase() === "female";
  if (count >= 1 && (member1Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 2 && (member2Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 3 && (member3Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 4 && (member4Gender || "").toLowerCase() === "female") hasFemale = true;
  if (count >= 5 && (member5Gender || "").toLowerCase() === "female") hasFemale = true;

  if (settings.genderDiversityRequired && count > 0 && !hasFemale) {
    return res.status(400).json({ error: `SIH guidelines require at least one female student in each ${count + 1}-member team. Please check your team roster gender fields.` });
  }

  const registrations = readRegistrations();

  // Unique Team Name check
  if (registrations.some(r => r.teamName.trim().toLowerCase() === teamName.trim().toLowerCase())) {
    return res.status(400).json({ error: `The team name "${teamName}" is already taken.` });
  }

  // Validate mobile number format (e.g. 10 digits)
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(leadMobile.trim())) {
    return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
  }

  // Verify problem statement exists
  const statements = readStatements();
  const statementExists = statements.some(s => s.id === problemStatementId);
  if (!statementExists) {
    return res.status(400).json({ error: "Selected problem statement does not exist." });
  }

  // Handle registration fee if enabled
  let paymentStatus: "free" | "paid" = "free";
  let amountPaid = 0;

  if (settings.feeEnabled) {
    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ error: "Payment verification details are required for registration." });
    }

    if (settings.razorpayKeyId === "rzp_test_mock" || orderId.startsWith("order_mock_")) {
      paymentStatus = "paid";
      amountPaid = settings.feeAmount;
    } else {
      try {
        // Verify signature
        const generated_signature = crypto
          .createHmac("sha256", settings.razorpayKeySecret)
          .update(orderId + "|" + paymentId)
          .digest("hex");

        if (generated_signature !== signature) {
          return res.status(400).json({ error: "Payment signature verification failed." });
        }

        paymentStatus = "paid";
        amountPaid = settings.feeAmount;
      } catch (err: any) {
        return res.status(400).json({ error: "Payment verification failed with an error: " + err.message });
      }
    }
  }

  // Generate Registration ID (e.g. SIH-REG-1001)
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
    paymentId,
    orderId,
    amountPaid: paymentStatus === "paid" ? amountPaid : undefined,
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
app.post("/api/registrations/verify-payment", validateStudentJWT, (req, res) => {
  const { registrationId, paymentId, orderId, signature } = req.body;
  if (!registrationId || !paymentId || !orderId || !signature) {
    return res.status(400).json({ error: "Missing verification parameters." });
  }

  try {
    const settings = readSettings();
    const registrations = readRegistrations();
    const idx = registrations.findIndex(r => r.registrationId === registrationId);

    if (idx === -1) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const registration = registrations[idx];

    // Verify signature
    if (settings.razorpayKeyId === "rzp_test_mock" || orderId.startsWith("order_mock_")) {
      registration.paymentStatus = "paid";
      registration.paymentId = paymentId;
      registration.orderId = orderId;
      registration.amountPaid = settings.feeAmount;
      registration.submittedAt = new Date().toISOString(); // Update submission timestamp on payment confirmation
    } else {
      const generated_signature = crypto
        .createHmac("sha256", settings.razorpayKeySecret)
        .update(orderId + "|" + paymentId)
        .digest("hex");

      if (generated_signature !== signature) {
        return res.status(400).json({ error: "Payment signature verification failed." });
      }

      registration.paymentStatus = "paid";
      registration.paymentId = paymentId;
      registration.orderId = orderId;
      registration.amountPaid = settings.feeAmount;
      registration.submittedAt = new Date().toISOString(); // Update submission timestamp on payment confirmation
    }

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

// PUT update a registration (Admin)
app.put("/api/registrations/:id", validateAdmin, (req, res) => {
  const { id } = req.params;
  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Registration not found" });
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

// DELETE a registration (Admin)
app.delete("/api/registrations/:id", validateAdmin, (req, res) => {
  if ((req as any).adminRole === "Student SPOC") {
    return res.status(403).json({ error: "Access Denied: Student SPOC is not authorized to delete team registrations." });
  }
  const { id } = req.params;
  const registrations = readRegistrations();
  const filtered = registrations.filter(r => r.id !== id);
  
  if (filtered.length === registrations.length) {
    return res.status(404).json({ error: "Registration not found" });
  }

  writeRegistrations(filtered);
  res.json({ success: true, message: "Registration deleted successfully" });
});


// ------------------- LANDING PAGE & CUSTOM MENUS ENDPOINTS -------------------

// 1. GET Homepage content (Public)
app.get("/api/homepage", (req, res) => {
  res.json(readHomepage());
});

// 2. POST Save Homepage content (Admin SPOC only)
app.post("/api/homepage", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC is authorized to edit the home page." });
  }
  const content = req.body as HomepageContent;
  if (!content || !content.sihDetails) {
    return res.status(400).json({ error: "Invalid homepage content structure." });
  }
  writeHomepage(content);
  res.json({ success: true, message: "Homepage details updated successfully!", content });
});

// Live Updates Endpoints (Public & Admin)
app.get("/api/updates", (req, res) => {
  res.json(readUpdates());
});

app.post("/api/updates", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC is authorized to edit live updates." });
  }
  const updates = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Updates must be an array." });
  }
  writeUpdates(updates);
  res.json({ success: true, message: "Live updates updated successfully!", updates });
});

// 3. GET Custom dynamic pages list (Public)
app.get("/api/custom-pages", (req, res) => {
  res.json(readCustomPages());
});

// 4. POST Save/Create/Update Custom dynamic page (Admin SPOC only)
app.post("/api/custom-pages", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC is authorized to manage custom pages." });
  }
  const pageInput = req.body as Partial<CustomPage>;
  if (!pageInput.title || !pageInput.slug) {
    return res.status(400).json({ error: "Page title and slug are required." });
  }

  const slug = pageInput.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  if (!slug) {
    return res.status(400).json({ error: "Invalid page slug." });
  }

  const pages = readCustomPages();
  const existingIndex = pages.findIndex(p => p.id === pageInput.id || p.slug === slug);

  const updatedPage: CustomPage = {
    id: pageInput.id || Date.now().toString(),
    title: pageInput.title.trim(),
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
app.delete("/api/custom-pages/:id", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC is authorized to delete custom pages." });
  }
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
app.get("/api/menu", (req, res) => {
  res.json(readMenuItems());
});

// 7. POST Save Navigation menu items configuration (Admin SPOC only)
app.post("/api/menu", validateAdmin, (req, res) => {
  if ((req as any).adminRole !== "SPOC") {
    return res.status(403).json({ error: "Access Denied: Only SPOC is authorized to edit the navigation menu." });
  }
  const items = req.body as MenuItem[];
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid menu configuration format. Must be an array." });
  }
  writeMenuItems(items);
  res.json({ success: true, message: "Navigation menu configuration updated successfully!", menu: items });
});


// ------------------- VITE OR STATIC FRONTEND -------------------

async function startServer() {
  // Initialize and connect database on startup
  try {
    const settings = readSettings();
    if (settings.dbEnabled && settings.dbType && settings.dbType !== "none") {
      await db.init(settings);
    }
  } catch (dbErr) {
    console.error("[Database Startup Initialization Error]:", dbErr);
  }

  // Trigger background database restore/sync if external DB is configured
  restoreDataFromExternalDB().catch(err => {
    console.error("[Startup DB Restore Error]:", err);
  });

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
