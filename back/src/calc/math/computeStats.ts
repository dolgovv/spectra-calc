import { categorize } from './categorize';
import type { SpectrumStats } from '../../common/types/spectra.types';

/**
 * Computes μ (mean), σ (population std deviation), Sr = σ/μ and the uniformity category
 * over the flat list of useful intensities.
 */
export function computeStats(
  values: number[],
  filesProcessed: number,
  calcTimeSeconds: number,
): SpectrumStats {
  const pointsProcessed = values.length;
  const meanIntensity = values.reduce((sum, v) => sum + v, 0) / pointsProcessed;
  const variance =
    values.reduce((sum, v) => sum + (v - meanIntensity) ** 2, 0) / pointsProcessed;
  const stdDeviation = Math.sqrt(variance);
  const sr = meanIntensity !== 0 ? stdDeviation / meanIntensity : 0;
  const { category, categoryLabel } = categorize(sr);

  return {
    meanIntensity,
    stdDeviation,
    sr,
    relStdDeviationPercent: sr * 100,
    category,
    categoryLabel,
    pointsProcessed,
    filesProcessed,
    calcTimeSeconds,
  };
}
