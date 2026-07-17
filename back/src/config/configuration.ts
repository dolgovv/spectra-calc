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
  logsRoot: string;
  queueMax: number;
  botToken: string | null;
  botProxyUrl: string | null;
}

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
    logsRoot: resolve(process.cwd(), process.env.LOGS_ROOT ?? './logs'),
    queueMax: positiveCount(process.env.QUEUE_MAX, 25),
    botToken: process.env.BOT_TOKEN?.trim() ? process.env.BOT_TOKEN.trim() : null,
    botProxyUrl: process.env.BOT_PROXY_URL?.trim() ? process.env.BOT_PROXY_URL.trim() : null,
  };
}
