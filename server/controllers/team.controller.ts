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
      res.status(500).json({ error: "Failed to fetch registrations" });
    }
  };

  public getTeamById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const team = await this.service.getTeamById(id);
      if (!team) {
        res.status(404).json({ error: "Team registration not found" });
        return;
      }
      res.json(team);
    } catch (err: any) {
      console.error("[TeamController.getTeamById Error]:", err);
      res.status(500).json({ error: "Failed to fetch registration" });
    }
  };

  public registerTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.registerTeam(req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.status(201).json(result.registration);
    } catch (err: any) {
      console.error("[TeamController.registerTeam Error]:", err);
      res.status(500).json({ error: "Failed to create registration" });
    }
  };

  public updateTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.updateTeam(id, req.body);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json(result.registration);
    } catch (err: any) {
      console.error("[TeamController.updateTeam Error]:", err);
      res.status(500).json({ error: "Failed to update registration" });
    }
  };

  public deleteTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await this.service.deleteTeam(id);
      if (!success) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json({ message: "Registration deleted successfully" });
    } catch (err: any) {
      console.error("[TeamController.deleteTeam Error]:", err);
      res.status(500).json({ error: "Failed to delete registration" });
    }
  };

  public uploadAbstract = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const result = await this.service.uploadTeamAbstract(
        id,
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, fileUrl: result.fileUrl });
    } catch (err: any) {
      console.error("[TeamController.uploadAbstract Error]:", err);
      res.status(500).json({ error: "Failed to upload abstract" });
    }
  };

  public toggleSelection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isSelected, selectionNotes } = req.body;
      const success = await this.service.toggleSelection(id, !!isSelected, selectionNotes);
      if (!success) {
        res.status(404).json({ error: "Team not found" });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[TeamController.toggleSelection Error]:", err);
      res.status(500).json({ error: "Failed to update selection status" });
    }
  };
}

export const teamController = new TeamController();
