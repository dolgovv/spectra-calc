import AdmZip from 'adm-zip';
import { parseSpectrum } from './parseSpectrum';
import type { Spectrum } from '../../common/types/spectra.types';

const SPECTRUM_EXTENSIONS = /\.(esp|txt|asc|csv)$/i;

/**
 * Extracts spectra from a ZIP buffer. Selects two-column text spectra by extension
 * (.esp/.txt/.asc/.csv), ignoring auxiliary files (points.dat, maps/*.dat, folders),
 * and returns them in natural filename order (1, 2, …, N).
 */
export function extractSpectraFromZip(buffer: Buffer): Spectrum[] {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error('Не удалось прочитать ZIP-архив');
  }

  const entries = zip
    .getEntries()
    .filter((e) => !e.isDirectory && SPECTRUM_EXTENSIONS.test(baseName(e.entryName)))
    .sort((a, b) => naturalCompare(baseName(a.entryName), baseName(b.entryName)));

  return entries.map((e) =>
    parseSpectrum(baseName(e.entryName), e.getData().toString('utf-8')),
  );
}

function baseName(entryName: string): string {
  const parts = entryName.split('/');
  return parts[parts.length - 1];
}

/** Sort "1.esp" < "2.esp" < "10.esp" by leading numeric prefix, else lexicographically. */
function naturalCompare(a: string, b: string): number {
  const na = leadingNumber(a);
  const nb = leadingNumber(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function leadingNumber(name: string): number | null {
  const match = name.match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}
