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
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch evaluation criteria" },
        message: "Failed to fetch evaluation criteria"
      });
    }
  };

  public updateCriteria = async (req: Request, res: Response): Promise<void> => {
    try {
      const success = await this.service.updateCriteria(req.body);
      if (!success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Failed to update criteria: Please provide valid criteria items with positive max scores." },
          message: "Failed to update criteria"
        });
        return;
      }
      res.json({ success: true, message: "Evaluation criteria updated successfully" });
    } catch (err: any) {
      console.error("[EvaluationController.updateCriteria Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to save criteria" },
        message: "Failed to save criteria"
      });
    }
  };

  public getEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { registrationId } = req.query;
      const evals = await this.service.getEvaluations(registrationId as string);
      res.json(evals);
    } catch (err: any) {
      console.error("[EvaluationController.getEvaluations Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch evaluations" },
        message: "Failed to fetch evaluations"
      });
    }
  };

  public submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const evaluatorUsername = (req as any).adminUser || (req as any).user?.username || req.body.evaluatorUsername || "Jury";
      const evaluatorRole = (req as any).adminRole || (req as any).userRole || (req as any).user?.role;
      const evaluatorDepartment = (req as any).adminDepartment;
      const registrationId = req.params?.id || req.body?.registrationId;

      const result = await this.service.submitEvaluation({
        ...req.body,
        registrationId,
        evaluatorUsername,
        evaluatorRole,
        evaluatorDepartment
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Failed to submit evaluation" },
          message: result.error || "Failed to submit evaluation"
        });
        return;
      }

      res.json({
        success: true,
        evaluation: result.evaluation,
        message: "Team evaluation submitted and stored in database successfully."
      });
    } catch (err: any) {
      console.error("[EvaluationController.submitEvaluation Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to submit evaluation: " + err.message },
        message: "Failed to submit evaluation"
      });
    }
  };

  public toggleLock = async (req: Request, res: Response): Promise<void> => {
    try {
      const registrationId = req.params?.id;
      const { locked } = req.body;
      const lockedBy = (req as any).adminUser || "ADMIN";

      const result = await this.service.toggleEvaluationLock(registrationId, !!locked, lockedBy);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Failed to toggle evaluation lock" },
          message: result.error || "Failed to toggle evaluation lock"
        });
        return;
      }

      res.json({
        success: true,
        isEvaluationLocked: result.isEvaluationLocked,
        message: result.isEvaluationLocked ? "Evaluation locked successfully." : "Evaluation unlocked successfully."
      });
    } catch (err: any) {
      console.error("[EvaluationController.toggleLock Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to toggle evaluation lock" },
        message: "Failed to toggle evaluation lock"
      });
    }
  };

  public getLeaderboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const leaderboard = await this.service.getLeaderboard();
      res.json(leaderboard);
    } catch (err: any) {
      console.error("[EvaluationController.getLeaderboard Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch leaderboard" },
        message: "Failed to fetch leaderboard"
      });
    }
  };
}

export const evaluationController = new EvaluationController();
