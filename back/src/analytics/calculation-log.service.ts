import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseService } from './database.service';
import { DAY_SQL, type DayWindow } from './days';
import type { AppConfig } from '../config/configuration';
import type { CalculationResult } from '../common/types/spectra.types';

/** Archives are saved as <uuid>.zip — the same id as the calculation and its /files directory. */
const ARCHIVE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.zip$/i;

export type CalculationStatus = 'running' | 'ok' | 'error';

/** What the client sent alongside the archive, as received. */
export interface CalculationParams {
  from: number;
  to: number;
  step?: number;
  colorLow?: string;
  colorMidLow?: string;
  colorMidHigh?: string;
  colorHigh?: string;
}

export interface CalculationStart {
  id: string;
  ip: string | null;
  userAgent: string | null;
  fileName: string;
  fileBytes: number;
  params: CalculationParams;
}

export interface CalculationRecord {
  id: string;
  ts: number;
  ip: string | null;
  userAgent: string | null;
  fileName: string;
  fileBytes: number;
  params: CalculationParams;
  status: CalculationStatus;
  httpStatus: number | null;
  error: string | null;
  durationMs: number | null;
  gridSize: number | null;
  sr: number | null;
  category: string | null;
  archiveAvailable: boolean;
}

export interface CalculationDetail extends CalculationRecord {
  result: CalculationResult | null;
}

export interface CalculationTotals {
  ok: number;
  error: number;
}

export interface CalculationsOverview {
  today: CalculationTotals;
  week: CalculationTotals;
  range: CalculationTotals & { avgDurationMs: number | null };
  daily: Map<string, CalculationTotals>;
}

export interface ArchivePruneResult {
  removed: number;
  failed: number;
}

interface CalculationRow {
  id: string;
  ts: number;
  ip: string | null;
  user_agent: string | null;
  file_name: string;
  file_bytes: number;
  params: string;
  status: CalculationStatus;
  http_status: number | null;
  error: string | null;
  duration_ms: number | null;
  grid_size: number | null;
  sr: number | null;
  category: string | null;
  result?: string | null;
}

const LIST_COLUMNS = `id, ts, ip, user_agent, file_name, file_bytes, params, status, http_status, error,
  duration_ms, grid_size, sr, category`;

/** HTTP status and the user-facing message of a failed calculation, as the client saw them. */
function describeError(err: unknown): { httpStatus: number; message: string } {
  if (err instanceof HttpException) {
    const response = err.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : [(response as { message?: string | string[] }).message ?? err.message].flat().join('; ');
    return { httpStatus: err.getStatus(), message };
  }
  return { httpStatus: 500, message: (err as Error)?.message ?? String(err) };
}

/**
 * The archive of what the service was asked and what it answered: one row per uploaded archive,
 * with the parameters, the outcome and the full result, plus the archive itself on disk.
 *
 * Writes never throw — a calculation must not fail because its bookkeeping did.
 */
@Injectable()
export class CalculationLogService implements OnModuleInit {
  private readonly logger = new Logger(CalculationLogService.name);
  readonly archiveDir: string;

  constructor(
    private readonly database: DatabaseService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.archiveDir = join(config.get('dataRoot', { infer: true }), 'archives');
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.archiveDir, { recursive: true });
    // A row still "running" at startup belongs to a process that died mid-calculation.
    const { changes } = this.database.db
      .prepare(
        "UPDATE calculations SET status = 'error', error = 'Прервано перезапуском сервиса' WHERE status = 'running'",
      )
      .run();
    if (Number(changes) > 0) this.logger.warn(`Расчётов, прерванных перезапуском: ${changes}`);
  }

  start(entry: CalculationStart): void {
    this.safely('начало расчёта', () =>
      this.database.db
        .prepare(
          `INSERT INTO calculations (id, ts, ip, user_agent, file_name, file_bytes, params, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'running')`,
        )
        .run(
          entry.id,
          Date.now(),
          entry.ip,
          entry.userAgent,
          entry.fileName,
          entry.fileBytes,
          JSON.stringify(entry.params),
        ),
    );
  }

  /** Resolves even on failure, so callers can simply await it. */
  async saveArchive(id: string, buffer: Buffer): Promise<void> {
    try {
      await writeFile(this.archivePath(id), buffer);
    } catch (err) {
      this.logger.error(`Не удалось сохранить архив ${id}: ${(err as Error).message}`);
    }
  }

  succeed(id: string, result: CalculationResult, durationMs: number): void {
    this.safely('результат расчёта', () =>
      this.database.db
        .prepare(
          `UPDATE calculations
              SET status = 'ok', http_status = 201, duration_ms = ?, grid_size = ?, sr = ?,
                  category = ?, result = ?
            WHERE id = ?`,
        )
        .run(
          durationMs,
          result.gridSize,
          result.stats.sr,
          result.stats.category,
          JSON.stringify(result),
          id,
        ),
    );
  }

  fail(id: string, err: unknown, durationMs: number): void {
    const { httpStatus, message } = describeError(err);
    this.safely('ошибка расчёта', () =>
      this.database.db
        .prepare(
          `UPDATE calculations SET status = 'error', http_status = ?, error = ?, duration_ms = ?
            WHERE id = ?`,
        )
        .run(httpStatus, message, durationMs, id),
    );
  }

  list(query: { limit: number; offset: number; status?: 'ok' | 'error' }): {
    total: number;
    items: CalculationRecord[];
  } {
    const clause = query.status ? 'WHERE status = ?' : '';
    const params = query.status ? [query.status] : [];
    const { db } = this.database;

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM calculations ${clause}`).get(...params) as {
      total: number;
    };
    const rows = db
      .prepare(`SELECT ${LIST_COLUMNS} FROM calculations ${clause} ORDER BY ts DESC LIMIT ? OFFSET ?`)
      .all(...params, query.limit, query.offset) as unknown as CalculationRow[];

    return { total, items: rows.map((row) => this.toRecord(row)) };
  }

  get(id: string): CalculationDetail | null {
    const row = this.database.db
      .prepare(`SELECT ${LIST_COLUMNS}, result FROM calculations WHERE id = ?`)
      .get(id) as unknown as CalculationRow | undefined;
    if (!row) return null;
    return {
      ...this.toRecord(row),
      result: row.result ? (JSON.parse(row.result) as CalculationResult) : null,
    };
  }

  archivePath(id: string): string {
    return join(this.archiveDir, `${id}.zip`);
  }

  overview(window: DayWindow): CalculationsOverview {
    const { db } = this.database;
    const totals = (since: number) =>
      db
        .prepare(
          `SELECT COALESCE(SUM(status = 'ok'), 0) AS ok, COALESCE(SUM(status = 'error'), 0) AS error
             FROM calculations WHERE ts >= ?`,
        )
        .get(since) as unknown as CalculationTotals;

    const daily = db
      .prepare(
        `SELECT ${DAY_SQL} AS day, SUM(status = 'ok') AS ok, SUM(status = 'error') AS error
           FROM calculations WHERE ts >= ? GROUP BY day`,
      )
      .all(window.offsetMs, window.sinceTs) as unknown as ({ day: string } & CalculationTotals)[];

    const { avgDurationMs } = db
      .prepare("SELECT AVG(duration_ms) AS avgDurationMs FROM calculations WHERE ts >= ? AND status = 'ok'")
      .get(window.sinceTs) as { avgDurationMs: number | null };

    return {
      today: totals(window.todayTs),
      week: totals(window.weekTs),
      range: { ...totals(window.sinceTs), avgDurationMs },
      daily: new Map(daily.map(({ day, ok, error }) => [day, { ok, error }])),
    };
  }

  /**
   * Deletes archives older than `maxAgeMs`, by mtime. Same guards as the /files sweep: regular
   * files only (a symlink is never followed) named exactly like the ones saved here.
   */
  async pruneArchives(maxAgeMs: number): Promise<ArchivePruneResult> {
    const result: ArchivePruneResult = { removed: 0, failed: 0 };
    const now = Date.now();
    for (const entry of await readdir(this.archiveDir, { withFileTypes: true })) {
      if (!entry.isFile() || !ARCHIVE_RE.test(entry.name)) continue;
      const file = join(this.archiveDir, entry.name);
      try {
        const { mtimeMs } = await stat(file);
        if (now - mtimeMs <= maxAgeMs) continue;
        await rm(file, { force: true });
        result.removed++;
      } catch (err) {
        result.failed++;
        this.logger.error(`Не удалось удалить ${file}: ${(err as Error).message}`);
      }
    }
    return result;
  }

  /** Disk taken by the archives — they, not the database, are what grows. */
  async archiveUsage(): Promise<{ count: number; bytes: number }> {
    let count = 0;
    let bytes = 0;
    for (const entry of await readdir(this.archiveDir, { withFileTypes: true })) {
      if (!entry.isFile() || !ARCHIVE_RE.test(entry.name)) continue;
      try {
        bytes += (await stat(join(this.archiveDir, entry.name))).size;
        count++;
      } catch {
        // Deleted between readdir and stat: simply not counted.
      }
    }
    return { count, bytes };
  }

  private toRecord(row: CalculationRow): CalculationRecord {
    return {
      id: row.id,
      ts: row.ts,
      ip: row.ip,
      userAgent: row.user_agent,
      fileName: row.file_name,
      fileBytes: row.file_bytes,
      params: JSON.parse(row.params) as CalculationParams,
      status: row.status,
      httpStatus: row.http_status,
      error: row.error,
      durationMs: row.duration_ms,
      gridSize: row.grid_size,
      sr: row.sr,
      category: row.category,
      archiveAvailable: existsSync(this.archivePath(row.id)),
    };
  }

  private safely(what: string, write: () => unknown): void {
    try {
      write();
    } catch (err) {
      this.logger.error(`Не удалось записать ${what}: ${(err as Error).message}`);
    }
  }
}
