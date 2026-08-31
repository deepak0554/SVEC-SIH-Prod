import { BaseRepository } from "./base.repository";

export interface AuditLogRecord {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any> | string;
  ipAddress?: string;
  timestamp: string;
}

export class AuditRepository extends BaseRepository {
  /**
   * Log an audit event with parameterized query ($1..$8)
   */
  public async logEvent(record: Omit<AuditLogRecord, "id" | "timestamp"> & { id?: string; timestamp?: string }): Promise<boolean> {
    const id = record.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = record.timestamp || new Date().toISOString();
    const detailsJson = typeof record.details === "object" ? JSON.stringify(record.details) : (record.details || "{}");

    if (this.dbManager.isPostgres()) {
      try {
        const pool = (this.dbManager as any).pgPool;
        if (pool) {
          await pool.query(
            `INSERT INTO audit_logs (id, user_id, username, action, entity_type, entity_id, details_json, ip_address, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              id,
              record.userId || null,
              record.username || "system",
              record.action,
              record.entityType,
              record.entityId || null,
              detailsJson,
              record.ipAddress || null,
              timestamp
            ]
          );
          return true;
        }
      } catch (err: any) {
        console.error("[AuditRepository.logEvent Error]:", err.message);
      }
    }

    const local = (this.dbManager as any).readLocalFile("audit_logs.json", []);
    local.unshift({
      id,
      userId: record.userId,
      username: record.username || "system",
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      details: record.details,
      ipAddress: record.ipAddress,
      timestamp
    });
    // Keep last 1000 logs locally
    if (local.length > 1000) local.length = 1000;
    (this.dbManager as any).writeLocalFile("audit_logs.json", local);
    return true;
  }

  /**
   * Fetch audit logs with optional filter on entityType or action
   * Uses parameterized query ($1)
   */
  public async getLogs(filters?: { entityType?: string; action?: string; limit?: number }): Promise<AuditLogRecord[]> {
    const limit = filters?.limit || 100;
    if (this.dbManager.isPostgres()) {
      try {
        const pool = (this.dbManager as any).pgPool;
        if (pool) {
          let sql = `SELECT * FROM audit_logs`;
          const params: any[] = [];
          const clauses: string[] = [];

          if (filters?.entityType) {
            params.push(filters.entityType);
            clauses.push(`entity_type = $${params.length}`);
          }
          if (filters?.action) {
            params.push(filters.action);
            clauses.push(`action = $${params.length}`);
          }
          if (clauses.length > 0) {
            sql += ` WHERE ` + clauses.join(" AND ");
          }
          params.push(limit);
          sql += ` ORDER BY timestamp DESC LIMIT $${params.length};`;

          const res = await pool.query(sql, params);
          return res.rows.map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            username: r.username,
            action: r.action,
            entityType: r.entity_type,
            entityId: r.entity_id,
            details: r.details_json ? (typeof r.details_json === "string" ? JSON.parse(r.details_json) : r.details_json) : {},
            ipAddress: r.ip_address,
            timestamp: r.timestamp
          }));
        }
      } catch (err: any) {
        console.error("[AuditRepository.getLogs Error]:", err.message);
      }
    }

    const local = (this.dbManager as any).readLocalFile("audit_logs.json", []);
    let filtered = local;
    if (filters?.entityType) filtered = filtered.filter((l: any) => l.entityType === filters.entityType);
    if (filters?.action) filtered = filtered.filter((l: any) => l.action === filters.action);
    return filtered.slice(0, limit);
  }
}

export const auditRepository = new AuditRepository();
