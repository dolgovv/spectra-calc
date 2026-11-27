import type { SpectrumResult } from "../../types/spectra";

/** Mirrors the backend's /api/admin responses. Times are epoch milliseconds. */

export interface VisitTotals {
  views: number;
  visitors: number;
}

export interface CalculationTotals {
  ok: number;
  error: number;
}

export interface DailyRow {
  /** YYYY-MM-DD in the admin's time zone. */
  date: string;
  views: number;
  visitors: number;
  calcOk: number;
  calcError: number;
}

export interface AdminOverview {
  days: number;
  visits: { today: VisitTotals; week: VisitTotals; range: VisitTotals };
  calculations: {
    today: CalculationTotals;
    week: CalculationTotals;
    range: CalculationTotals & { avgDurationMs: number | null };
  };
  daily: DailyRow[];
  topPaths: { path: string; views: number; visitors: number }[];
  topReferrers: { referrer: string; views: number; visitors: number }[];
  storage: { archives: number; archiveBytes: number; databaseBytes: number };
  /** In days; 0 means kept forever. */
  retention: { archiveDays: number; logDays: number };
}

export interface Page<T> {
  total: number;
  items: T[];
}

export type StatusClass = "2xx" | "3xx" | "4xx" | "5xx";

export interface RequestLogRow {
  id: number;
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

export interface RouteSummary {
  method: string;
  route: string;
  count: number;
  errors: number;
  avgMs: number;
  maxMs: number;
  lastTs: number;
}

export interface CalculationParams {
  from: number;
  to: number;
  step?: number;
  colorLow?: string;
  colorMidLow?: string;
  colorMidHigh?: string;
  colorHigh?: string;
}

export type CalculationStatus = "running" | "ok" | "error";

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
  result: SpectrumResult | null;
}
