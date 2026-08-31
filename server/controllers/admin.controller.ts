import { Request, Response } from "express";
import { adminService, AdminService } from "../services/admin.service";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../auth";

export class AdminController {
  constructor(private service: AdminService = adminService) {}

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const result = await this.service.authenticateAdmin(username, password);
      if (!result.success || !result.admin) {
        res.status(401).json({ error: result.error || "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        { username: result.admin.username, role: result.admin.role },
        getJwtSecret(),
        { expiresIn: "24h" }
      );

      res.json({
        token,
        admin: {
          username: result.admin.username,
          role: result.admin.role
        }
      });
    } catch (err: any) {
      console.error("[AdminController.login Error]:", err);
      res.status(500).json({ error: "Login failed" });
    }
  };

  public getAdmins = async (req: Request, res: Response): Promise<void> => {
    try {
      const admins = await this.service.getAdmins();
      res.json(admins.map(a => ({ username: a.username, role: a.role })));
    } catch (err: any) {
      console.error("[AdminController.getAdmins Error]:", err);
      res.status(500).json({ error: "Failed to fetch admin accounts" });
    }
  };

  public createOrUpdateAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.createOrUpdateAdmin(req.body);
      if (!result.success || !result.admin) {
        res.status(400).json({ error: result.error });
        return;
      }
      res.json({ username: result.admin.username, role: result.admin.role });
    } catch (err: any) {
      console.error("[AdminController.createOrUpdateAdmin Error]:", err);
      res.status(500).json({ error: "Failed to save admin account" });
    }
  };

  public deleteAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.params;
      const success = await this.service.deleteAdmin(username);
      if (!success) {
        res.status(404).json({ error: "Admin not found" });
        return;
      }
      res.json({ message: "Admin removed successfully" });
    } catch (err: any) {
      console.error("[AdminController.deleteAdmin Error]:", err);
      res.status(500).json({ error: "Failed to delete admin" });
    }
  };

  public getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.service.getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      console.error("[AdminController.getDashboardStats Error]:", err);
      res.status(500).json({ error: "Failed to load dashboard metrics" });
    }
  };

  public getBroadcastLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const logs = await this.service.getBroadcastLogs();
      res.json(logs);
    } catch (err: any) {
      console.error("[AdminController.getBroadcastLogs Error]:", err);
      res.status(500).json({ error: "Failed to fetch broadcast logs" });
    }
  };
}

export const adminController = new AdminController();
