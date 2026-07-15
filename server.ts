import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import Razorpay from "razorpay";
import { createServer as createViteServer } from "vite";
import { ProblemStatement, Registration, Student, FeeConfig, HomepageContent, CustomPage, MenuItem } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" })); // Allow larger payloads for base64 images/PPT

// Ensure data directory and files exist
const DATA_DIR = path.join(process.cwd(), "data");
const STATEMENTS_FILE = path.join(DATA_DIR, "problem_statements.json");
const REGISTRATIONS_FILE = path.join(DATA_DIR, "registrations.json");
const STUDENTS_FILE = path.join(DATA_DIR, "students.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const HOMEPAGE_FILE = path.join(DATA_DIR, "homepage_content.json");
const PAGES_FILE = path.join(DATA_DIR, "custom_pages.json");
const MENU_FILE = path.join(DATA_DIR, "menu_items.json");

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
    { id: "p4", name: "Dr. Gudru Prasada Rao", position: "Principal", imageUrl: "" }
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
  ]
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


if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    feeEnabled: false,
    feeAmount: 499,
    razorpayKeyId: "",
    razorpayKeySecret: ""
  }, null, 2), "utf-8");
}


// Seed default Problem Statements if empty
const defaultStatements: ProblemStatement[] = [
  {
    id: "1",
    code: "SIH1627",
    title: "AI-powered crop health monitoring using drone or satellite imagery and leaf analysis",
    category: "Software",
    organization: "Ministry of Agriculture & Farmers Welfare"
  },
  {
    id: "2",
    code: "SIH1628",
    title: "Smart IoT-based real-time leakage and quality tracking for rural water supply lines",
    category: "Hardware",
    organization: "Ministry of Jal Shakti"
  },
  {
    id: "3",
    code: "SIH1629",
    title: "Blockchain-enabled secure verification and retrieval of academic certificates & transcripts",
    category: "Software",
    organization: "Ministry of Education"
  },
  {
    id: "4",
    code: "SIH1630",
    title: "Deep learning based automated sorting of recyclable waste utilizing robotics & computer vision",
    category: "Hardware",
    organization: "Ministry of Housing and Urban Affairs"
  },
  {
    id: "5",
    code: "SIH1631",
    title: "Intelligent emergency-vehicle routing and dynamic traffic signal controller using live camera feed",
    category: "Software",
    organization: "Ministry of Road Transport and Highways"
  }
];

if (!fs.existsSync(STATEMENTS_FILE)) {
  fs.writeFileSync(STATEMENTS_FILE, JSON.stringify(defaultStatements, null, 2), "utf-8");
}

if (!fs.existsSync(REGISTRATIONS_FILE)) {
  fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2), "utf-8");
}

// Helpers to read/write files
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
        { id: "p4", name: "Dr. Gudru Prasada Rao", position: "Principal", imageUrl: "" }
      ];
      fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }
    return parsed;
  } catch (err) {
    return defaultHomepageContent;
  }
}

function writeHomepage(content: HomepageContent) {
  fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(content, null, 2), "utf-8");
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
}


function readSettings(): FeeConfig {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return {
      feeEnabled: false,
      feeAmount: 499,
      razorpayKeyId: "",
      razorpayKeySecret: ""
    };
  }
}

function writeSettings(settings: FeeConfig) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}


// Admin passcode configuration (defaults to 'SIHAdmin2026')
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || "SIHAdmin2026";
const ADMINS_FILE = path.join(DATA_DIR, "admins.json");

interface AdminUser {
  username: string;
  passwordHash: string;
  role: "SPOC" | "Student SPOC";
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

  if (passcode === ADMIN_PASSCODE) {
    (req as any).adminRole = "SPOC";
    (req as any).adminUser = "system_admin";
    return next();
  }

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

  res.status(201).json({
    success: true,
    student: {
      id: newStudent.id,
      email: newStudent.email,
      gender: newStudent.gender,
      department: newStudent.department,
      mobile: newStudent.mobile
    }
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

  res.json({
    success: true,
    student: {
      id: student.id,
      email: student.email,
      gender: student.gender || "",
      department: student.department || "",
      mobile: student.mobile || ""
    }
  });
});

// Public Settings (safe, hides secret)
app.get("/api/settings/public", (req, res) => {
  const settings = readSettings();
  res.json({
    feeEnabled: settings.feeEnabled,
    feeAmount: settings.feeAmount,
    razorpayKeyId: settings.razorpayKeyId
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
  const { feeEnabled, feeAmount, razorpayKeyId, razorpayKeySecret } = req.body;
  
  if (feeEnabled && (feeAmount === undefined || feeAmount < 0)) {
    return res.status(400).json({ error: "A valid fee amount is required when fee is enabled." });
  }

  const updated: FeeConfig = {
    feeEnabled: !!feeEnabled,
    feeAmount: Number(feeAmount) || 0,
    razorpayKeyId: (razorpayKeyId || "").trim(),
    razorpayKeySecret: (razorpayKeySecret || "").trim()
  };

  writeSettings(updated);
  res.json({ success: true, settings: updated });
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

    const token = `ADMIN:${admin.role}:${admin.username}`;
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
  if (passcode === ADMIN_PASSCODE) {
    return res.json({ success: true, role: "SPOC", username: "system_admin" });
  }

  if (passcode && passcode.startsWith("ADMIN:")) {
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
      role: role === "SPOC" ? "SPOC" : "Student SPOC"
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

// GET own registration (Student lookup)
app.get("/api/registrations/my", (req, res) => {
  const email = req.query.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required." });
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
app.put("/api/registrations/my/proposal", (req, res) => {
  const { email, abstract, implementationSteps, pptFileName, pptBase64, proposalStatus } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
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

  registrations[idx] = {
    ...current,
    abstract: abstract !== undefined ? abstract.trim() : current.abstract,
    implementationSteps: implementationSteps !== undefined ? implementationSteps.trim() : current.implementationSteps,
    pptFileName: pptFileName !== undefined ? pptFileName : current.pptFileName,
    pptBase64: pptBase64 !== undefined ? pptBase64 : current.pptBase64,
    proposalStatus: proposalStatus || current.proposalStatus || "saved"
  };

  writeRegistrations(registrations);
  res.json({ success: true, registration: registrations[idx], message: proposalStatus === "submitted" ? "Proposal submitted successfully!" : "Proposal saved successfully!" });
});

// GET a student's profile
app.get("/api/students/profile", (req, res) => {
  const email = req.query.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required." });
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
app.put("/api/students/profile", (req, res) => {
  const { email, gender, department, mobile } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required." });
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
app.post("/api/students/change-password", (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  if (!email || !oldPassword || !newPassword) {
    return res.status(400).json({ error: "Email, old password, and new password are required." });
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
app.put("/api/registrations/my/team", (req, res) => {
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

  const emailClean = email.trim().toLowerCase();
  const registrations = readRegistrations();
  const idx = registrations.findIndex(r => r.studentEmail?.trim().toLowerCase() === emailClean);

  if (idx === -1) {
    return res.status(404).json({ error: "No team registration found for this student account." });
  }

  const current = registrations[idx];

  // Under SIH guidelines, check if at least one female member is present in the team
  const hasFemale = 
    (leadGender || current.leadGender || "").toLowerCase() === "female" ||
    (member1Gender || current.member1Gender || "").toLowerCase() === "female" ||
    (member2Gender || current.member2Gender || "").toLowerCase() === "female" ||
    (member3Gender || current.member3Gender || "").toLowerCase() === "female" ||
    (member4Gender || current.member4Gender || "").toLowerCase() === "female" ||
    (member5Gender || current.member5Gender || "").toLowerCase() === "female";

  if (!hasFemale) {
    return res.status(400).json({ error: "SIH guidelines require at least one female student in each 6-member team. Please ensure at least one member has gender set to Female." });
  }

  registrations[idx] = {
    ...current,
    leadName: leadName !== undefined ? leadName.trim() : current.leadName,
    leadMobile: leadMobile !== undefined ? leadMobile.trim() : current.leadMobile,
    leadGender: leadGender !== undefined ? leadGender : current.leadGender,
    member1: member1 !== undefined ? member1.trim() : current.member1,
    member1Gender: member1Gender !== undefined ? member1Gender : current.member1Gender,
    member1Email: member1Email !== undefined ? member1Email.trim() : current.member1Email,
    member1Phone: member1Phone !== undefined ? member1Phone.trim() : current.member1Phone,
    member2: member2 !== undefined ? member2.trim() : current.member2,
    member2Gender: member2Gender !== undefined ? member2Gender : current.member2Gender,
    member2Email: member2Email !== undefined ? member2Email.trim() : current.member2Email,
    member2Phone: member2Phone !== undefined ? member2Phone.trim() : current.member2Phone,
    member3: member3 !== undefined ? member3.trim() : current.member3,
    member3Gender: member3Gender !== undefined ? member3Gender : current.member3Gender,
    member3Email: member3Email !== undefined ? member3Email.trim() : current.member3Email,
    member3Phone: member3Phone !== undefined ? member3Phone.trim() : current.member3Phone,
    member4: member4 !== undefined ? member4.trim() : current.member4,
    member4Gender: member4Gender !== undefined ? member4Gender : current.member4Gender,
    member4Email: member4Email !== undefined ? member4Email.trim() : current.member4Email,
    member4Phone: member4Phone !== undefined ? member4Phone.trim() : current.member4Phone,
    member5: member5 !== undefined ? member5.trim() : current.member5,
    member5Gender: member5Gender !== undefined ? member5Gender : current.member5Gender,
    member5Email: member5Email !== undefined ? member5Email.trim() : current.member5Email,
    member5Phone: member5Phone !== undefined ? member5Phone.trim() : current.member5Phone,
    mentorName: mentorName !== undefined ? mentorName.trim() : current.mentorName
  };

  writeRegistrations(registrations);
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
app.post("/api/registrations", (req, res) => {
  const {
    teamName,
    leadName,
    leadDepartment,
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
    hasFemaleMember,
    mentorName,
    problemStatementId,
    studentEmail,
    paymentId,
    orderId,
    signature
  } = req.body;

  // Validation
  if (
    !teamName ||
    !leadName ||
    !leadDepartment ||
    !leadMobile ||
    !member1 ||
    !member2 ||
    !member3 ||
    !member4 ||
    !member5 ||
    hasFemaleMember === undefined ||
    !mentorName ||
    !problemStatementId
  ) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  // Validate that there is at least one female student in the team based on gender fields
  const hasFemale = 
    (leadGender || "").toLowerCase() === "female" ||
    (member1Gender || "").toLowerCase() === "female" ||
    (member2Gender || "").toLowerCase() === "female" ||
    (member3Gender || "").toLowerCase() === "female" ||
    (member4Gender || "").toLowerCase() === "female" ||
    (member5Gender || "").toLowerCase() === "female";

  if (!hasFemale) {
    return res.status(400).json({ error: "SIH guidelines require at least one female student in each 6-member team. Please check your team roster gender fields." });
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
  const settings = readSettings();
  let paymentStatus: "free" | "paid" = "free";
  let amountPaid = 0;

  if (settings.feeEnabled) {
    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ error: "Payment verification details are required for registration." });
    }

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

  const newRegistration: Registration = {
    id: Date.now().toString(),
    registrationId,
    teamName: teamName.trim(),
    leadName: leadName.trim(),
    leadDepartment: leadDepartment.trim(),
    leadMobile: leadMobile.trim(),
    leadGender: leadGender || "",
    member1: member1.trim(),
    member1Gender: member1Gender || "",
    member1Email: member1Email || "",
    member1Phone: member1Phone || "",
    member2: member2.trim(),
    member2Gender: member2Gender || "",
    member2Email: member2Email || "",
    member2Phone: member2Phone || "",
    member3: member3.trim(),
    member3Gender: member3Gender || "",
    member3Email: member3Email || "",
    member3Phone: member3Phone || "",
    member4: member4.trim(),
    member4Gender: member4Gender || "",
    member4Email: member4Email || "",
    member4Phone: member4Phone || "",
    member5: member5.trim(),
    member5Gender: member5Gender || "",
    member5Email: member5Email || "",
    member5Phone: member5Phone || "",
    hasFemaleMember: !!hasFemaleMember,
    mentorName: mentorName.trim(),
    problemStatementId,
    submittedAt: new Date().toISOString(),
    studentEmail: studentEmail?.trim() || undefined,
    paymentStatus,
    paymentId,
    orderId,
    amountPaid: paymentStatus === "paid" ? amountPaid : undefined
  };

  registrations.push(newRegistration);
  writeRegistrations(registrations);

  res.status(201).json({
    success: true,
    registration: newRegistration,
    message: "Registration successful!"
  });
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

  const updated = {
    ...current,
    ...req.body,
    hasFemaleMember: calculatedHasFemale,
    id: current.id, // cannot modify id
    registrationId: current.registrationId // cannot modify registrationId
  };

  registrations[idx] = updated;
  writeRegistrations(registrations);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
