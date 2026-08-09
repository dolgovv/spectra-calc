export type RGB = [number, number, number];

interface Stop {
  at: number;
  rgb: RGB;
}

/** Design positions of the four gradient stops - fixed; only their colours are user-chosen. */
const STOP_POSITIONS = [0, 1 / 3, 2 / 3, 1];

/** Stops closer than this are treated as collapsed — the data is too flat to spread the ramp over. */
const MIN_STOP_GAP = 0.02;

/** Parses a "#rrggbb" string (as stored on the computation) into an RGB triple. */
export function hexToRgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * Mirrors front/src/lib/heatmapPalette.ts exactly, positions and quantile-fitting alike - the
 * exported PNG/PDF heatmap has to render pixel-for-pixel the same gradient as the web preview,
 * and front/back don't share a package, so this is a deliberate duplicate, not drift.
 */
function buildStops(colors: readonly RGB[]): Stop[] {
  return STOP_POSITIONS.map((at, i) => ({ at, rgb: colors[i] }));
}

function interpolate(stops: Stop[], t: number): RGB {
  const clamped = Math.min(Math.max(t, 0), 1);
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].at && clamped <= stops[i + 1].at) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const span = upper.at - lower.at;
  const k = span === 0 ? 0 : (clamped - lower.at) / span;
  return [
    Math.round(lower.rgb[0] + (upper.rgb[0] - lower.rgb[0]) * k),
    Math.round(lower.rgb[1] + (upper.rgb[1] - lower.rgb[1]) * k),
    Math.round(lower.rgb[2] + (upper.rgb[2] - lower.rgb[2]) * k),
  ];
}

/** Moves each stop onto the value at its own quantile of the data - see heatmapPalette.ts for why. */
function fitStopsToData(baseStops: Stop[], values: number[], min: number, span: number): number[] {
  const design = baseStops.map((s) => s.at);
  if (values.length < baseStops.length) return design;

  const sorted = [...values].sort((a, b) => a - b);
  const at = baseStops.map((stop) => {
    const value = sorted[Math.round(stop.at * (sorted.length - 1))];
    return (value - min) / span;
  });

  // The bar must still span its labelled bounds end to end.
  at[0] = 0;
  at[at.length - 1] = 1;

  // Flat data collapses the quantiles onto each other; a squashed ramp is worse than an unfitted one.
  for (let i = 1; i < at.length; i++) {
    if (at[i] - at[i - 1] < MIN_STOP_GAP) return design;
  }
  return at;
}

/**
 * Builds the colour-at-value function for one result. `values` are the matrix cells being drawn;
 * `min`/`max` are the bounds the colorbar is labelled with (colorScaleMin/Max); `colors` are the
 * four user-chosen stop colours at 0/33/67/100% - same inputs the frontend's createHeatmapScale
 * takes, so the two surfaces produce the identical gradient.
 */
export function createHeatmapScale(
  values: number[],
  min: number,
  max: number,
  colors: readonly RGB[],
): (value: number) => RGB {
  const baseStops = buildStops(colors);
  const span = max - min || 1;
  const at = fitStopsToData(baseStops, values, min, span);
  const stops: Stop[] = baseStops.map((stop, i) => ({ at: at[i], rgb: stop.rgb }));
  return (value: number) => interpolate(stops, (value - min) / span);
}
