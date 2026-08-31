/**
 * Centralized Server-Side Business Rules Engine for Team Registration
 * Authoritative backend validation ensuring integrity across all registration, roster update, and proposal workflows.
 */

import { Registration, ProblemStatement, FeeConfig } from "../src/types";

export interface TeamMemberEntry {
  role: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  department?: string;
  academicYear?: string;
  rollNumber?: string;
}

export interface BusinessRuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  membersList?: TeamMemberEntry[];
}

/**
 * Extracts and normalizes team members from any registration payload.
 */
export function extractTeamMembers(data: Partial<Registration>): TeamMemberEntry[] {
  const members: TeamMemberEntry[] = [];

  // 1. Team Leader
  if (data.leadName && data.leadName.trim()) {
    members.push({
      role: "Team Leader",
      name: data.leadName.trim(),
      email: (data.studentEmail || (data as any).leadEmail || "").trim().toLowerCase(),
      phone: (data.leadMobile || "").trim(),
      gender: (data.leadGender || "").trim(),
      department: (data.leadDepartment || "").trim(),
      academicYear: (data.leadAcademicYear || "").trim(),
      rollNumber: ((data as any).leadRollNumber || "").trim().toUpperCase()
    });
  }

  // 2. Member 1
  if (data.member1 && data.member1.trim()) {
    members.push({
      role: "Member 1",
      name: data.member1.trim(),
      email: (data.member1Email || "").trim().toLowerCase(),
      phone: (data.member1Phone || (data as any).member1Mobile || "").trim(),
      gender: (data.member1Gender || "").trim(),
      department: ((data as any).member1Department || "").trim(),
      academicYear: (data.member1AcademicYear || "").trim(),
      rollNumber: ((data as any).member1RollNumber || "").trim().toUpperCase()
    });
  }

  // 3. Member 2
  if (data.member2 && data.member2.trim()) {
    members.push({
      role: "Member 2",
      name: data.member2.trim(),
      email: (data.member2Email || "").trim().toLowerCase(),
      phone: (data.member2Phone || (data as any).member2Mobile || "").trim(),
      gender: (data.member2Gender || "").trim(),
      department: ((data as any).member2Department || "").trim(),
      academicYear: (data.member2AcademicYear || "").trim(),
      rollNumber: ((data as any).member2RollNumber || "").trim().toUpperCase()
    });
  }

  // 4. Member 3
  if (data.member3 && data.member3.trim()) {
    members.push({
      role: "Member 3",
      name: data.member3.trim(),
      email: (data.member3Email || "").trim().toLowerCase(),
      phone: (data.member3Phone || (data as any).member3Mobile || "").trim(),
      gender: (data.member3Gender || "").trim(),
      department: ((data as any).member3Department || "").trim(),
      academicYear: (data.member3AcademicYear || "").trim(),
      rollNumber: ((data as any).member3RollNumber || "").trim().toUpperCase()
    });
  }

  // 5. Member 4
  if (data.member4 && data.member4.trim()) {
    members.push({
      role: "Member 4",
      name: data.member4.trim(),
      email: (data.member4Email || "").trim().toLowerCase(),
      phone: (data.member4Phone || (data as any).member4Mobile || "").trim(),
      gender: (data.member4Gender || "").trim(),
      department: ((data as any).member4Department || "").trim(),
      academicYear: (data.member4AcademicYear || "").trim(),
      rollNumber: ((data as any).member4RollNumber || "").trim().toUpperCase()
    });
  }

  // 6. Member 5
  if (data.member5 && data.member5.trim()) {
    members.push({
      role: "Member 5",
      name: data.member5.trim(),
      email: (data.member5Email || "").trim().toLowerCase(),
      phone: (data.member5Phone || (data as any).member5Mobile || "").trim(),
      gender: (data.member5Gender || "").trim(),
      department: ((data as any).member5Department || "").trim(),
      academicYear: (data.member5AcademicYear || "").trim(),
      rollNumber: ((data as any).member5RollNumber || "").trim().toUpperCase()
    });
  }

  return members;
}

/**
 * Format a date timestamp into Indian Standard Time display string
 */
function formatDeadline(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Authoritative Server Validation for Team Registration & Submission
 */
export function validateTeamRegistration(
  payload: Partial<Registration>,
  settings: FeeConfig,
  existingRegistrations: Registration[],
  problemStatements: ProblemStatement[],
  options: {
    isUpdate?: boolean;
    currentRegistrationId?: string;
    authenticatedStudentEmail?: string;
  } = {}
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ==========================================
  // RULE 1: REGISTRATION DEADLINE CHECK
  // ==========================================
  if (!options.isUpdate && settings.registrationDeadline && settings.registrationDeadline.trim() !== "") {
    const deadlineTime = new Date(settings.registrationDeadline).getTime();
    if (!isNaN(deadlineTime) && Date.now() > deadlineTime) {
      errors.push(
        `Registration Deadline Closed: Team registrations officially ended on ${formatDeadline(
          settings.registrationDeadline
        )}. No new registrations are accepted.`
      );
      return { isValid: false, errors, warnings };
    }
  }

  // ==========================================
  // RULE 2: CORE MANDATORY FIELDS
  // ==========================================
  if (!payload.teamName || !payload.teamName.trim()) {
    errors.push("Team Name is required.");
  }
  if (!payload.leadName || !payload.leadName.trim()) {
    errors.push("Team Leader Name is required.");
  }
  if (!payload.leadDepartment || !payload.leadDepartment.trim()) {
    errors.push("Team Leader Department is required.");
  }
  if (!payload.leadMobile || !payload.leadMobile.trim()) {
    errors.push("Team Leader Mobile Number is required.");
  } else {
    const mobileClean = payload.leadMobile.trim().replace(/^(\+91|91)/, "");
    if (!/^[6-9]\d{9}$/.test(mobileClean)) {
      errors.push("Team Leader Mobile Number must be a valid 10-digit Indian mobile number (starting with 6-9).");
    }
  }
  if (!payload.mentorName || !payload.mentorName.trim()) {
    errors.push("Faculty Mentor Name is required.");
  }
  if (!payload.problemStatementId || !payload.problemStatementId.trim()) {
    errors.push("Problem Statement selection is required.");
  }

  // ==========================================
  // RULE 3: AUTHENTICATION & STUDENT ELIGIBILITY
  // ==========================================
  if (settings.jwtEnabled && options.authenticatedStudentEmail) {
    const tokenEmail = options.authenticatedStudentEmail.trim().toLowerCase();
    const payloadEmail = (payload.studentEmail || "").trim().toLowerCase();
    if (payloadEmail && tokenEmail !== payloadEmail) {
      errors.push("Security Violation: Registration must be submitted using your own verified student account.");
    }
  }

  // Check 1-team-per-student-account rule
  if (!options.isUpdate && payload.studentEmail && (settings.lockRegisterAnotherTeam || settings.jwtEnabled)) {
    const studentEmailClean = payload.studentEmail.trim().toLowerCase();
    const existingStudentTeam = existingRegistrations.find(
      r => r.studentEmail?.trim().toLowerCase() === studentEmailClean && r.registrationId !== options.currentRegistrationId
    );
    if (existingStudentTeam) {
      errors.push(
        `Account Limit: You have already registered Team "${existingStudentTeam.teamName}" (ID: ${existingStudentTeam.registrationId}). Multiple team registrations under one student account are restricted.`
      );
    }
  }

  // ==========================================
  // RULE 4: TEAM NAME UNIQUENESS (CASE-INSENSITIVE)
  // ==========================================
  if (payload.teamName && payload.teamName.trim()) {
    const cleanTeamName = payload.teamName.trim().toLowerCase();
    const duplicateTeam = existingRegistrations.find(
      r => r.teamName.trim().toLowerCase() === cleanTeamName && r.registrationId !== options.currentRegistrationId && r.id !== options.currentRegistrationId
    );
    if (duplicateTeam) {
      errors.push(`Duplicate Team Name: The team name "${payload.teamName.trim()}" is already registered. Please select a unique team name.`);
    }
  }

  // ==========================================
  // RULE 5: TEAM SIZE & ROSTER COMPLETION
  // ==========================================
  const count = settings.teamMembersCount ?? 5; // Default 5 members + 1 leader = 6
  const minSize = settings.minTeamSize ?? (count + 1);
  const maxSize = settings.maxTeamSize ?? (count + 1);

  if (count >= 1 && (!payload.member1 || !payload.member1.trim())) {
    errors.push("Member 1 Name is required.");
  }
  if (count >= 2 && (!payload.member2 || !payload.member2.trim())) {
    errors.push("Member 2 Name is required.");
  }
  if (count >= 3 && (!payload.member3 || !payload.member3.trim())) {
    errors.push("Member 3 Name is required.");
  }
  if (count >= 4 && (!payload.member4 || !payload.member4.trim())) {
    errors.push("Member 4 Name is required.");
  }
  if (count >= 5 && (!payload.member5 || !payload.member5.trim())) {
    errors.push("Member 5 Name is required.");
  }

  const membersList = extractTeamMembers(payload);
  const totalTeamSize = membersList.length;

  if (totalTeamSize < minSize) {
    errors.push(`Team Size Requirement: Team must consist of at least ${minSize} members (Currently provided: ${totalTeamSize}).`);
  }
  if (totalTeamSize > maxSize) {
    errors.push(`Team Size Limit: Team size cannot exceed ${maxSize} members (Currently provided: ${totalTeamSize}).`);
  }

  // ==========================================
  // RULE 6: FEMALE MEMBER REQUIREMENT (GENDER DIVERSITY)
  // ==========================================
  const genderReq = settings.genderDiversityRequired !== false;
  if (genderReq && membersList.length > 0) {
    const hasFemaleMember = membersList.some(m => (m.gender || "").toLowerCase() === "female");
    if (!hasFemaleMember) {
      errors.push(
        `SIH Gender Diversity Mandate: Smart India Hackathon guidelines strictly mandate at least ONE female student in every ${minSize}-member team. Please ensure at least one team member's gender is set to Female.`
      );
    }
  }

  // ==========================================
  // RULE 7: INTRA-TEAM DUPLICATE PREVENTION (WITHIN SAME TEAM)
  // ==========================================
  const seenEmails = new Map<string, string>();
  const seenPhones = new Map<string, string>();
  const seenRollNos = new Map<string, string>();

  for (const m of membersList) {
    // Check Intra-team Email duplicate
    if (m.email && m.email.trim() !== "") {
      const em = m.email.trim().toLowerCase();
      if (seenEmails.has(em)) {
        errors.push(
          `Intra-Team Conflict: Email address "${m.email}" is assigned to both ${seenEmails.get(em)} and ${m.role}. Each team member must have a distinct email.`
        );
      } else {
        seenEmails.set(em, m.role);
      }
    }

    // Check Intra-team Phone duplicate
    if (m.phone && m.phone.trim() !== "") {
      const ph = m.phone.trim().replace(/^(\+91|91)/, "");
      if (ph.length >= 10) {
        if (seenPhones.has(ph)) {
          errors.push(
            `Intra-Team Conflict: Mobile number "${m.phone}" is assigned to both ${seenPhones.get(ph)} and ${m.role}. Each team member must have their own active contact number.`
          );
        } else {
          seenPhones.set(ph, m.role);
        }
      }
    }

    // Check Intra-team Roll Number duplicate
    if (m.rollNumber && m.rollNumber.trim() !== "") {
      const roll = m.rollNumber.trim().toUpperCase();
      if (seenRollNos.has(roll)) {
        errors.push(
          `Intra-Team Conflict: Student Roll Number "${m.rollNumber}" is assigned to both ${seenRollNos.get(roll)} and ${m.role}.`
        );
      } else {
        seenRollNos.set(roll, m.role);
      }
    }
  }

  // ==========================================
  // RULE 8: INTER-TEAM DUPLICATE STUDENT PREVENTION (ACROSS ALL REGISTERED TEAMS)
  // ==========================================
  const otherTeams = existingRegistrations.filter(
    r => r.registrationId !== options.currentRegistrationId && r.id !== options.currentRegistrationId
  );

  for (const currentMember of membersList) {
    const curEmail = currentMember.email?.trim().toLowerCase();
    const curPhone = currentMember.phone?.trim().replace(/^(\+91|91)/, "");
    const curRoll = currentMember.rollNumber?.trim().toUpperCase();

    for (const otherTeam of otherTeams) {
      const otherMembers = extractTeamMembers(otherTeam);

      for (const om of otherMembers) {
        const omEmail = om.email?.trim().toLowerCase();
        const omPhone = om.phone?.trim().replace(/^(\+91|91)/, "");
        const omRoll = om.rollNumber?.trim().toUpperCase();

        // Check Duplicate Email across teams
        if (curEmail && omEmail && curEmail === omEmail) {
          errors.push(
            `Duplicate Student Registered: ${currentMember.role} "${currentMember.name}" (${curEmail}) is already registered in Team "${otherTeam.teamName}" (Registration ID: ${otherTeam.registrationId}). A student cannot be part of multiple teams.`
          );
        }

        // Check Duplicate Phone across teams
        else if (curPhone && omPhone && curPhone.length >= 10 && curPhone === omPhone) {
          errors.push(
            `Duplicate Contact Detected: Mobile number "${currentMember.phone}" for ${currentMember.role} "${currentMember.name}" is already registered with Team "${otherTeam.teamName}" (${otherTeam.registrationId}).`
          );
        }

        // Check Duplicate Roll Number across teams
        else if (curRoll && omRoll && curRoll === omRoll) {
          errors.push(
            `Duplicate Student Roll Number: Roll number "${curRoll}" for ${currentMember.role} "${currentMember.name}" is already registered under Team "${otherTeam.teamName}" (${otherTeam.registrationId}).`
          );
        }
      }
    }
  }

  // ==========================================
  // RULE 9: PROBLEM STATEMENT SELECTION & QUOTA
  // ==========================================
  if (payload.problemStatementId) {
    const matchedPS = problemStatements.find(ps => ps.id === payload.problemStatementId);
    if (!matchedPS) {
      errors.push("Selected Problem Statement does not exist in the official active list.");
    } else {
      // Check Problem Statement Quota (if configured)
      const maxPerPS = settings.maxTeamsPerProblemStatement;
      if (maxPerPS && maxPerPS > 0) {
        const teamsForPS = otherTeams.filter(r => r.problemStatementId === payload.problemStatementId);
        if (teamsForPS.length >= maxPerPS) {
          errors.push(
            `Problem Statement Full: Problem Statement "${matchedPS.code} - ${matchedPS.title}" has reached its maximum capacity of ${maxPerPS} teams. Please select another problem statement.`
          );
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    membersList
  };
}

/**
 * Authoritative Server Validation for Project Proposal Submission / Edits
 */
export function validateProposalSubmission(
  payload: {
    abstract?: string;
    implementationSteps?: string;
    pptFileName?: string;
    pptBase64?: string;
    proposalStatus?: string;
  },
  currentRegistration: Registration,
  settings: FeeConfig
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Submission Deadline Check
  if (settings.submissionDeadline && settings.submissionDeadline.trim() !== "") {
    const deadlineTime = new Date(settings.submissionDeadline).getTime();
    if (!isNaN(deadlineTime) && Date.now() > deadlineTime) {
      errors.push(
        `Submission Deadline Closed: Project proposal and PPT submissions officially closed on ${formatDeadline(
          settings.submissionDeadline
        )}. Modifications are locked.`
      );
      return { isValid: false, errors, warnings };
    }
  }

  // 2. Lock Updates Check
  if (settings.lockStudentUpdates) {
    errors.push("Proposal updates are currently locked by the SPOC Administrator.");
    return { isValid: false, errors, warnings };
  }

  // 3. Final Submission Completeness
  if (payload.proposalStatus === "submitted") {
    if (!payload.abstract || !payload.abstract.trim()) {
      errors.push("Project Abstract is required for final submission.");
    }
    if (!payload.implementationSteps || !payload.implementationSteps.trim()) {
      errors.push("Implementation Methodology & Steps are required for final submission.");
    }
    if (!payload.pptFileName && !currentRegistration.pptFileName && !currentRegistration.pptFileUrl) {
      errors.push("Presentation Slide Deck (PPTX/PDF) upload is mandatory for final proposal submission.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
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

  if (teamAbbr === adminAbbr) return true;
  if (cleanTeam.includes(adminAbbr) || cleanAdmin.includes(teamAbbr)) return true;

  return false;
}

