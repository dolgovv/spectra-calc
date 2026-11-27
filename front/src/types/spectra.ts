export interface SpectrumInterval {
  from: number;
  to: number;
}

export const DEFAULT_INTERVAL_MIN = 200;
export const DEFAULT_INTERVAL_MAX = 3000; // typical Raman-shift span (cm⁻¹)
export const DEFAULT_INTERVAL: SpectrumInterval = { from: 580, to: 650 };

/** Heatmap axis step in µm - display-only, doesn't affect the computed matrix or stats. */
export const MIN_SPATIAL_STEP_MICRONS = 20;
export const MAX_SPATIAL_STEP_MICRONS = 400;
export const DEFAULT_SPATIAL_STEP_MICRONS = 100;

/**
 * Gradient colours at 0% / 33% / 67% / 100% of intensity - all four user-configurable, display-
 * only (don't affect the computed matrix or stats). Defaults are the original fixed magma ramp
 * (see heatmapPalette.ts) resampled at these four positions.
 */
export const DEFAULT_COLOR_LOW = "#000004";
export const DEFAULT_COLOR_MID_LOW = "#731e7b";
export const DEFAULT_COLOR_MID_HIGH = "#e46d69";
export const DEFAULT_COLOR_HIGH = "#fcfdbf";

export type CategoryKey =
  | "excellent"
  | "acceptable"
  | "satisfactory"
  | "unacceptable";

export interface SpectrumStats {
  meanIntensity: number;
  stdDeviation: number;
  /** Sr = σ/μ (fraction). */
  sr: number;
  relStdDeviationPercent: number;
  category: CategoryKey;
  categoryLabel: string;
  pointsProcessed: number;
  filesProcessed: number;
  calcTimeSeconds: number;
}

/** URLs of the artifacts persisted by the backend. */
export interface ResultFileLinks {
  heatmapPng: string;
  reportPdf: string;
  matrixCsv: string;
  metaJson: string;
}

/** Mirrors the backend CalculationResult (POST /api/calculate response). */
export interface SpectrumResult {
  id: string;
  interval: SpectrumInterval;
  gridSize: number;
  /** matrix[row][col] - row is the Y index (0 = bottom), col is the X index (0 = left). */
  matrix: number[][];
  xTicks: number[];
  yTicks: number[];
  colorScaleMin: number;
  colorScaleMax: number;
  peakLabel: number;
  stats: SpectrumStats;
  sourceFileName: string;
  computedAt: string;
  /** Total valid spectrum files found in the archive, before truncation to the square grid. */
  spectraFound: number;
  /** How many trailing spectra were dropped to fit the square grid (0 if none). */
  spectraDropped: number;
  /** Gradient colours ("#rrggbb") at 0/33/67/100% of intensity. */
  colorLow: string;
  colorMidLow: string;
  colorMidHigh: string;
  colorHigh: string;
  files: ResultFileLinks;
}
