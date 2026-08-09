/**
 * Spatial map side is derived per-request from the number of spectra found in the archive
 * (the largest square that fits, e.g. 65 spectra → 8×8, dropping the remainder).
 * Below this side, a matrix isn't meaningful (and tick spacing needs gridSize > 1).
 */
export const MIN_GRID_SIZE = 4;

/** Physical extent of the map in micrometres (0…900, step 100), per points.dat. */
export const SPATIAL_EXTENT_MICRONS = 900;

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
