/**
 * Spatial map side is derived per-request from the number of spectra found in the archive
 * (the largest square that fits, e.g. 65 spectra → 8×8, dropping the remainder).
 * Below this side, a matrix isn't meaningful (and tick spacing needs gridSize > 1).
 */
export const MIN_GRID_SIZE = 4;

/**
 * Physical raster step in micrometres between adjacent spectra - fixed per archive (the stage
 * moves this many µm between points), but not always 100: the user picks it per upload since it
 * depends on how the map was scanned. Only feeds tick labels (xTicks/yTicks); the map's total
 * extent scales with gridSize (e.g. 8×8 at 100 µm → 0…700).
 */
export const DEFAULT_SPATIAL_STEP_MICRONS = 100;
export const MIN_SPATIAL_STEP_MICRONS = 20;
export const MAX_SPATIAL_STEP_MICRONS = 400;

/**
 * Gradient colours at 0% / 33% / 67% / 100% of intensity - all four user-configurable per upload.
 * Defaults are the original fixed magma ramp resampled at these four positions (it had five
 * stops; the two dropped in between are folded into their neighbours), so leaving all four
 * untouched reproduces close to today's heatmap.
 */
export const DEFAULT_COLOR_LOW = '#000004';
export const DEFAULT_COLOR_MID_LOW = '#731e7b';
export const DEFAULT_COLOR_MID_HIGH = '#e46d69';
export const DEFAULT_COLOR_HIGH = '#fcfdbf';
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

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
