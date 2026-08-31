import crypto from "crypto";
import { evaluationRepository, EvaluationRepository } from "../repositories/evaluation.repository";
import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { EvaluationCriterion } from "../../src/types";
import { TeamEvaluation } from "../db";

export class EvaluationService {
  constructor(
    private evalRepo: EvaluationRepository = evaluationRepository,
    private teamRepo: TeamRepository = teamRepository
  ) {}

  public async getCriteria(): Promise<EvaluationCriterion[]> {
    return this.evalRepo.getCriteria();
  }

  public async updateCriteria(criteria: EvaluationCriterion[]): Promise<boolean> {
    return this.evalRepo.saveCriteria(criteria);
  }

  public async getEvaluations(registrationId?: string): Promise<TeamEvaluation[]> {
    return this.evalRepo.getEvaluations(registrationId);
  }

  /**
   * Submit or update jury scoring for a team
   */
  public async submitEvaluation(payload: {
    registrationId: string;
    evaluatorUsername: string;
    scores: Record<string, number>;
    notes?: string;
    status?: "pending" | "completed";
  }): Promise<{ success: boolean; evaluation?: TeamEvaluation; error?: string }> {
    const team = await this.teamRepo.findById(payload.registrationId);
    if (!team) {
      return { success: false, error: "Team registration not found." };
    }

    const totalScore = Object.values(payload.scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const id = `eval_${payload.registrationId}_${payload.evaluatorUsername.toLowerCase()}`;

    const evaluation: TeamEvaluation = {
      id,
      registrationId: team.id,
      evaluatorUsername: payload.evaluatorUsername,
      scores: payload.scores,
      totalScore,
      notes: payload.notes || "",
      status: payload.status || "completed",
      evaluatedAt: new Date().toISOString()
    };

    await this.evalRepo.saveEvaluation(evaluation);

    // Update team model directly
    team.evaluatorScores = payload.scores;
    team.evaluationNotes = payload.notes || "";
    team.evaluationStatus = payload.status || "completed";
    team.totalScore = totalScore;
    await this.teamRepo.save(team);

    return { success: true, evaluation };
  }

  /**
   * Get leaderboard of evaluated teams sorted by total score descending
   */
  public async getLeaderboard(): Promise<any[]> {
    const teams = await this.teamRepo.findAll();
    return teams
      .filter(t => t.totalScore && t.totalScore > 0)
      .sort((a, b) => (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0))
      .map(t => ({
        id: t.id,
        registrationId: t.registrationId,
        teamName: t.teamName,
        leadName: t.leadName,
        department: t.leadDepartment,
        problemStatementId: t.problemStatementId,
        totalScore: t.totalScore,
        evaluatorScores: t.evaluatorScores,
        evaluationStatus: t.evaluationStatus,
        isFinalSelected: t.isFinalSelected
      }));
  }
}

export const evaluationService = new EvaluationService();
