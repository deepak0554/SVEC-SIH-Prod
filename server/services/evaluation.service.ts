import { evaluationRepository, EvaluationRepository } from "../repositories/evaluation.repository";
import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { EvaluationCriterion } from "../../src/types";
import { TeamEvaluation } from "../db";
import { isDepartmentMatch } from "../businessRules";

export class EvaluationService {
  constructor(
    private evalRepo: EvaluationRepository = evaluationRepository,
    private teamRepo: TeamRepository = teamRepository
  ) {}

  public async getCriteria(): Promise<EvaluationCriterion[]> {
    return this.evalRepo.getCriteria();
  }

  public async updateCriteria(criteria: EvaluationCriterion[]): Promise<boolean> {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return false;
    }

    // Validate that every criterion has a name and positive maxScore
    for (const c of criteria) {
      if (!c.id || !c.name || typeof c.maxScore !== "number" || c.maxScore <= 0) {
        return false;
      }
    }

    return this.evalRepo.saveCriteria(criteria);
  }

  public async getEvaluations(registrationId?: string): Promise<TeamEvaluation[]> {
    return this.evalRepo.getEvaluations(registrationId);
  }

  /**
   * Submit or update jury scoring for a team with strict validation and server-side total computation
   */
  public async submitEvaluation(payload: {
    registrationId: string;
    evaluatorUsername: string;
    evaluatorRole?: string;
    evaluatorDepartment?: string;
    scores: Record<string, number>;
    notes?: string;
    status?: "pending" | "completed";
  }): Promise<{ success: boolean; evaluation?: TeamEvaluation; error?: string }> {
    const team = await this.teamRepo.findById(payload.registrationId);
    if (!team) {
      return { success: false, error: "Team registration not found." };
    }

    const normRole = (payload.evaluatorRole || "EVALUATOR").toUpperCase();
    const evaluatorUser = (payload.evaluatorUsername || "").trim().toLowerCase();

    // 1. Authorization: If EVALUATOR role, check if assigned to this team
    if (normRole === "EVALUATOR" && team.assignedEvaluator) {
      const assigned = team.assignedEvaluator.trim().toLowerCase();
      if (assigned && assigned !== evaluatorUser) {
        return {
          success: false,
          error: `Access Denied: You are not assigned to evaluate this team (Assigned: ${team.assignedEvaluator}).`
        };
      }
    }

    // 2. Authorization: If DEPT_SPOC role with a specific department, verify department match
    if (normRole === "DEPT_SPOC" && payload.evaluatorDepartment) {
      if (!isDepartmentMatch(team.leadDepartment, payload.evaluatorDepartment)) {
        return {
          success: false,
          error: `Access Denied: You can only evaluate teams from your department (${payload.evaluatorDepartment}).`
        };
      }
    }

    // 3. Evaluation Locking: Check if evaluation is locked for this team
    if (team.isEvaluationLocked && normRole !== "ADMIN") {
      return {
        success: false,
        error: "Evaluation is locked for this team. Modifications are restricted to Super Administrators."
      };
    }

    // 4. Validate Score Structure and Max Scores against system criteria
    if (!payload.scores || typeof payload.scores !== "object" || Object.keys(payload.scores).length === 0) {
      return { success: false, error: "Evaluation scores are required." };
    }

    const criteriaList = await this.evalRepo.getCriteria();
    const criteriaMap = new Map<string, EvaluationCriterion>();
    criteriaList.forEach(c => {
      criteriaMap.set(c.id, c);
      criteriaMap.set(c.id.toLowerCase(), c);
    });

    const validatedScores: Record<string, number> = {};
    let serverCalculatedTotal = 0;

    for (const [criterionKey, rawScore] of Object.entries(payload.scores)) {
      const scoreNum = Number(rawScore);
      if (isNaN(scoreNum) || !isFinite(scoreNum) || scoreNum < 0) {
        return {
          success: false,
          error: `Score for criterion "${criterionKey}" must be a non-negative number. Received: ${rawScore}`
        };
      }

      // Check max score
      const criterion = criteriaMap.get(criterionKey) || criteriaMap.get(criterionKey.toLowerCase());
      const maxAllowed = criterion ? criterion.maxScore : 100;

      if (scoreNum > maxAllowed) {
        const criterionLabel = criterion ? criterion.name : criterionKey;
        return {
          success: false,
          error: `Score for "${criterionLabel}" (${scoreNum}) exceeds the maximum allowed score of ${maxAllowed}.`
        };
      }

      validatedScores[criterionKey] = scoreNum;
      serverCalculatedTotal += scoreNum;
    }

    // Always use server-calculated total score, never trust client input
    const normalizedTotal = Math.round(serverCalculatedTotal * 100) / 100;
    const sanitizedUsername = payload.evaluatorUsername || "Jury";
    const id = `eval_${team.id}_${sanitizedUsername.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

    const evaluation: TeamEvaluation = {
      id,
      registrationId: team.id,
      evaluatorUsername: sanitizedUsername,
      scores: validatedScores,
      totalScore: normalizedTotal,
      notes: (payload.notes || "").trim(),
      status: payload.status || "completed",
      evaluatedAt: new Date().toISOString()
    };

    // Save evaluation record idempotently
    await this.evalRepo.saveEvaluation(evaluation);

    // Update team entity atomically
    team.evaluatorScores = validatedScores;
    team.evaluationNotes = evaluation.notes;
    team.evaluationStatus = evaluation.status;
    team.totalScore = normalizedTotal;
    await this.teamRepo.save(team);

    return { success: true, evaluation };
  }

  /**
   * Lock or unlock evaluation for a specific team
   */
  public async toggleEvaluationLock(
    registrationId: string, 
    locked: boolean, 
    lockedBy: string
  ): Promise<{ success: boolean; isEvaluationLocked: boolean; error?: string }> {
    const team = await this.teamRepo.findById(registrationId);
    if (!team) {
      return { success: false, isEvaluationLocked: false, error: "Team registration not found." };
    }

    team.isEvaluationLocked = locked;
    team.evaluationLockedBy = lockedBy;
    team.evaluationLockedAt = locked ? new Date().toISOString() : undefined;

    await this.teamRepo.save(team);
    return { success: true, isEvaluationLocked: locked };
  }

  /**
   * Get leaderboard of evaluated teams sorted by server-calculated total score descending
   */
  public async getLeaderboard(): Promise<any[]> {
    const teams = await this.teamRepo.findAll();
    return teams
      .filter(t => t.totalScore !== undefined && t.totalScore !== null && t.totalScore > 0)
      .sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0))
      .map(t => ({
        id: t.id,
        registrationId: t.registrationId,
        teamName: t.teamName,
        leadName: t.leadName,
        department: t.leadDepartment,
        problemStatementId: t.problemStatementId,
        totalScore: Number(t.totalScore) || 0,
        evaluatorScores: t.evaluatorScores || {},
        evaluationStatus: t.evaluationStatus || "pending",
        isEvaluationLocked: !!t.isEvaluationLocked,
        isFinalSelected: !!t.isFinalSelected
      }));
  }
}

export const evaluationService = new EvaluationService();
