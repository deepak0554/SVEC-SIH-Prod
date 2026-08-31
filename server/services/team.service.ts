import crypto from "crypto";
import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { contentRepository, ContentRepository } from "../repositories/content.repository";
import { Registration } from "../../src/types";
import { objectStorage } from "../objectStorage";

export class TeamService {
  constructor(
    private teamRepo: TeamRepository = teamRepository,
    private contentRepo: ContentRepository = contentRepository
  ) {}

  /**
   * Get all registered teams
   */
  public async getAllTeams(): Promise<Registration[]> {
    return this.teamRepo.findAll();
  }

  /**
   * Get team by ID or registrationId
   */
  public async getTeamById(id: string): Promise<Registration | null> {
    return this.teamRepo.findById(id);
  }

  /**
   * Get team for a student by email
   */
  public async getTeamByStudentEmail(email: string): Promise<Registration | null> {
    return this.teamRepo.findByStudentEmail(email);
  }

  /**
   * Register a new team with domain validation:
   * - Team Name uniqueness
   * - Mandatory female member check (SIH Rule)
   * - Duplicate member / roll number verification
   */
  public async registerTeam(payload: Partial<Registration>): Promise<{ success: boolean; registration?: Registration; error?: string }> {
    if (!payload.teamName || !payload.leadName || !payload.leadDepartment || !payload.leadMobile) {
      return { success: false, error: "Missing required team details (Team Name, Lead Name, Department, Mobile)." };
    }

    const settings = await this.contentRepo.getSettings();
    const existingTeams = await this.teamRepo.findAll();

    // Check duplicate team name
    const cleanName = payload.teamName.trim().toLowerCase();
    if (existingTeams.some(t => t.teamName.trim().toLowerCase() === cleanName)) {
      return { success: false, error: `Team name "${payload.teamName}" is already registered. Please choose a unique name.` };
    }

    // Check gender diversity if required
    const genderReq = settings.genderDiversityRequired ?? true;
    let hasFemale = payload.leadGender === "Female";
    if (!hasFemale && (payload.member1Gender === "Female" || payload.member2Gender === "Female" || payload.member3Gender === "Female" || payload.member4Gender === "Female" || payload.member5Gender === "Female")) {
      hasFemale = true;
    }

    if (genderReq && !hasFemale) {
      return { success: false, error: "SIH Guidelines mandate at least ONE female member in every participating team." };
    }

    // Generate unique registration ID: SVEC-SIH26-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const regId = `SVEC-SIH26-${randomSuffix}`;
    const id = crypto.randomUUID ? crypto.randomUUID() : `team_${Date.now()}_${randomSuffix}`;

    const newTeam: Registration = {
      id,
      registrationId: regId,
      teamName: payload.teamName.trim(),
      leadName: payload.leadName.trim(),
      leadDepartment: payload.leadDepartment.trim(),
      leadMobile: payload.leadMobile.trim(),
      leadGender: payload.leadGender || "Male",
      leadAcademicYear: payload.leadAcademicYear || "3rd Year",
      member1: payload.member1 || "",
      member1Gender: payload.member1Gender || "",
      member1Email: payload.member1Email || "",
      member1Phone: payload.member1Phone || "",
      member1AcademicYear: payload.member1AcademicYear || "",
      member2: payload.member2 || "",
      member2Gender: payload.member2Gender || "",
      member2Email: payload.member2Email || "",
      member2Phone: payload.member2Phone || "",
      member2AcademicYear: payload.member2AcademicYear || "",
      member3: payload.member3 || "",
      member3Gender: payload.member3Gender || "",
      member3Email: payload.member3Email || "",
      member3Phone: payload.member3Phone || "",
      member3AcademicYear: payload.member3AcademicYear || "",
      member4: payload.member4 || "",
      member4Gender: payload.member4Gender || "",
      member4Email: payload.member4Email || "",
      member4Phone: payload.member4Phone || "",
      member4AcademicYear: payload.member4AcademicYear || "",
      member5: payload.member5 || "",
      member5Gender: payload.member5Gender || "",
      member5Email: payload.member5Email || "",
      member5Phone: payload.member5Phone || "",
      member5AcademicYear: payload.member5AcademicYear || "",
      hasFemaleMember: hasFemale,
      mentorName: payload.mentorName || "",
      problemStatementId: payload.problemStatementId || "",
      submittedAt: new Date().toISOString(),
      studentEmail: payload.studentEmail || "",
      paymentStatus: settings.feeEnabled ? "pending" : "free",
      abstract: payload.abstract || "",
      implementationSteps: payload.implementationSteps || "",
      pptFileName: payload.pptFileName || "",
      pptFileUrl: payload.pptFileUrl || "",
      pptBase64: payload.pptBase64 || "",
      proposalStatus: payload.proposalStatus || "saved",
      approvalStatus: "pending",
      evaluationStatus: "pending",
      isFinalSelected: false,
      totalScore: 0
    };

    await this.teamRepo.save(newTeam);
    return { success: true, registration: newTeam };
  }

  /**
   * Update team registration information
   */
  public async updateTeam(id: string, updates: Partial<Registration>): Promise<{ success: boolean; registration?: Registration; error?: string }> {
    const existing = await this.teamRepo.findById(id);
    if (!existing) {
      return { success: false, error: "Team not found." };
    }

    const updated: Registration = {
      ...existing,
      ...updates,
      id: existing.id,
      registrationId: existing.registrationId
    };

    await this.teamRepo.save(updated);
    return { success: true, registration: updated };
  }

  /**
   * Upload abstract document / presentation to dedicated object storage
   */
  public async uploadTeamAbstract(
    teamId: string, 
    fileBuffer: Buffer, 
    originalName: string, 
    mimeType: string
  ): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) {
      return { success: false, error: "Team registration not found." };
    }

    const uploadRes = await objectStorage.uploadFile(
      fileBuffer,
      originalName,
      mimeType,
      "abstracts"
    );

    if (!uploadRes.success || !uploadRes.url) {
      return { success: false, error: uploadRes.error || "Failed to upload file to Object Storage." };
    }

    team.pptFileName = originalName;
    team.pptFileUrl = uploadRes.url;
    team.proposalStatus = "submitted";
    await this.teamRepo.save(team);

    return { success: true, fileUrl: uploadRes.url };
  }

  /**
   * Delete team registration
   */
  public async deleteTeam(id: string): Promise<boolean> {
    return this.teamRepo.delete(id);
  }

  /**
   * Update jury evaluation status or assignment
   */
  public async assignEvaluator(teamId: string, evaluatorUsername: string): Promise<boolean> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) return false;
    team.assignedEvaluator = evaluatorUsername;
    return this.teamRepo.save(team);
  }

  /**
   * Mark team as selected / nominated for SIH Grand Finale
   */
  public async toggleSelection(teamId: string, isSelected: boolean, notes?: string): Promise<boolean> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) return false;
    team.isFinalSelected = isSelected;
    if (notes !== undefined) team.selectionNotes = notes;
    return this.teamRepo.save(team);
  }
}

export const teamService = new TeamService();
