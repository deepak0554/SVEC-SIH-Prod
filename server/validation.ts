import { z, ZodSchema, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

// ==========================================
// 1. REUSABLE ATOMIC FIELD VALIDATORS
// ==========================================

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Please provide a valid email address")
  .max(100, "Email must not exceed 100 characters");

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please provide a valid email address")
  .max(100, "Email must not exceed 100 characters")
  .optional()
  .or(z.literal(""));

export const mobileSchema = z
  .string()
  .trim()
  .min(1, "Mobile number is required")
  .regex(
    /^(?:\+?91[\-\s]?)?[6-9]\d{9}$/,
    "Please enter a valid 10-digit mobile number starting with 6-9"
  );

export const optionalMobileSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+?91[\-\s]?)?[6-9]\d{9}$/,
    "Please enter a valid 10-digit mobile number starting with 6-9"
  )
  .optional()
  .or(z.literal(""));

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must not exceed 100 characters");

export const teamNameSchema = z
  .string()
  .trim()
  .min(3, "Team name must be at least 3 characters")
  .max(60, "Team name must not exceed 60 characters");

export const departmentSchema = z
  .string()
  .trim()
  .min(2, "Department must be at least 2 characters")
  .max(60, "Department must not exceed 60 characters");

export const genderSchema = z.enum(["Male", "Female", "Other"]);

export const academicYearSchema = z
  .string()
  .trim()
  .min(1, "Academic year is required")
  .max(30, "Academic year must not exceed 30 characters");

export const rollNumberSchema = z
  .string()
  .trim()
  .max(30, "Roll number must not exceed 30 characters")
  .optional()
  .or(z.literal(""));

export const idSchema = z
  .string()
  .trim()
  .min(1, "Identifier cannot be empty")
  .max(128, "Identifier is too long");

export const dateStringSchema = z
  .string()
  .datetime({ message: "Invalid ISO 8601 date format" })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"));

export const base64DataSchema = z
  .string()
  .max(35 * 1024 * 1024, "Uploaded payload is too large (maximum 25MB limit)");

// ==========================================
// 2. AUTHENTICATION & USER SCHEMAS
// ==========================================

export const studentRegisterSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must not exceed 100 characters"),
  name: nameSchema.optional(),
  gender: genderSchema.optional().or(z.literal("")),
  department: departmentSchema.optional().or(z.literal("")),
  mobile: optionalMobileSchema,
  academicYear: academicYearSchema.optional().or(z.literal("")),
  rollNumber: rollNumberSchema
});

export const studentLoginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password cannot be empty")
});

export const adminLoginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(60, "Username is too long"),
  password: z
    .string()
    .min(1, "Password cannot be empty"),
  role: z
    .enum(["SPOC", "DEPT_SPOC", "Dept SPOC", "Department SPOC", "DEPARTMENT_SPOC", "Student SPOC", "Evaluator", "Faculty", "ADMIN", "STUDENT_SPOC", "EVALUATOR", "FACULTY"])
    .optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100, "New password is too long")
});

export const resetPasswordAdminSchema = z.object({
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(100, "New password is too long")
});

export const studentProfileUpdateSchema = z.object({
  name: nameSchema.optional(),
  gender: genderSchema.optional(),
  department: departmentSchema.optional(),
  mobile: optionalMobileSchema,
  academicYear: academicYearSchema.optional(),
  rollNumber: rollNumberSchema
});

export const manageAdminCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, dots, and underscores"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  role: z.enum(["SPOC", "DEPT_SPOC", "Dept SPOC", "Department SPOC", "DEPARTMENT_SPOC", "Student SPOC", "Evaluator", "Faculty", "ADMIN", "STUDENT_SPOC", "EVALUATOR", "FACULTY"]),
  department: z.string().trim().max(100).optional().nullable()
});

// ==========================================
// 3. TEAM REGISTRATION & ROSTER SCHEMAS
// ==========================================

export const memberItemSchema = z.object({
  name: z.string().trim().max(100).optional().or(z.literal("")),
  email: optionalEmailSchema,
  mobile: optionalMobileSchema,
  gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  department: z.string().trim().max(60).optional().or(z.literal("")),
  academicYear: z.string().trim().max(30).optional().or(z.literal("")),
  rollNumber: rollNumberSchema
});

export const teamRegistrationSchema = z.object({
  teamName: teamNameSchema,
  leadName: nameSchema,
  leadDepartment: departmentSchema,
  leadMobile: mobileSchema,
  leadGender: genderSchema,
  leadAcademicYear: academicYearSchema.optional().or(z.literal("")),
  leadRollNumber: rollNumberSchema,
  
  // Members 1 to 5
  member1: z.string().trim().max(100).optional().or(z.literal("")),
  member1Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member1Email: optionalEmailSchema,
  member1Mobile: optionalMobileSchema,
  member1Phone: optionalMobileSchema,
  member1Department: z.string().trim().max(60).optional().or(z.literal("")),
  member1AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member1RollNumber: rollNumberSchema,

  member2: z.string().trim().max(100).optional().or(z.literal("")),
  member2Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member2Email: optionalEmailSchema,
  member2Mobile: optionalMobileSchema,
  member2Phone: optionalMobileSchema,
  member2Department: z.string().trim().max(60).optional().or(z.literal("")),
  member2AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member2RollNumber: rollNumberSchema,

  member3: z.string().trim().max(100).optional().or(z.literal("")),
  member3Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member3Email: optionalEmailSchema,
  member3Mobile: optionalMobileSchema,
  member3Phone: optionalMobileSchema,
  member3Department: z.string().trim().max(60).optional().or(z.literal("")),
  member3AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member3RollNumber: rollNumberSchema,

  member4: z.string().trim().max(100).optional().or(z.literal("")),
  member4Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member4Email: optionalEmailSchema,
  member4Mobile: optionalMobileSchema,
  member4Phone: optionalMobileSchema,
  member4Department: z.string().trim().max(60).optional().or(z.literal("")),
  member4AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member4RollNumber: rollNumberSchema,

  member5: z.string().trim().max(100).optional().or(z.literal("")),
  member5Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member5Email: optionalEmailSchema,
  member5Mobile: optionalMobileSchema,
  member5Phone: optionalMobileSchema,
  member5Department: z.string().trim().max(60).optional().or(z.literal("")),
  member5AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member5RollNumber: rollNumberSchema,

  hasFemaleMember: z.boolean().optional(),
  mentorName: z.string().trim().min(2, "Mentor name must be at least 2 characters").max(100),
  problemStatementId: idSchema,
  studentEmail: optionalEmailSchema,
  paymentId: z.string().trim().max(100).optional().or(z.literal("")),
  orderId: z.string().trim().max(100).optional().or(z.literal("")),
  signature: z.string().trim().max(256).optional().or(z.literal("")),
  abstract: z.string().max(15000, "Abstract is too long").optional().or(z.literal("")),
  implementationSteps: z.string().max(15000, "Implementation steps are too long").optional().or(z.literal("")),
  pptFileName: z.string().max(255).optional().or(z.literal("")),
  pptBase64: base64DataSchema.optional().or(z.literal("")),
  pptFileUrl: z.string().max(500).optional().or(z.literal("")),
  proposalStatus: z.string().max(50).optional()
});

export const updateTeamRosterSchema = z.object({
  email: emailSchema,
  leadName: nameSchema.optional(),
  leadDepartment: departmentSchema.optional(),
  leadMobile: mobileSchema.optional(),
  leadGender: genderSchema.optional(),
  leadAcademicYear: academicYearSchema.optional().or(z.literal("")),
  leadRollNumber: rollNumberSchema,

  member1: z.string().trim().max(100).optional().or(z.literal("")),
  member1Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member1Email: optionalEmailSchema,
  member1Mobile: optionalMobileSchema,
  member1Phone: optionalMobileSchema,
  member1Department: z.string().trim().max(60).optional().or(z.literal("")),
  member1AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member1RollNumber: rollNumberSchema,

  member2: z.string().trim().max(100).optional().or(z.literal("")),
  member2Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member2Email: optionalEmailSchema,
  member2Mobile: optionalMobileSchema,
  member2Phone: optionalMobileSchema,
  member2Department: z.string().trim().max(60).optional().or(z.literal("")),
  member2AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member2RollNumber: rollNumberSchema,

  member3: z.string().trim().max(100).optional().or(z.literal("")),
  member3Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member3Email: optionalEmailSchema,
  member3Mobile: optionalMobileSchema,
  member3Phone: optionalMobileSchema,
  member3Department: z.string().trim().max(60).optional().or(z.literal("")),
  member3AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member3RollNumber: rollNumberSchema,

  member4: z.string().trim().max(100).optional().or(z.literal("")),
  member4Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member4Email: optionalEmailSchema,
  member4Mobile: optionalMobileSchema,
  member4Phone: optionalMobileSchema,
  member4Department: z.string().trim().max(60).optional().or(z.literal("")),
  member4AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member4RollNumber: rollNumberSchema,

  member5: z.string().trim().max(100).optional().or(z.literal("")),
  member5Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member5Email: optionalEmailSchema,
  member5Mobile: optionalMobileSchema,
  member5Phone: optionalMobileSchema,
  member5Department: z.string().trim().max(60).optional().or(z.literal("")),
  member5AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member5RollNumber: rollNumberSchema,

  mentorName: z.string().trim().max(100).optional().or(z.literal(""))
});

export const updateProposalSchema = z.object({
  abstract: z.string().max(15000, "Abstract must not exceed 15,000 characters").optional().or(z.literal("")),
  implementationSteps: z.string().max(15000, "Implementation steps must not exceed 15,000 characters").optional().or(z.literal("")),
  pptFileName: z.string().max(255).optional().or(z.literal("")),
  pptBase64: base64DataSchema.optional().or(z.literal(""))
});

// ==========================================
// 4. PROBLEM STATEMENTS SCHEMAS
// ==========================================

export const problemStatementSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(30, "Code must not exceed 30 characters"),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(300, "Title must not exceed 300 characters"),
  category: z
    .string()
    .trim()
    .min(2, "Category must be at least 2 characters")
    .max(100, "Category must not exceed 100 characters"),
  organization: z
    .string()
    .trim()
    .min(2, "Organization must be at least 2 characters")
    .max(150, "Organization must not exceed 150 characters"),
  domain: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  psType: z.enum(["Software", "Hardware", "Both"]).optional().or(z.string().max(50))
});

export const bulkProblemStatementsSchema = z.object({
  statements: z.array(problemStatementSchema).min(1, "At least one problem statement is required"),
  action: z.enum(["merge", "replace"]).default("merge")
});

// ==========================================
// 5. EVALUATION, SCORING & SELECTION SCHEMAS
// ==========================================

export const evaluationCriteriaSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Name is required").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  maxScore: z.number().min(1).max(100),
  weightage: z.number().min(0).max(100).optional()
});

export const updateEvaluationCriteriaBodySchema = z.object({
  criteria: z.array(evaluationCriteriaSchema)
});

export const assignEvaluatorSchema = z.object({
  evaluatorUsername: z.string().trim().max(100).optional().or(z.literal(""))
});

export const evaluateTeamSchema = z.object({
  scores: z.record(
    z.string().min(1),
    z.number().min(0).max(100)
  ),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  status: z.enum(["pending", "evaluated", "approved", "rejected", "completed"]).optional()
});

export const toggleEvaluationLockSchema = z.object({
  locked: z.boolean(),
  reason: z.string().trim().max(1000).optional().or(z.literal(""))
});

export const finalizeSelectionSchema = z.object({
  isSelected: z.boolean(),
  selectionNotes: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const updateApprovalStatusSchema = z.object({
  approvalStatus: z.enum(["pending", "verified", "under_review", "approved", "rejected"]),
  approvalNotes: z.string().trim().max(2000).optional().or(z.literal(""))
});

export const updateRegistrationAdminSchema = z.object({
  teamName: teamNameSchema.optional(),
  leadName: nameSchema.optional(),
  leadDepartment: departmentSchema.optional(),
  leadMobile: mobileSchema.optional(),
  leadGender: genderSchema.optional(),
  leadAcademicYear: academicYearSchema.optional().or(z.literal("")),
  leadRollNumber: rollNumberSchema,

  member1: z.string().trim().max(100).optional().or(z.literal("")),
  member1Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member1Email: optionalEmailSchema,
  member1Mobile: optionalMobileSchema,
  member1Phone: optionalMobileSchema,
  member1Department: z.string().trim().max(60).optional().or(z.literal("")),
  member1AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member1RollNumber: rollNumberSchema,

  member2: z.string().trim().max(100).optional().or(z.literal("")),
  member2Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member2Email: optionalEmailSchema,
  member2Mobile: optionalMobileSchema,
  member2Phone: optionalMobileSchema,
  member2Department: z.string().trim().max(60).optional().or(z.literal("")),
  member2AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member2RollNumber: rollNumberSchema,

  member3: z.string().trim().max(100).optional().or(z.literal("")),
  member3Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member3Email: optionalEmailSchema,
  member3Mobile: optionalMobileSchema,
  member3Phone: optionalMobileSchema,
  member3Department: z.string().trim().max(60).optional().or(z.literal("")),
  member3AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member3RollNumber: rollNumberSchema,

  member4: z.string().trim().max(100).optional().or(z.literal("")),
  member4Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member4Email: optionalEmailSchema,
  member4Mobile: optionalMobileSchema,
  member4Phone: optionalMobileSchema,
  member4Department: z.string().trim().max(60).optional().or(z.literal("")),
  member4AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member4RollNumber: rollNumberSchema,

  member5: z.string().trim().max(100).optional().or(z.literal("")),
  member5Gender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal("")),
  member5Email: optionalEmailSchema,
  member5Mobile: optionalMobileSchema,
  member5Phone: optionalMobileSchema,
  member5Department: z.string().trim().max(60).optional().or(z.literal("")),
  member5AcademicYear: z.string().trim().max(30).optional().or(z.literal("")),
  member5RollNumber: rollNumberSchema,

  mentorName: z.string().trim().max(100).optional().or(z.literal("")),
  problemStatementId: idSchema.optional(),
  studentEmail: optionalEmailSchema,
  paymentStatus: z.enum(["pending", "paid"]).optional(),
  amountPaid: z.number().min(0).optional(),
  approvalStatus: z.enum(["pending", "verified", "under_review", "approved", "rejected"]).optional(),
  approvalNotes: z.string().max(2000).optional().or(z.literal("")),
  assignedEvaluator: z.string().max(100).optional().or(z.literal("")),
  abstract: z.string().max(15000).optional().or(z.literal("")),
  implementationSteps: z.string().max(15000).optional().or(z.literal("")),
  pptFileName: z.string().max(255).optional().or(z.literal("")),
  pptBase64: base64DataSchema.optional().or(z.literal("")),
  pptFileUrl: z.string().max(500).optional().or(z.literal("")),
  proposalStatus: z.string().max(50).optional()
}).passthrough();

// ==========================================
// 6. PAYMENTS & SETTINGS SCHEMAS
// ==========================================

export const createPaymentOrderSchema = z.object({
  amount: z
    .number()
    .positive("Payment amount must be greater than 0")
    .max(100000, "Payment amount cannot exceed ₹1,00,000"),
  registrationId: idSchema,
  currency: z.string().default("INR")
});

export const verifyPaymentSchema = z.object({
  registrationId: idSchema,
  paymentId: z.string().trim().min(1, "Payment ID is required").max(100),
  orderId: z.string().trim().min(1, "Order ID is required").max(100),
  signature: z.string().trim().max(256).optional().or(z.literal("")),
  amount: z.number().positive().max(100000).optional()
});

export const settingsSchema = z.object({
  feeEnabled: z.boolean().optional(),
  feeAmount: z.number().min(0, "Fee amount must be non-negative").optional(),
  razorpayKeyId: z.string().trim().max(100).optional().or(z.literal("")),
  razorpayKeySecret: z.string().trim().max(100).optional().or(z.literal("")),
  jwtEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smtpHost: z.string().trim().max(150).optional().or(z.literal("")),
  smtpPort: z.union([z.number(), z.string()]).optional(),
  smtpUser: z.string().trim().max(100).optional().or(z.literal("")),
  smtpPass: z.string().trim().max(100).optional().or(z.literal("")),
  smtpFrom: z.string().trim().max(100).optional().or(z.literal("")),
  portalTheme: z.string().max(50).optional(),
  logoUrl: z.string().max(500).optional().or(z.literal("")),
  portalTitle: z.string().trim().max(200).optional().or(z.literal("")),
  portalCaption: z.string().trim().max(200).optional().or(z.literal("")),
  teamMembersCount: z.union([z.number(), z.string()]).optional(),
  genderDiversityRequired: z.boolean().optional(),
  registrationDeadline: z.string().trim().max(100).optional().or(z.literal("")),
  submissionDeadline: z.string().trim().max(100).optional().or(z.literal("")),
  minTeamSize: z.union([z.number(), z.string()]).optional(),
  maxTeamSize: z.union([z.number(), z.string()]).optional(),
  maxTeamsPerProblemStatement: z.union([z.number(), z.string()]).optional(),

  // SMS
  smsEnabled: z.boolean().optional(),
  smsProvider: z.string().max(50).optional(),
  twilioSid: z.string().trim().max(100).optional().or(z.literal("")),
  twilioAuthToken: z.string().trim().max(100).optional().or(z.literal("")),
  twilioFrom: z.string().trim().max(50).optional().or(z.literal("")),
  msg91AuthKey: z.string().trim().max(100).optional().or(z.literal("")),
  msg91SenderId: z.string().trim().max(50).optional().or(z.literal("")),
  msg91Route: z.string().trim().max(20).optional().or(z.literal("")),
  smsCustomUrl: z.string().trim().max(500).optional().or(z.literal("")),
  smsCustomMethod: z.string().max(10).optional(),
  smsCustomHeaders: z.string().max(2000).optional().or(z.literal("")),
  smsCustomPayload: z.string().max(2000).optional().or(z.literal("")),

  // WhatsApp
  whatsappEnabled: z.boolean().optional(),
  whatsappProvider: z.string().max(50).optional(),
  whatsappAccessToken: z.string().trim().max(500).optional().or(z.literal("")),
  whatsappPhoneId: z.string().trim().max(100).optional().or(z.literal("")),
  whatsappWabaId: z.string().trim().max(100).optional().or(z.literal("")),
  whatsappCustomUrl: z.string().trim().max(500).optional().or(z.literal("")),
  whatsappCustomMethod: z.string().max(10).optional(),
  whatsappCustomHeaders: z.string().max(2000).optional().or(z.literal("")),
  whatsappCustomPayload: z.string().max(2000).optional().or(z.literal("")),

  // DB
  dbEnabled: z.boolean().optional(),
  dbType: z.string().max(50).optional(),
  dbHost: z.string().trim().max(255).optional().or(z.literal("")),
  dbPort: z.union([z.number(), z.string()]).optional(),
  dbName: z.string().trim().max(100).optional().or(z.literal("")),
  dbUsername: z.string().trim().max(100).optional().or(z.literal("")),
  dbPassword: z.string().max(200).optional().or(z.literal("")),
  dbCollectionOrTable: z.string().trim().max(100).optional().or(z.literal("")),
  dbStatus: z.string().max(200).optional(),

  // Locks & Certificates
  lockStudentUpdates: z.boolean().optional(),
  lockRegisterAnotherTeam: z.boolean().optional(),
  enableCertificates: z.boolean().optional(),
  certificateTitle: z.string().trim().max(200).optional().or(z.literal("")),
  certificateSubtitle: z.string().trim().max(200).optional().or(z.literal("")),
  certificateBody: z.string().max(2000).optional().or(z.literal("")),
  certificateSignatory1Name: z.string().trim().max(100).optional().or(z.literal("")),
  certificateSignatory1Title: z.string().trim().max(100).optional().or(z.literal("")),
  certificateSignatory2Name: z.string().trim().max(100).optional().or(z.literal("")),
  certificateSignatory2Title: z.string().trim().max(100).optional().or(z.literal("")),
  certificateBgType: z.string().max(50).optional(),
  certificateBgUrl: z.string().max(500).optional().or(z.literal("")),
  certificateBorderColor: z.string().max(50).optional(),
  certificateDateText: z.string().max(100).optional().or(z.literal("")),
  creditsTitle: z.string().max(200).optional(),
  creditsContent: z.string().max(5000).optional().or(z.literal("")),
  creditsEnabled: z.boolean().optional(),

  // Sample PPT
  samplePptEnabled: z.boolean().optional(),
  samplePptUrl: z.string().max(500).optional().or(z.literal("")),
  samplePptFileName: z.string().max(200).optional().or(z.literal("")),
  samplePptFileBase64: z.string().max(35 * 1024 * 1024).optional().or(z.literal("")),
  samplePptDescription: z.string().max(2000).optional().or(z.literal("")),

  // Consent Letter Template (Super Admin Only)
  consentLetterEnabled: z.boolean().optional(),
  consentLetterAicteNo: z.string().trim().max(100).optional().or(z.literal("")),
  consentLetterPrincipalName: z.string().trim().max(200).optional().or(z.literal("")),
  consentLetterDesignation1: z.string().trim().max(300).optional().or(z.literal("")),
  consentLetterDesignation2: z.string().trim().max(300).optional().or(z.literal("")),
  consentLetterSignatureUrl: z.string().max(1000000).optional().or(z.literal("")),
  consentLetterStampUrl: z.string().max(1000000).optional().or(z.literal("")),
  consentLetterShowSignature: z.boolean().optional(),
  consentLetterShowStamp: z.boolean().optional(),
  consentLetterIncludeLetterhead: z.boolean().optional(),
  consentLetterCustomSubject: z.string().trim().max(300).optional().or(z.literal("")),
  consentLetterBodyTemplate: z.string().trim().max(3000).optional().or(z.literal("")),
  consentLetterRequireSelection: z.boolean().optional()
}).passthrough();

export const testDbSchema = z.object({
  dbType: z.string().min(1, "Database type is required"),
  dbHost: z.string().trim().min(1, "Host is required").max(255),
  dbPort: z.union([z.number(), z.string()]).optional(),
  dbName: z.string().trim().min(1, "Database name is required").max(100),
  dbUsername: z.string().trim().max(100).optional().or(z.literal("")),
  dbPassword: z.string().max(200).optional().or(z.literal("")),
  dbCollectionOrTable: z.string().trim().max(100).optional().or(z.literal(""))
});

// ==========================================
// 7. FILE UPLOADS SCHEMAS
// ==========================================

export const fileUploadSchema = z.object({
  data: z
    .string()
    .min(1, "File data cannot be empty")
    .max(35 * 1024 * 1024, "Uploaded file exceeds maximum size of 25MB"),
  category: z
    .enum(["ppts", "images", "sample_ppts", "documents"])
    .default("documents"),
  filename: z
    .string()
    .trim()
    .max(150, "Filename must not exceed 150 characters")
    .regex(/^[\w\-. ]+$/, "Filename contains invalid characters")
    .optional()
});

// ==========================================
// 8. BROADCAST & NOTIFICATIONS SCHEMAS
// ==========================================

export const broadcastSmsSchema = z.object({
  message: z.string().trim().min(1, "Message content is required").max(1000),
  recipientGroup: z.enum(["test_single", "all_logins", "team_leads", "all_team_members"]),
  testMobile: optionalMobileSchema
});

export const broadcastWhatsappSchema = z.object({
  templateName: z.string().trim().min(1, "Template selection is required").max(100),
  variables: z.array(z.string()).optional(),
  recipientGroup: z.enum(["test_single", "all_logins", "team_leads", "all_team_members"]),
  testMobile: optionalMobileSchema
});

export const broadcastEmailSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message content is required").max(10000),
  recipientGroup: z.enum(["test_single", "all_logins", "team_leads", "all_team_members"]),
  testEmail: optionalEmailSchema
});

export const broadcastMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
  targetCategory: z.enum(["all", "selected", "unselected", "pending", "approved", "department"]).optional(),
  department: z.string().trim().max(50).optional().or(z.literal("")),
  subject: z.string().trim().max(200).optional().or(z.literal(""))
});

// ==========================================
// 9. DYNAMIC CMS, HOMEPAGE & LIVE UPDATES SCHEMAS
// ==========================================

export const customPageSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .trim()
    .min(2, "Page title must be at least 2 characters")
    .max(120, "Page title must not exceed 120 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Page slug must be at least 2 characters")
    .max(100, "Page slug must not exceed 100 characters"),
  content: z.string().max(100000, "Content is too large").optional().or(z.literal("")),
  published: z.boolean().optional(),
  createdAt: z.string().optional()
});

export const updateCustomPageSchema = customPageSchema;

export const menuItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  path: z.string().min(1).max(200),
  isExternal: z.boolean().optional(),
  order: z.number().optional()
});

export const menuSchema = z.array(menuItemSchema);
export const menuItemsArraySchema = z.array(menuItemSchema);

export const homepageContentSchema = z.object({
  sihDetails: z.object({
    theme: z.string().optional(),
    edition: z.string().optional(),
    date: z.string().optional(),
    venue: z.string().optional(),
    registrationDeadline: z.string().optional(),
    bannerUrl: z.string().optional(),
    description: z.string().optional()
  }).passthrough(),
  rounds: z.array(z.any()).optional(),
  faqs: z.array(z.any()).optional(),
  quickLinks: z.array(z.any()).optional(),
  guidelines: z.array(z.any()).optional(),
  rules: z.array(z.any()).optional(),
  contact: z.any().optional()
}).passthrough();

export const liveUpdateItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Update text is required").max(500),
  date: z.string().optional(),
  urgent: z.boolean().optional(),
  link: z.string().optional()
});

export const updatesArraySchema = z.array(liveUpdateItemSchema);

// ==========================================
// 10. PAGINATION & QUERY SCHEMAS
// ==========================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be >= 1").default(1),
  limit: z.coerce.number().int().min(1, "Limit must be >= 1").max(100, "Limit cannot exceed 100").default(20),
  search: z.string().trim().max(100).optional().or(z.literal("")),
  status: z.string().trim().max(50).optional().or(z.literal("")),
  department: z.string().trim().max(50).optional().or(z.literal("")),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  academicYear: z.string().trim().max(30).optional().or(z.literal("")),
  startDate: z.string().trim().max(50).optional().or(z.literal("")),
  endDate: z.string().trim().max(50).optional().or(z.literal("")),
  sortBy: z.string().trim().max(50).optional().or(z.literal("")),
  sortOrder: z.enum(["asc", "desc", "ASC", "DESC"]).optional(),
  paginated: z.coerce.boolean().optional()
});

export const singleIdParamSchema = z.object({
  id: idSchema
});

// ==========================================
// 11. EXPRESS MIDDLEWARE VALIDATION ADAPTERS
// ==========================================

/**
 * Validates req.body against a Zod schema.
 * Passes ZodError directly to centralized error handling middleware.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates req.query against a Zod schema.
 * Passes ZodError directly to centralized error handling middleware.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.query = parsed as any;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validates req.params against a Zod schema.
 * Passes ZodError directly to centralized error handling middleware.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed as any;
      next();
    } catch (err) {
      next(err);
    }
  };
}
