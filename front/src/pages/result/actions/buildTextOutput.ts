import type { SpectrumResult } from '../../../types/spectra';
import { formatInteger, formatPercent } from '../../../lib/formatNumber';

/** Plaintext results summary shown on-screen in the "Текстовый вывод" box. */
export function buildTextOutput(result: SpectrumResult): string {
  const { interval, stats } = result;
  return [
    `Interval: ${interval.from} - ${interval.to} cm^-1`,
    `Mean intensity: ${formatInteger(stats.meanIntensity)} a.u.`,
    `Std deviation: ${formatInteger(stats.stdDeviation)} a.u.`,
    `Rel. std deviation (Sr): ${formatPercent(stats.relStdDeviationPercent)} %`,
    `Uniformity: ${stats.categoryLabel}`,
    `Points processed: ${stats.pointsProcessed}`,
    `Files processed: ${stats.filesProcessed}`,
  ].join('\n');
}
