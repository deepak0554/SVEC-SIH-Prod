import crypto from "crypto";
import { studentRepository, StudentRepository } from "../repositories/student.repository";
import { teamRepository, TeamRepository } from "../repositories/team.repository";
import { Student, Registration } from "../../src/types";
import { hashPassword, comparePassword } from "../auth";

export class StudentService {
  constructor(
    private studentRepo: StudentRepository = studentRepository,
    private teamRepo: TeamRepository = teamRepository
  ) {}

  public async getAllStudents(): Promise<Student[]> {
    return this.studentRepo.findAll();
  }

  public async getStudentByEmail(email: string): Promise<Student | null> {
    return this.studentRepo.findByEmail(email);
  }

  public async registerStudent(payload: {
    email: string;
    password?: string;
    gender?: string;
    department?: string;
    mobile?: string;
  }): Promise<{ success: boolean; student?: Student; error?: string }> {
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Student email is required." };
    }

    const existing = await this.studentRepo.findByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: "A student account with this email already exists." };
    }

    const passwordHash = payload.password ? hashPassword(payload.password) : "";
    const id = crypto.randomUUID ? crypto.randomUUID() : `stud_${Date.now()}`;

    const newStudent: Student = {
      id,
      email: cleanEmail,
      passwordHash,
      gender: payload.gender || "",
      department: payload.department || "",
      mobile: payload.mobile || "",
      createdAt: new Date().toISOString()
    };

    await this.studentRepo.save(newStudent);
    return { success: true, student: newStudent };
  }

  public async authenticateStudent(email: string, password?: string): Promise<{ success: boolean; student?: Student; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const student = await this.studentRepo.findByEmail(cleanEmail);
    if (!student) {
      return { success: false, error: "No account found with this email address." };
    }

    if (student.passwordHash && password) {
      const isValid = comparePassword(password, student.passwordHash);
      if (!isValid) {
        return { success: false, error: "Invalid password." };
      }
    }

    return { success: true, student };
  }

  public async updateProfile(email: string, updates: Partial<Student>): Promise<{ success: boolean; student?: Student; error?: string }> {
    const student = await this.studentRepo.findByEmail(email);
    if (!student) {
      return { success: false, error: "Student not found." };
    }

    const updated: Student = {
      ...student,
      gender: updates.gender ?? student.gender,
      department: updates.department ?? student.department,
      mobile: updates.mobile ?? student.mobile
    };

    if (updates.passwordHash) {
      updated.passwordHash = updates.passwordHash;
    }

    await this.studentRepo.save(updated);
    return { success: true, student: updated };
  }

  public async getStudentTeam(email: string): Promise<Registration | null> {
    return this.teamRepo.findByStudentEmail(email);
  }

  public async deleteStudent(id: string): Promise<boolean> {
    return this.studentRepo.delete(id);
  }
}

export const studentService = new StudentService();
