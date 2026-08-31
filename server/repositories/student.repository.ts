import { BaseRepository } from "./base.repository";
import { Student } from "../../src/types";

export class StudentRepository extends BaseRepository {
  /**
   * Fetch all registered student accounts
   */
  public async findAll(): Promise<Student[]> {
    return this.dbManager.getStudents();
  }

  /**
   * Find student by email address (case-insensitive)
   * Uses parameterized query ($1)
   */
  public async findByEmail(email: string): Promise<Student | null> {
    return this.dbManager.getStudentByEmail(email);
  }

  /**
   * Find student by ID or email
   */
  public async findById(id: string): Promise<Student | null> {
    const students = await this.findAll();
    return students.find(s => s.id === id || s.email.toLowerCase() === id.toLowerCase()) || null;
  }

  /**
   * Save or update student account
   * Uses parameterized UPSERT query ($1..$7)
   */
  public async save(student: Student): Promise<boolean> {
    return this.dbManager.saveStudent(student);
  }

  /**
   * Save multiple students
   */
  public async saveBatch(students: Student[]): Promise<boolean> {
    return this.dbManager.saveStudents(students);
  }

  /**
   * Delete student by ID or email
   * Uses parameterized query ($1)
   */
  public async delete(id: string): Promise<boolean> {
    return this.dbManager.deleteStudent(id);
  }
}

export const studentRepository = new StudentRepository();
