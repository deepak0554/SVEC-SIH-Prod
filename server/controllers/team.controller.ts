import { Request, Response } from "express";
import { teamService, TeamService } from "../services/team.service";

export class TeamController {
  constructor(private service: TeamService = teamService) {}

  public getAllTeams = async (req: Request, res: Response): Promise<void> => {
    try {
      const teams = await this.service.getAllTeams();
      res.json(teams);
    } catch (err: any) {
      console.error("[TeamController.getAllTeams Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch registrations" },
        message: "Failed to fetch registrations"
      });
    }
  };

  public getTeamById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const team = await this.service.getTeamById(id);
      if (!team) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Team registration not found" },
          message: "Team registration not found"
        });
        return;
      }
      res.json(team);
    } catch (err: any) {
      console.error("[TeamController.getTeamById Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch registration" },
        message: "Failed to fetch registration"
      });
    }
  };

  public registerTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.registerTeam(req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Failed to create registration" },
          message: result.error || "Failed to create registration"
        });
        return;
      }
      res.status(201).json(result.registration);
    } catch (err: any) {
      console.error("[TeamController.registerTeam Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create registration" },
        message: "Failed to create registration"
      });
    }
  };

  public updateTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.updateTeam(id, req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Failed to update registration" },
          message: result.error || "Failed to update registration"
        });
        return;
      }
      res.json(result.registration);
    } catch (err: any) {
      console.error("[TeamController.updateTeam Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update registration" },
        message: "Failed to update registration"
      });
    }
  };

  public deleteTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await this.service.deleteTeam(id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Team not found" },
          message: "Team not found"
        });
        return;
      }
      res.json({ message: "Registration deleted successfully" });
    } catch (err: any) {
      console.error("[TeamController.deleteTeam Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to delete registration" },
        message: "Failed to delete registration"
      });
    }
  };

  public uploadAbstract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "No file uploaded" },
          message: "No file uploaded"
        });
        return;
      }

      const result = await this.service.uploadTeamAbstract(
        id,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Failed to upload abstract" },
          message: result.error || "Failed to upload abstract"
        });
        return;
      }

      res.json({ success: true, fileUrl: result.fileUrl });
    } catch (err: any) {
      console.error("[TeamController.uploadAbstract Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to upload abstract" },
        message: "Failed to upload abstract"
      });
    }
  };
}

export const teamController = new TeamController();
