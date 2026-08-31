import { BaseRepository } from "./base.repository";
import { EvaluationCriterion } from "../../src/types";
import { TeamEvaluation } from "../db";

export class EvaluationRepository extends BaseRepository {
  /**
   * Fetch all evaluation criteria ordered by sort_order
   */
  public async getCriteria(): Promise<EvaluationCriterion[]> {
    return this.dbManager.getEvaluationCriteria();
  }

  /**
   * Save or replace evaluation criteria list
   * Uses parameterized queries ($1..$5)
   */
  public async saveCriteria(criteria: EvaluationCriterion[]): Promise<boolean> {
    return this.dbManager.saveEvaluationCriteria(criteria);
  }

  /**
   * Fetch evaluations, optionally filtered by registration ID
   * Uses parameterized query ($1)
   */
  public async getEvaluations(registrationId?: string): Promise<TeamEvaluation[]> {
    return this.dbManager.getEvaluations(registrationId);
  }

  /**
   * Save jury evaluation record and update team registration total_score
   * Uses parameterized query ($1..$8)
   */
  public async saveEvaluation(evaluation: TeamEvaluation): Promise<boolean> {
    return this.dbManager.saveEvaluation(evaluation);
  }
}

export const evaluationRepository = new EvaluationRepository();
