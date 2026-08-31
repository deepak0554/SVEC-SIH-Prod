import { BaseRepository } from "./base.repository";
import { AdminUser } from "../auth";

export class AdminRepository extends BaseRepository {
  /**
   * Fetch all admin and jury accounts
   */
  public async findAll(): Promise<AdminUser[]> {
    return this.dbManager.getAdmins();
  }

  /**
   * Find admin by username (case-insensitive)
   * Uses parameterized query ($1)
   */
  public async findByUsername(username: string): Promise<AdminUser | null> {
    return this.dbManager.getAdminByUsername(username);
  }

  /**
   * Save or update admin account
   * Uses parameterized query ($1..$4)
   */
  public async save(admin: AdminUser): Promise<boolean> {
    return this.dbManager.saveAdmin(admin);
  }

  /**
   * Batch save admin accounts
   */
  public async saveBatch(admins: AdminUser[]): Promise<boolean> {
    return this.dbManager.saveAdmins(admins);
  }

  /**
   * Delete admin by username
   * Uses parameterized query ($1)
   */
  public async delete(username: string): Promise<boolean> {
    return this.dbManager.deleteAdmin(username);
  }
}

export const adminRepository = new AdminRepository();
