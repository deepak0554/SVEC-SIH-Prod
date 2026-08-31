import { Request, Response } from "express";
import { studentService, StudentService } from "../services/student.service";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../auth";

export class StudentController {
  constructor(private service: StudentService = studentService) {}

  public getAllStudents = async (req: Request, res: Response): Promise<void> => {
    try {
      const students = await this.service.getAllStudents();
      res.json(students);
    } catch (err: any) {
      console.error("[StudentController.getAllStudents Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch students" },
        message: "Failed to fetch students"
      });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
          message: "Email is required"
        });
        return;
      }

      let result = await this.service.authenticateStudent(email, password);
      // Auto-provision student if not existing on passwordless login or first sign-in
      if (!result.success && !password) {
        result = await this.service.registerStudent({ email });
      }

      if (!result.success || !result.student) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: result.error || "Authentication failed" },
          message: result.error || "Authentication failed"
        });
        return;
      }

      const token = jwt.sign(
        { email: result.student.email, role: "student", id: result.student.id },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      res.json({
        token,
        student: result.student
      });
    } catch (err: any) {
      console.error("[StudentController.login Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Login failed" },
        message: "Login failed"
      });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.registerStudent(req.body);
      if (!result.success || !result.student) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Registration failed" },
          message: result.error || "Registration failed"
        });
        return;
      }

      const token = jwt.sign(
        { email: result.student.email, role: "student", id: result.student.id },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      res.status(201).json({
        token,
        student: result.student
      });
    } catch (err: any) {
      console.error("[StudentController.register Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Registration failed" },
        message: "Registration failed"
      });
    }
  };

  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = (req as any).studentUser?.email || (req as any).user?.email || req.query.email;
      if (!email) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
          message: "Email is required"
        });
        return;
      }

      const student = await this.service.getStudentByEmail(email as string);
      if (!student) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Student profile not found" },
          message: "Student profile not found"
        });
        return;
      }

      const team = await this.service.getStudentTeam(student.email);
      res.json({
        student,
        team
      });
    } catch (err: any) {
      console.error("[StudentController.getProfile Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch profile" },
        message: "Failed to fetch profile"
      });
    }
  };

  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = (req as any).studentUser?.email || (req as any).user?.email || req.body.email;
      if (!email) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
          message: "Email is required"
        });
        return;
      }

      const result = await this.service.updateProfile(email, req.body);
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: result.error || "Failed to update profile" },
          message: result.error || "Failed to update profile"
        });
        return;
      }

      res.json(result.student);
    } catch (err: any) {
      console.error("[StudentController.updateProfile Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update profile" },
        message: "Failed to update profile"
      });
    }
  };

  public deleteStudent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await this.service.deleteStudent(id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
          message: "Student not found"
        });
        return;
      }
      res.json({ message: "Student deleted successfully" });
    } catch (err: any) {
      console.error("[StudentController.deleteStudent Error]:", err);
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to delete student" },
        message: "Failed to delete student"
      });
    }
  };
}

export const studentController = new StudentController();
