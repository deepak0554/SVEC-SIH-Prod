import crypto from "crypto";
import nodemailer from "nodemailer";
import { notificationRepository, NotificationRepository } from "../repositories/notification.repository";
import { BroadcastLog } from "../db";
import { Registration, Student } from "../../src/types";

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SmsConfig {
  enabled: boolean;
  provider: "twilio" | "msg91" | "custom";
  twilioSid?: string;
  twilioAuthToken?: string;
  twilioFrom?: string;
  msg91AuthKey?: string;
  msg91SenderId?: string;
  msg91Route?: string;
  customUrl?: string;
  customMethod?: string;
  customHeaders?: string;
  customPayload?: string;
}

export interface WhatsappConfig {
  enabled: boolean;
  provider: "meta" | "custom";
  accessToken?: string;
  phoneId?: string;
  wabaId?: string;
  customUrl?: string;
  customMethod?: string;
  customHeaders?: string;
  customPayload?: string;
}

export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepository = notificationRepository
  ) {}

  /**
   * Safe asynchronous email dispatch.
   * Logs status lifecycle: pending -> sent | failed
   * Never throws or interrupts caller transactions.
   */
  public async sendEmailAsync(options: {
    to: string;
    subject: string;
    html: string;
    smtpConfig?: Partial<SmtpConfig>;
    recipientGroup?: string;
    teamName?: string;
    sender?: string;
  }): Promise<{ success: boolean; logId: string; error?: string }> {
    const logId = `notif_email_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const logEntry: BroadcastLog = {
      id: logId,
      channel: "Email",
      recipient: options.to,
      recipientGroup: options.recipientGroup || "individual",
      recipientCount: 1,
      teamName: options.teamName,
      subject: options.subject,
      preview: options.subject,
      sender: options.sender || "System",
      status: "pending",
      timestamp
    };

    // Save pending status immediately
    await this.notificationRepo.save(logEntry);

    // Fire and forget non-blocking delivery
    (async () => {
      try {
        const config = options.smtpConfig;
        if (!config || !config.enabled) {
          logEntry.status = "sent";
          logEntry.error = "Email provider disabled (Simulated Delivery)";
          await this.notificationRepo.save(logEntry);
          return;
        }

        const host = (config.host || "").trim();
        const port = Number(config.port) || 587;
        const user = (config.user || "").trim();
        const pass = (config.pass || "").trim();
        const from = (config.from || "").trim() || `"SVEC SIH Support" <noreply@example.com>`;

        if (!host || !user || !pass) {
          logEntry.status = "failed";
          logEntry.error = "SMTP configuration incomplete (Host or Credentials missing)";
          await this.notificationRepo.save(logEntry);
          return;
        }

        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html
        });

        logEntry.status = "sent";
        logEntry.error = undefined;
        await this.notificationRepo.save(logEntry);
        console.log(`[NotificationService] Email successfully sent to ${options.to} (ID: ${logId})`);
      } catch (err: any) {
        logEntry.status = "failed";
        logEntry.error = err.message || "Failed to send email via SMTP";
        await this.notificationRepo.save(logEntry);
        console.error(`[NotificationService] Email delivery failure for ${options.to}:`, err.message);
      }
    })().catch(err => {
      console.error("[NotificationService] Unhandled email worker error:", err);
    });

    return { success: true, logId };
  }

  /**
   * Safe asynchronous SMS dispatch.
   * Logs status lifecycle: pending -> sent | failed
   */
  public async sendSmsAsync(options: {
    to: string;
    message: string;
    smsConfig?: Partial<SmsConfig>;
    recipientGroup?: string;
    teamName?: string;
    sender?: string;
  }): Promise<{ success: boolean; logId: string; error?: string }> {
    const logId = `notif_sms_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const logEntry: BroadcastLog = {
      id: logId,
      channel: "SMS",
      recipient: options.to,
      recipientGroup: options.recipientGroup || "individual",
      recipientCount: 1,
      teamName: options.teamName,
      message: options.message,
      preview: options.message.slice(0, 100),
      sender: options.sender || "System",
      status: "pending",
      timestamp
    };

    await this.notificationRepo.save(logEntry);

    (async () => {
      try {
        const config = options.smsConfig;
        if (!config || !config.enabled) {
          logEntry.status = "sent";
          logEntry.error = "SMS Gateway disabled (Simulated Delivery)";
          await this.notificationRepo.save(logEntry);
          return;
        }

        const sanitizedTo = options.to.replace(/\s+/g, "").trim();
        const provider = config.provider || "twilio";

        if (provider === "twilio") {
          const sid = (config.twilioSid || "").trim();
          const token = (config.twilioAuthToken || "").trim();
          const from = (config.twilioFrom || "").trim();

          if (!sid || !token || !from) {
            logEntry.status = "failed";
            logEntry.error = "Twilio SID, Auth Token, or From Number is missing.";
            await this.notificationRepo.save(logEntry);
            return;
          }

          const auth = Buffer.from(`${sid}:${token}`).toString("base64");
          const targetPhone = sanitizedTo.startsWith("+") 
            ? sanitizedTo 
            : (sanitizedTo.startsWith("91") && sanitizedTo.length === 12 ? `+${sanitizedTo}` : `+91${sanitizedTo}`);

          const body = new URLSearchParams({
            To: targetPhone,
            From: from,
            Body: options.message
          });

          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
          });

          const resData = await response.json() as any;
          if (response.ok) {
            logEntry.status = "sent";
            logEntry.error = undefined;
            await this.notificationRepo.save(logEntry);
          } else {
            logEntry.status = "failed";
            logEntry.error = resData.message || `Twilio Error status ${response.status}`;
            await this.notificationRepo.save(logEntry);
          }
        } else if (provider === "msg91") {
          const authKey = (config.msg91AuthKey || "").trim();
          const senderId = (config.msg91SenderId || "SVECSI").trim();
          const route = (config.msg91Route || "4").trim();

          if (!authKey) {
            logEntry.status = "failed";
            logEntry.error = "MSG91 Auth Key is missing.";
            await this.notificationRepo.save(logEntry);
            return;
          }

          const cleanPhone = sanitizedTo.replace("+", "");
          const finalPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`;

          const response = await fetch(`https://api.msg91.com/api/v2/sendsms`, {
            method: "POST",
            headers: {
              "authkey": authKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              sender: senderId,
              route,
              sms: [{ message: options.message, to: [finalPhone] }]
            })
          });

          if (response.ok) {
            logEntry.status = "sent";
            logEntry.error = undefined;
            await this.notificationRepo.save(logEntry);
          } else {
            logEntry.status = "failed";
            logEntry.error = `MSG91 status ${response.status}`;
            await this.notificationRepo.save(logEntry);
          }
        }
      } catch (err: any) {
        logEntry.status = "failed";
        logEntry.error = err.message || "SMS delivery exception";
        await this.notificationRepo.save(logEntry);
        console.error(`[NotificationService] SMS delivery failure for ${options.to}:`, err.message);
      }
    })().catch(err => {
      console.error("[NotificationService] Unhandled SMS worker error:", err);
    });

    return { success: true, logId };
  }

  /**
   * Safe asynchronous WhatsApp Template dispatch.
   * Logs status lifecycle: pending -> sent | failed
   */
  public async sendWhatsappAsync(options: {
    to: string;
    templateName: string;
    variables: string[];
    whatsappConfig?: Partial<WhatsappConfig>;
    recipientGroup?: string;
    teamName?: string;
    sender?: string;
  }): Promise<{ success: boolean; logId: string; error?: string }> {
    const logId = `notif_wa_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const logEntry: BroadcastLog = {
      id: logId,
      channel: "WhatsApp",
      recipient: options.to,
      recipientGroup: options.recipientGroup || "individual",
      recipientCount: 1,
      teamName: options.teamName,
      message: `Template: ${options.templateName} (${options.variables.join(", ")})`,
      preview: `Template: ${options.templateName}`,
      sender: options.sender || "System",
      status: "pending",
      timestamp
    };

    await this.notificationRepo.save(logEntry);

    (async () => {
      try {
        const config = options.whatsappConfig;
        if (!config || !config.enabled) {
          logEntry.status = "sent";
          logEntry.error = "WhatsApp API disabled (Simulated Delivery)";
          await this.notificationRepo.save(logEntry);
          return;
        }

        const accessToken = (config.accessToken || "").trim();
        const phoneId = (config.phoneId || "").trim();

        if (!accessToken || !phoneId) {
          logEntry.status = "failed";
          logEntry.error = "Meta WhatsApp Access Token or Phone ID missing.";
          await this.notificationRepo.save(logEntry);
          return;
        }

        const cleanPhone = options.to.replace(/\s+/g, "").replace("+", "").trim();
        const finalPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`;

        const parameters = options.variables.map(v => ({ type: "text", text: v }));
        const body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: finalPhone,
          type: "template",
          template: {
            name: options.templateName,
            language: { code: "en_US" },
            components: parameters.length > 0 ? [{ type: "body", parameters }] : []
          }
        };

        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        const resData = await response.json() as any;
        if (response.ok) {
          logEntry.status = "sent";
          logEntry.error = undefined;
          await this.notificationRepo.save(logEntry);
        } else {
          logEntry.status = "failed";
          logEntry.error = resData.error?.message || `Meta WhatsApp status ${response.status}`;
          await this.notificationRepo.save(logEntry);
        }
      } catch (err: any) {
        logEntry.status = "failed";
        logEntry.error = err.message || "WhatsApp delivery exception";
        await this.notificationRepo.save(logEntry);
        console.error(`[NotificationService] WhatsApp delivery failure for ${options.to}:`, err.message);
      }
    })().catch(err => {
      console.error("[NotificationService] Unhandled WhatsApp worker error:", err);
    });

    return { success: true, logId };
  }

  /**
   * Helper: Non-blocking welcome notification when student creates an account
   */
  public notifyStudentAccountCreated(student: Student, smtpConfig?: Partial<SmtpConfig>): void {
    if (!student.email) return;

    const subject = "Welcome to SVEC Smart India Hackathon Portal 2026";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 20px; font-weight: bold;">SVEC Internal Hackathon 2026</h2>
          <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Account Registration Confirmed</span>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">Hello,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">Your student account for the Sri Vasavi Engineering College Smart India Hackathon (SIH 2026) Internal Portal has been created successfully.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px; color: #1e293b;"><strong>Registered Email:</strong> ${student.email}</p>
          ${student.department ? `<p style="margin: 6px 0 0 0; font-size: 14px; color: #1e293b;"><strong>Department:</strong> ${student.department}</p>` : ""}
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">You can now log in, formulate your 6-member squad (including at least one female member), and register your team.</p>
      </div>
    `;

    this.sendEmailAsync({
      to: student.email,
      subject,
      html,
      smtpConfig,
      recipientGroup: "student_welcome",
      sender: "System"
    }).catch(err => {
      console.warn("[NotificationService] Background student welcome error:", err);
    });
  }

  /**
   * Helper: Non-blocking team registration confirmation notification
   */
  public notifyTeamRegistrationSuccess(
    registration: Registration, 
    statementTitle?: string,
    smtpConfig?: Partial<SmtpConfig>
  ): void {
    const recipients = [
      registration.studentEmail,
      registration.member1Email,
      registration.member2Email,
      registration.member3Email,
      registration.member4Email,
      registration.member5Email
    ].filter((e): e is string => !!e && e.includes("@"));

    const uniqueEmails = Array.from(new Set(recipients));
    if (uniqueEmails.length === 0) return;

    const subject = `Registration Confirmed: ${registration.teamName} [${registration.registrationId}] - SVEC SIH 2026`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 20px; font-weight: bold;">SVEC SIH Internal Hackathon 2026</h2>
          <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">Official Team Registration Receipt</span>
        </div>
        <p style="font-size: 15px; color: #334155;">Dear Team <strong>${registration.teamName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">Your team has been successfully registered for the SVEC SIH 2026 Internal Round.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Registration ID:</strong> <span style="font-family: monospace; color: #4f46e5;">${registration.registrationId}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Team Leader:</strong> ${registration.leadName} (${registration.leadDepartment})</p>
          <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Problem Statement:</strong> ${statementTitle || registration.problemStatementId}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Payment Status:</strong> <span style="color: #16a34a; font-weight: bold; text-transform: uppercase;">${registration.paymentStatus || "Free"}</span></p>
        </div>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">You can log in to the portal at any time to view your official receipt, proposal status, and evaluator scores.</p>
      </div>
    `;

    for (const email of uniqueEmails) {
      this.sendEmailAsync({
        to: email,
        subject,
        html,
        smtpConfig,
        teamName: registration.teamName,
        recipientGroup: "team_confirmation",
        sender: "System"
      }).catch(err => {
        console.warn(`[NotificationService] Team email dispatch to ${email} error:`, err);
      });
    }
  }
}

export const notificationService = new NotificationService();
