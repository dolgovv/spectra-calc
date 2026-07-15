import type { SpectrumResult } from '../types/spectra';

const STORAGE_KEY = 'spectracalc:v1:last-result';

export function isSpectrumResult(value: unknown): value is SpectrumResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.gridSize === 'number' &&
    Array.isArray(v.matrix) &&
    Array.isArray(v.xTicks) &&
    Array.isArray(v.yTicks) &&
    typeof v.colorScaleMin === 'number' &&
    typeof v.colorScaleMax === 'number' &&
    typeof v.sourceFileName === 'string' &&
    typeof v.computedAt === 'string' &&
    !!v.interval &&
    typeof (v.interval as Record<string, unknown>).from === 'number' &&
    typeof (v.interval as Record<string, unknown>).to === 'number' &&
    !!v.stats &&
    typeof (v.stats as Record<string, unknown>).meanIntensity === 'number'
  );
}

export function saveResultToSession(result: SpectrumResult): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // sessionStorage unavailable (private mode, quota, etc.) — non-fatal, router state still works
  }
}

export function readResultFromSession(): SpectrumResult | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSpectrumResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
