import { Request, Response } from "express";
import { evaluationService, EvaluationService } from "../services/evaluation.service";

export class EvaluationController {
  constructor(private service: EvaluationService = evaluationService) {}

  public getCriteria = async (req: Request, res: Response): Promise<void> => {
    try {
      const criteria = await this.service.getCriteria();
      res.json(criteria);
    } catch (err: any) {
      console.error("[EvaluationController.getCriteria Error]:", err);
      res.status(500).json({ error: "Failed to fetch evaluation criteria" });
    }
  };

  public updateCriteria = async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await this.service.updateCriteria(req.body);
      if (!success) {
        res.status(400).json({ error: "Failed to update criteria" });
        return;
      }
      res.json({ success: true, message: "Criteria updated successfully" });
    } catch (err: any) {
      console.error("[EvaluationController.updateCriteria Error]:", err);
      res.status(500).json({ error: "Failed to save criteria" });
    }
  };

  public getEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { registrationId } = req.query;
      const evals = await this.service.getEvaluations(registrationId as string);
      res.json(evals);
    } catch (err: any) {
      console.error("[EvaluationController.getEvaluations Error]:", err);
      res.status(500).json({ error: "Failed to fetch evaluations" });
    }
  };

  public submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const evaluatorUsername = (req as any).user?.username || req.body.evaluatorUsername || "Jury";
      const result = await this.service.submitEvaluation({
        ...req.body,
        evaluatorUsername
      });

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json(result.evaluation);
    } catch (err: any) {
      console.error("[EvaluationController.submitEvaluation Error]:", err);
      res.status(500).json({ error: "Failed to submit evaluation" });
    }
  };

  public getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const leaderboard = await this.service.getLeaderboard();
      res.json(leaderboard);
    } catch (err: any) {
      console.error("[EvaluationController.getLeaderboard Error]:", err);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  };
}

export const evaluationController = new EvaluationController();
