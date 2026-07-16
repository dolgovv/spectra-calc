import type { SpectrumResult } from '../../../types/spectra';
import { formatInteger, formatPercent } from '../../../lib/formatNumber';

export interface TextOutputLine {
  label: string;
  value: string;
  /** Trailing unit, printed unaccented after the value. */
  suffix?: string;
  /** Measured values are accented; the plain counts at the end are not. */
  highlight?: boolean;
}

/** Lines of the "Текстовый вывод" console, structured so the value can be accented separately. */
export function buildTextOutput(result: SpectrumResult): TextOutputLine[] {
  const { interval, stats } = result;
  return [
    {
      label: 'Interval',
      value: `${interval.from} - ${interval.to}`,
      suffix: 'cm^-1',
      highlight: true,
    },
    {
      label: 'Mean intensity',
      value: formatInteger(stats.meanIntensity),
      suffix: 'a.u.',
      highlight: true,
    },
    {
      label: 'Std deviation',
      value: formatInteger(stats.stdDeviation),
      suffix: 'a.u.',
      highlight: true,
    },
    {
      label: 'Rel. std deviation (Sr)',
      value: `${formatPercent(stats.relStdDeviationPercent)} %`,
      highlight: true,
    },
    { label: 'Uniformity', value: stats.categoryLabel, highlight: true },
    { label: 'Points processed', value: String(stats.pointsProcessed) },
    { label: 'Files processed', value: String(stats.filesProcessed) },
  ];
}
