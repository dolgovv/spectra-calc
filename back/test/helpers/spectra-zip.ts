import AdmZip from 'adm-zip';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../src/config/configuration';

/** Interval containing the synthetic peak; its boundaries land on the flat baseline. */
export const PEAK_INTERVAL = { from: 595, to: 625 };

/** Spectrum sampled every 5 cm⁻¹ over 590–630: a flat `base` line with a peak of `height` at 610. */
export function spectrumText(height: number, base = 100): string {
  const lines: string[] = [];
  for (let w = 590; w <= 630; w += 5) {
    lines.push(`${w} ${w === 610 ? base + height : base}`);
  }
  return lines.join('\n');
}

/** Archive laid out like the instrument's: one spectrum per height, plus the auxiliary files. */
export function makeSpectraZip(heights: number[]): Buffer {
  const zip = new AdmZip();
  heights.forEach((height, i) => {
    zip.addFile(`specs/${i + 1}.esp`, Buffer.from(spectrumText(height)));
  });
  zip.addFile('points.dat', Buffer.from('0 0\n'));
  zip.addFile('maps/590-625.dat', Buffer.from('1 2 3\n'));
  return zip.toBuffer();
}

/** 1000, 2000, …, 100000: every cell distinct, so ordering mistakes cannot cancel out. */
export function hundredHeights(): number[] {
  return Array.from({ length: 100 }, (_, i) => (i + 1) * 1000);
}

export function fakeConfig(values: Partial<AppConfig>): ConfigService<AppConfig, true> {
  return {
    get: (key: keyof AppConfig) => values[key],
  } as unknown as ConfigService<AppConfig, true>;
}
