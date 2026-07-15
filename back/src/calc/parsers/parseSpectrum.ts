import type { Spectrum } from '../../common/types/spectra.types';

/**
 * Parses a two-column text spectrum (wavenumber, intensity). Tolerant to:
 * - comment/header lines (skipped when the columns aren't numeric),
 * - blank lines,
 * - comma or dot decimal separators,
 * - arbitrary whitespace (space/tab) between columns.
 */
export function parseSpectrum(name: string, text: string): Spectrum {
  const wavenumbers: number[] = [];
  const intensities: number[] = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 2) continue;

    const x = toNumber(tokens[0]);
    const y = toNumber(tokens[1]);
    if (x === null || y === null) continue;

    wavenumbers.push(x);
    intensities.push(y);
  }

  return { name, wavenumbers, intensities };
}

function toNumber(token: string): number | null {
  // Normalize a comma decimal separator ("1,23" → "1.23") when no dot is present.
  const normalized = token.includes(',') && !token.includes('.') ? token.replace(',', '.') : token;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}
