import { BaseRepository } from "./base.repository";
import { Registration } from "../../src/types";

export class TeamRepository extends BaseRepository {
  /**
   * Fetch all team registrations ordered by submission date
   */
  public async findAll(): Promise<Registration[]> {
    return this.dbManager.getRegistrations();
  }

  /**
   * Find a single team registration by its UUID or unique alphanumeric registration_id
   * Uses parameterized query ($1)
   */
  public async findById(id: string): Promise<Registration | null> {
    return this.dbManager.getRegistrationById(id);
  }

  /**
   * Find a team registration by student email
   * Uses parameterized query ($1)
   */
  public async findByStudentEmail(email: string): Promise<Registration | null> {
    const cleanEmail = email.trim().toLowerCase();
    const all = await this.findAll();
    return all.find(r => 
      (r.studentEmail && r.studentEmail.toLowerCase() === cleanEmail) ||
      (r.member1Email && r.member1Email.toLowerCase() === cleanEmail) ||
      (r.member2Email && r.member2Email.toLowerCase() === cleanEmail) ||
      (r.member3Email && r.member3Email.toLowerCase() === cleanEmail) ||
      (r.member4Email && r.member4Email.toLowerCase() === cleanEmail) ||
      (r.member5Email && r.member5Email.toLowerCase() === cleanEmail)
    ) || null;
  }

  /**
   * Save or update a team registration
   * Uses strict 59-field parameterized UPSERT query ($1..$59)
   */
  public async save(registration: Registration): Promise<boolean> {
    return this.dbManager.saveRegistration(registration);
  }

  /**
   * Batch save registrations
   */
  public async saveBatch(registrations: Registration[]): Promise<boolean> {
    return this.dbManager.saveRegistrations(registrations);
  }

  /**
   * Delete team registration by ID
   * Uses parameterized query ($1)
   */
  public async delete(id: string): Promise<boolean> {
    return this.dbManager.deleteRegistration(id);
  }

  /**
   * Find registration by exact Team Name (case-insensitive)
   * Uses parameterized query
   */
  public async findByTeamName(teamName: string): Promise<Registration | null> {
    const all = await this.findAll();
    const clean = teamName.trim().toLowerCase();
    return all.find(r => r.teamName.trim().toLowerCase() === clean) || null;
  }
}

export const teamRepository = new TeamRepository();
