import type { SpectrumResult } from '../../../types/spectra';
import { isSpectrumResult, readResultFromSession } from '../../../lib/resultStorage';

/**
 * Trusts router `location.state.result` first (the normal navigation path from Home), and falls
 * back to sessionStorage (hard refresh / direct visit to /result). Returns null only when neither
 * source has valid data, so the page can redirect home instead of white-screening.
 */
export function loadResultData(locationState: unknown): SpectrumResult | null {
  const fromState = (locationState as { result?: unknown } | null)?.result;
  if (isSpectrumResult(fromState)) return fromState;
  return readResultFromSession();
}
