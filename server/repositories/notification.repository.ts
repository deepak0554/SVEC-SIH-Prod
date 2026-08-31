import { BaseRepository } from "./base.repository";
import { BroadcastLog } from "../db";

export class NotificationRepository extends BaseRepository {
  /**
   * Fetch notification / broadcast logs
   * Uses parameterized query
   */
  public async findAll(channel?: string): Promise<BroadcastLog[]> {
    if (this.dbManager.isPostgres()) {
      try {
        const pool = (this.dbManager as any).pgPool;
        if (pool) {
          let sql = `SELECT * FROM notifications`;
          const params: any[] = [];
          if (channel) {
            sql += ` WHERE LOWER(channel) = $1`;
            params.push(channel.toLowerCase());
          }
          sql += ` ORDER BY created_at DESC LIMIT 200;`;
          const res = await pool.query(sql, params);
          return res.rows.map((r: any) => ({
            id: r.id,
            channel: r.channel,
            recipient: r.recipient,
            recipientGroup: r.recipient_group,
            recipientCount: r.recipient_count ? Number(r.recipient_count) : 1,
            teamName: r.team_name,
            subject: r.subject,
            message: r.message,
            preview: r.preview,
            status: r.status,
            sender: r.sender,
            timestamp: r.timestamp,
            error: r.error
          }));
        }
      } catch (err: any) {
        console.error("[NotificationRepository.findAll Error]:", err.message);
      }
    }
    return this.dbManager.getBroadcastLogs();
  }

  /**
   * Save a notification log using parameterized query ($1..$11)
   */
  public async save(log: BroadcastLog): Promise<boolean> {
    if (this.dbManager.isPostgres()) {
      try {
        const pool = (this.dbManager as any).pgPool;
        if (pool) {
          await pool.query(
            `INSERT INTO notifications (
              id, channel, recipient, recipient_group, recipient_count, team_name, subject, message, preview, status, sender, timestamp, error, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              error = EXCLUDED.error,
              preview = EXCLUDED.preview;`,
            [
              log.id,
              log.channel,
              log.recipient || log.recipientGroup || "All",
              log.recipientGroup || null,
              log.recipientCount || 1,
              log.teamName || null,
              log.subject || null,
              log.message || log.preview || "",
              log.preview || log.message || "",
              log.status || "sent",
              log.sender || "System",
              log.timestamp || new Date().toISOString(),
              log.error || null
            ]
          );
        }
      } catch (err: any) {
        console.error("[NotificationRepository.save Error]:", err.message);
      }
    }
    return this.dbManager.saveBroadcastLog(log);
  }
}

export const notificationRepository = new NotificationRepository();
