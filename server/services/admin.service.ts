import { adminRepository, AdminRepository } from "../repositories/admin.repository";
import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { studentRepository, StudentRepository } from "../repositories/student.repository";
import { contentRepository, ContentRepository } from "../repositories/content.repository";
import { AdminUser, comparePassword, hashPassword } from "../auth";
import { BroadcastLog } from "../db";

export class AdminService {
  constructor(
    private adminRepo: AdminRepository = adminRepository,
    private teamRepo: TeamRepository = teamRepository,
    private studentRepo: StudentRepository = studentRepository,
    private contentRepo: ContentRepository = contentRepository
  ) {}

  public async getAdmins(): Promise<AdminUser[]> {
    return this.adminRepo.findAll();
  }

  public async getAdminByUsername(username: string): Promise<AdminUser | null> {
    return this.adminRepo.findByUsername(username);
  }

  public async authenticateAdmin(username: string, password: string): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    const admin = await this.adminRepo.findByUsername(username);
    if (!admin) {
      return { success: false, error: "Invalid username or password." };
    }

    const isMatch = comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Invalid username or password." };
    }

    return { success: true, admin };
  }

  public async createOrUpdateAdmin(payload: { username: string; password?: string; role: any }): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
    const existing = await this.adminRepo.findByUsername(payload.username);
    let passwordHash = existing ? existing.passwordHash : hashPassword("password123");

    if (payload.password) {
      passwordHash = hashPassword(payload.password);
    }

    const admin: AdminUser = {
      username: payload.username,
      passwordHash,
      role: payload.role
    };

    await this.adminRepo.save(admin);
    return { success: true, admin };
  }

  public async deleteAdmin(username: string): Promise<boolean> {
    return this.adminRepo.delete(username);
  }

  /**
   * Aggregate portal statistics
   */
  public async getDashboardStats(): Promise<any> {
    const [teams, students, statements] = await Promise.all([
      this.teamRepo.findAll(),
      this.studentRepo.findAll(),
      this.contentRepo.getProblemStatements()
    ]);

    const totalTeams = teams.length;
    const totalStudents = students.length;
    const totalSelected = teams.filter(t => t.isFinalSelected).length;
    const totalVerified = teams.filter(t => t.approvalStatus === "verified" || t.approvalStatus === "approved").length;
    const totalEvaluated = teams.filter(t => t.evaluationStatus === "completed").length;

    // Branch breakdown
    const branchCounts: Record<string, number> = {};
    for (const t of teams) {
      const dept = t.leadDepartment || "Other";
      branchCounts[dept] = (branchCounts[dept] || 0) + 1;
    }

    // Gender stats
    const femaleTeams = teams.filter(t => t.hasFemaleMember).length;

    return {
      totalTeams,
      totalStudents,
      totalSelected,
      totalVerified,
      totalEvaluated,
      totalProblemStatements: statements.length,
      femaleTeams,
      branchBreakdown: branchCounts
    };
  }

  public async logBroadcast(log: BroadcastLog): Promise<boolean> {
    return this.contentRepo.saveBroadcastLog(log);
  }

  public async getBroadcastLogs(): Promise<BroadcastLog[]> {
    return this.contentRepo.getBroadcastLogs();
  }
}

export const adminService = new AdminService();
