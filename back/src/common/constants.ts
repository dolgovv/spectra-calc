/**
 * Spatial map side is derived per-request from the number of spectra found in the archive
 * (the largest square that fits, e.g. 65 spectra → 8×8, dropping the remainder).
 * Below this side, a matrix isn't meaningful (and tick spacing needs gridSize > 1).
 */
export const MIN_GRID_SIZE = 4;

/**
 * Fixed physical raster step in micrometres, per points.dat - the stage moves 100 µm between
 * adjacent spectra regardless of how many were captured, so tick spacing stays this constant
 * and the map's total extent scales with gridSize instead (e.g. 8×8 → 0…700, still step 100).
 */
export const SPATIAL_STEP_MICRONS = 100;

/**
 * Sr (relative std deviation) → uniformity category thresholds.
 * The spec lists: <0.15 excellent, <0.20 acceptable, <0.30 satisfactory, ≥0.33 unacceptable.
 * That leaves a [0.30, 0.33) gap; we close it at 0.30 so categorization is continuous.
 * Kept here as a single source of truth - adjust in one place if the rubric changes.
 */
export const SR_THRESHOLDS = {
  excellent: 0.15,
  acceptable: 0.2,
  satisfactory: 0.3,
} as const;

export const CATEGORY_LABELS_RU: Record<string, string> = {
  excellent: "отлично",
  acceptable: "приемлемо",
  satisfactory: "удовлетворительно",
  unacceptable: "неприемлемо",
};
