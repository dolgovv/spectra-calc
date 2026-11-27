import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';

export interface RequestLogEntry {
  ts: number;
  method: string;
  path: string;
  route: string;
  status: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
  bytesIn: number | null;
  bytesOut: number | null;
}

export interface RequestLogRow extends RequestLogEntry {
  id: number;
}

export type StatusClass = '2xx' | '3xx' | '4xx' | '5xx';

export interface RequestLogQuery {
  limit: number;
  offset: number;
  status?: StatusClass;
  /** Substring of the path. */
  search?: string;
  /** The admin panel's own API calls; left out unless asked for, they drown everything else. */
  includeAdmin?: boolean;
}

const NOT_ADMIN = "route NOT LIKE '/api/admin%'";

export interface RouteSummary {
  method: string;
  route: string;
  count: number;
  errors: number;
  avgMs: number;
  maxMs: number;
  lastTs: number;
}

const STATUS_RANGES: Record<StatusClass, [number, number]> = {
  '2xx': [200, 299],
  '3xx': [300, 399],
  '4xx': [400, 499],
  '5xx': [500, 599],
};

@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);

  constructor(private readonly database: DatabaseService) {}

  /** Never throws: a failed log write must not turn into a failed request. */
  record(entry: RequestLogEntry): void {
    try {
      this.database.db
        .prepare(
          `INSERT INTO requests
             (ts, method, path, route, status, duration_ms, ip, user_agent, bytes_in, bytes_out)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          entry.ts,
          entry.method,
          entry.path,
          entry.route,
          entry.status,
          entry.durationMs,
          entry.ip,
          entry.userAgent,
          entry.bytesIn,
          entry.bytesOut,
        );
    } catch (err) {
      this.logger.error(`Не удалось записать лог запроса: ${(err as Error).message}`);
    }
  }

  list({ limit, offset, status, search, includeAdmin }: RequestLogQuery): {
    total: number;
    items: RequestLogRow[];
  } {
    const where: string[] = includeAdmin ? [] : [NOT_ADMIN];
    const params: (string | number)[] = [];
    if (status) {
      where.push('status BETWEEN ? AND ?');
      params.push(...STATUS_RANGES[status]);
    }
    if (search) {
      where.push("path LIKE ? ESCAPE '\\'");
      params.push(`%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { db } = this.database;

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM requests ${clause}`).get(...params) as {
      total: number;
    };
    const items = db
      .prepare(
        `SELECT id, ts, method, path, route, status, duration_ms AS durationMs, ip,
                user_agent AS userAgent, bytes_in AS bytesIn, bytes_out AS bytesOut
           FROM requests ${clause}
          ORDER BY id DESC
          LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset) as unknown as RequestLogRow[];

    return { total, items };
  }

  /** Per-endpoint totals since `sinceTs`, busiest first. */
  summary(sinceTs: number, includeAdmin = false): RouteSummary[] {
    return this.database.db
      .prepare(
        `SELECT method, route, COUNT(*) AS count,
                SUM(status >= 400) AS errors,
                AVG(duration_ms) AS avgMs,
                MAX(duration_ms) AS maxMs,
                MAX(ts) AS lastTs
           FROM requests
          WHERE ts >= ? ${includeAdmin ? '' : `AND ${NOT_ADMIN}`}
          GROUP BY method, route
          ORDER BY count DESC
          LIMIT 50`,
      )
      .all(sinceTs) as unknown as RouteSummary[];
  }

  pruneOlderThan(ts: number): number {
    return Number(this.database.db.prepare('DELETE FROM requests WHERE ts < ?').run(ts).changes);
  }
}
