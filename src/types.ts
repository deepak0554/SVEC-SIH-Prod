export interface ProblemStatement {
  id: string;
  code: string; // e.g. "SIH1627"
  title: string;
  category: "Software" | "Hardware";
  organization: string; // Ministry/Department
}

export interface Registration {
  id: string;
  registrationId: string; // e.g. "SIH-REG-1001"
  teamName: string;
  leadName: string;
  leadDepartment: string;
  leadMobile: string;
  leadGender?: string;
  leadAcademicYear?: string;
  member1: string;
  member1Gender?: string;
  member1Email?: string;
  member1Phone?: string;
  member1AcademicYear?: string;
  member2: string;
  member2Gender?: string;
  member2Email?: string;
  member2Phone?: string;
  member2AcademicYear?: string;
  member3: string;
  member3Gender?: string;
  member3Email?: string;
  member3Phone?: string;
  member3AcademicYear?: string;
  member4: string;
  member4Gender?: string;
  member4Email?: string;
  member4Phone?: string;
  member4AcademicYear?: string;
  member5: string;
  member5Gender?: string;
  member5Email?: string;
  member5Phone?: string;
  member5AcademicYear?: string;
  hasFemaleMember: boolean;
  mentorName: string;
  problemStatementId: string;
  submittedAt: string;
  studentEmail?: string;
  paymentStatus?: "free" | "paid" | "pending" | "pending_verification" | "rejected";
  paymentMode?: "gateway" | "manual_upi" | "free";
  paymentId?: string;
  orderId?: string;
  amountPaid?: number;
  paymentProofUrl?: string;
  paymentProofFileName?: string;
  paymentProofBase64?: string;
  upiTransactionId?: string;
  paymentRemarks?: string;
  paymentVerifiedBy?: string;
  paymentVerifiedAt?: string;
  abstract?: string;
  implementationSteps?: string;
  pptFileName?: string;
  pptBase64?: string;
  pptFileUrl?: string;
  proposalStatus?: "saved" | "submitted";
  assignedEvaluator?: string;
  evaluatorScores?: Record<string, number>;
  evaluationNotes?: string;
  evaluationStatus?: "pending" | "completed";
  isEvaluationLocked?: boolean;
  evaluationLockedBy?: string;
  evaluationLockedAt?: string;
  isFinalSelected?: boolean;
  selectionNotes?: string;
  approvalStatus?: "pending" | "verified" | "approved" | "under_review" | "rejected";
  approvalNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  totalScore?: number;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  maxScore: number;
  description?: string;
}

export interface Student {
  id: string;
  email: string;
  passwordHash?: string;
  createdAt: string;
  name?: string;
  gender?: string;
  department?: string;
  mobile?: string;
  academicYear?: string;
  rollNumber?: string;
}

export interface FeeConfig {
  savedProblemStatements?: ProblemStatement[];
  feeEnabled: boolean;
  feeAmount: number;
  paymentMode?: "gateway" | "manual_upi" | "both" | "free";
  manualPaymentEnabled?: boolean;
  upiQrCodeUrl?: string;
  upiId?: string;
  upiPayeeName?: string;
  upiInstructions?: string;
  requirePaymentScreenshot?: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  jwtEnabled?: boolean;
  emailEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  portalTheme?: "light" | "dark";
  logoUrl?: string;
  portalTitle?: string;
  portalCaption?: string;
  teamMembersCount?: number;
  genderDiversityRequired?: boolean;
  registrationDeadline?: string;
  submissionDeadline?: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  maxTeamsPerProblemStatement?: number;

  // SMS Gateway config
  smsEnabled?: boolean;
  smsProvider?: "twilio" | "msg91" | "custom";
  twilioSid?: string;
  twilioAuthToken?: string;
  twilioFrom?: string;
  msg91AuthKey?: string;
  msg91SenderId?: string;
  msg91Route?: string;
  smsCustomUrl?: string;
  smsCustomMethod?: "GET" | "POST";
  smsCustomHeaders?: string;
  smsCustomPayload?: string;

  // WhatsApp Business profile config
  whatsappEnabled?: boolean;
  whatsappProvider?: "meta" | "custom";
  whatsappAccessToken?: string;
  whatsappPhoneId?: string;
  whatsappWabaId?: string;
  whatsappCustomUrl?: string;
  whatsappCustomMethod?: "GET" | "POST";
  whatsappCustomHeaders?: string;
  whatsappCustomPayload?: string;

  // External DB Configuration
  dbEnabled?: boolean;
  dbType?: "none" | "mongodb" | "sql";
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUsername?: string;
  dbPassword?: string;
  dbCollectionOrTable?: string;
  dbStatus?: string;

  // Student Profile & Member updates lock
  lockStudentUpdates?: boolean;
  lockRegisterAnotherTeam?: boolean;

  // Customizable Certificates
  enableCertificates?: boolean;
  certificateTitle?: string;
  certificateSubtitle?: string;
  certificateBody?: string;
  certificateSignatory1Name?: string;
  certificateSignatory1Title?: string;
  certificateSignatory2Name?: string;
  certificateSignatory2Title?: string;
  certificateSignatories?: Signatory[];
  certificateBgType?: "classic" | "modern" | "tech" | "image";
  certificateBgUrl?: string;
  certificateBorderColor?: string;
  certificateDateText?: string;
  creditsTitle?: string;
  creditsContent?: string;
  creditsEnabled?: boolean;

  // Project Proposal Sample PPT & Demo Link
  samplePptEnabled?: boolean;
  samplePptUrl?: string;
  samplePptFileName?: string;
  samplePptFileBase64?: string;
  samplePptFileUrl?: string;
  samplePptDescription?: string;

  // Consent / Nomination Letter Configuration (Customizable strictly by Super Admin)
  consentLetterEnabled?: boolean;
  consentLetterAicteNo?: string;
  consentLetterPrincipalName?: string;
  consentLetterDesignation1?: string;
  consentLetterDesignation2?: string;
  consentLetterSignatureUrl?: string;
  consentLetterStampUrl?: string;
  consentLetterShowSignature?: boolean;
  consentLetterShowStamp?: boolean;
  consentLetterIncludeLetterhead?: boolean;
  consentLetterCustomSubject?: string;
  consentLetterBodyTemplate?: string;
  consentLetterRequireSelection?: boolean;
}

export interface Signatory {
  id: string;
  name: string;
  title: string;
}


export interface Stats {
  totalTeams: number;
  departmentCounts: Record<string, number>;
  femaleCount: number;
  hardwareCount: number;
  softwareCount: number;
  totalMaleStudents?: number;
  totalFemaleStudents?: number;
  totalMaleMembers?: number;
  totalFemaleMembers?: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl?: string;
  siteUrl?: string;
}

export interface Patron {
  id: string;
  name: string;
  position: string; // e.g. President, Secretary, Technical Director
  imageUrl?: string; // base64 photo
}

export interface TeamSpoc {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  imageUrl?: string;
}

export interface PreviousPhoto {
  id: string;
  title: string;
  imageUrl?: string;
  description?: string;
  groupTitle?: string; // The name of the gallery/album group
}

export interface TimelineItem {
  id: string;
  phase: string;
  title: string;
  subtitle: string;
  date: string;
  timeText: string;
  description: string;
  deliverables: string[];
  status: "completed" | "active" | "deadline" | "upcoming" | "event";
  statusLabel: string;
  isKeyDate?: boolean;
  keyLabel?: string;
  enabled?: boolean;
}

export interface HomepageContent {
  sihDetails: {
    title: string;
    description: string;
    slogan?: string;
    dates?: string;
    bannerUrl?: string;
  };
  sponsors: Sponsor[];
  patrons?: Patron[];
  studentSpocs: TeamSpoc[];
  collegeSpocs: TeamSpoc[];
  previousPhotos: PreviousPhoto[];
  showTimeline?: boolean;
  timelineTitle?: string;
  timelineSubtitle?: string;
  timelineEvents?: TimelineItem[];
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  label: string;
  type: "system" | "custom";
  target: string;
  order: number;
}

export interface LiveUpdate {
  id: string;
  text: string;
  createdAt: string;
  isImportant?: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}


