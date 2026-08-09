export interface SpectrumInterval {
  from: number;
  to: number;
}

export type CategoryKey =
  | "excellent"
  | "acceptable"
  | "satisfactory"
  | "unacceptable";

/** A single parsed spectrum: parallel arrays of wavenumber (cm⁻¹) and intensity (a.u.). */
export interface Spectrum {
  name: string;
  wavenumbers: number[];
  intensities: number[];
}

export interface SpectrumStats {
  /** μ - mean useful intensity over the 100 points. */
  meanIntensity: number;
  /** σ - population standard deviation. */
  stdDeviation: number;
  /** Sr = σ/μ (fraction). */
  sr: number;
  /** Sr × 100, for display. */
  relStdDeviationPercent: number;
  category: CategoryKey;
  categoryLabel: string;
  pointsProcessed: number;
  filesProcessed: number;
  calcTimeSeconds: number;
}

export interface ResultFileLinks {
  heatmapPng: string;
  reportPdf: string;
  matrixCsv: string;
  metaJson: string;
}

/** Core computed result before rendering/storage attach file links. */
export interface SpectrumComputation {
  interval: SpectrumInterval;
  gridSize: number;
  /** matrix[row][col]; row 0 = first gridSize spectra = bottom (Y=0), col = X. */
  matrix: number[][];
  xTicks: number[];
  yTicks: number[];
  colorScaleMin: number;
  colorScaleMax: number;
  /** Representative peak position (cm⁻¹) used for the heatmap title, e.g. 610. */
  peakLabel: number;
  stats: SpectrumStats;
  sourceFileName: string;
  computedAt: string;
  /** Total valid spectrum files found in the archive, before truncation to the square grid. */
  spectraFound: number;
  /** How many trailing spectra were dropped to fit the square grid (0 if none). */
  spectraDropped: number;
  /** Gradient colours ("#rrggbb") at 0/33/67/100% of intensity. Display-only, like xTicks. */
  colorLow: string;
  colorMidLow: string;
  colorMidHigh: string;
  colorHigh: string;
}

/** Full result returned to clients (computation + persisted file links). */
export interface CalculationResult extends SpectrumComputation {
  id: string;
  files: ResultFileLinks;
}
