import { resolve } from 'node:path';

export interface AppConfig {
  port: number;
  publicBaseUrl: string;
  corsOrigins: string[];
  storageRoot: string;
  /** Age at which a job's artifacts are swept, in ms. 0 disables the sweep entirely. */
  storageTtlMs: number;
  /** How often the sweeper looks for expired jobs, in ms. */
  storageSweepIntervalMs: number;
  queueMax: number;
  /**
   * Private data: the admin database and the uploaded archives. Must not be under storageRoot,
   * which is served publicly under /files.
   */
  dataRoot: string;
  /** Unset or empty disables the admin panel entirely. */
  adminPassword: string | undefined;
  /** Age at which uploaded archives are deleted, in ms. 0 keeps them forever. */
  archiveTtlMs: number;
  /** Age at which request logs and page views are deleted, in ms. 0 keeps them forever. */
  logRetentionMs: number;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/**
 * Parses a positive duration from the environment. Anything unparseable or non-positive returns
 * `fallback` rather than NaN: `age > NaN` is silently false, which would disable the sweep with
 * no error at all.
 */
function positiveDuration(raw: string | undefined, fallback: number, unitMs: number): number {
  if (raw === undefined) return fallback * unitMs;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return fallback * unitMs;
  return value * unitMs;
}

/**
 * Parses a whole count of at least 1, falling back on anything else.
 *
 * `Number.parseInt` alone is a trap here: `QUEUE_MAX=abc` yields NaN, and `inFlight >= NaN` is
 * always false — the overload guard would silently stop rejecting and accept unbounded work,
 * which is the opposite of what the setting is for. `Number()` rather than `parseInt` so that
 * half-numeric junk like "25abc" is rejected outright instead of quietly becoming 25.
 */
function positiveCount(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

export function loadConfig(): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  return {
    port,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    storageRoot: resolve(process.cwd(), process.env.STORAGE_ROOT ?? './storage'),
    storageTtlMs: positiveDuration(process.env.STORAGE_TTL_HOURS, 48, HOUR_MS),
    storageSweepIntervalMs: positiveDuration(
      process.env.STORAGE_SWEEP_INTERVAL_MINUTES,
      60,
      MINUTE_MS,
    ),
    queueMax: positiveCount(process.env.QUEUE_MAX, 25),
    dataRoot: resolve(process.cwd(), process.env.DATA_ROOT ?? './data'),
    adminPassword: process.env.ADMIN_PASSWORD || undefined,
    archiveTtlMs: positiveDuration(process.env.ARCHIVE_TTL_DAYS, 30, DAY_MS),
    logRetentionMs: positiveDuration(process.env.LOG_RETENTION_DAYS, 90, DAY_MS),
  };
}
