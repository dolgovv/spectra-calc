export type Rgb = [number, number, number];

interface Stop {
  at: number;
  rgb: Rgb;
}

/**
 * Design positions of the four gradient stops - fixed; only their colours are user-chosen (see
 * DEFAULT_COLOR_* in types/spectra.ts). Originally a fixed 5-stop matplotlib "magma" ramp (black
 * · violet · magenta · coral · cream); it was chosen for lightness monotonicity - unlike the old
 * house ink·teal·coral·magenta·pink ramp, whose coral sat *above* magenta in lightness, reading as
 * a false edge. Now the user can retint it, so only these four positions are fixed; the defaults
 * are magma resampled at 0/33/67/100% (its own two dropped stops folded into their neighbours).
 */
const STOP_POSITIONS = [0, 1 / 3, 2 / 3, 1];

/** Stops closer than this are treated as collapsed — the data is too flat to spread the ramp over. */
const MIN_STOP_GAP = 0.02;

/** Parses a "#rrggbb" string (as chosen on the home page / stored on the result) into RGB. */
export function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * Mirrors back/src/render/heatmap/colorScale.ts exactly, positions and quantile-fitting alike -
 * the exported PNG/PDF heatmap has to render pixel-for-pixel the same gradient as the web
 * preview, and front/back don't share a package, so this is a deliberate duplicate, not drift.
 */
function buildStops(colors: readonly Rgb[]): Stop[] {
  return STOP_POSITIONS.map((at, i) => ({ at, rgb: colors[i] }));
}

export interface HeatmapScale {
  /** Colour for a raw intensity value. */
  colorAt(value: number): Rgb;
  /** CSS gradient for the colorbar, low at the bottom. Exactly reproduces colorAt (see below). */
  gradientCss: string;
  /** True when stops were spread over the data; false when they fell back to the design positions. */
  fitted: boolean;
}

function interpolate(stops: Stop[], t: number): Rgb {
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

/**
 * Moves each stop onto the value at its own quantile of the data.
 *
 * Spreading the ramp evenly over [min,max] assumes the values are spread evenly too, and they are
 * not: a uniform sample piles up near its own maximum, so most of the map lands in the top colours
 * and the low half of the ramp goes unused. Placing a stop at its own quantile means that share of
 * the cells are below it by construction, whatever the distribution — so every colour does equal
 * work and the structure stays visible.
 *
 * The value axis itself stays linear: only the colours slide along it, which is what the colorbar
 * gradient then shows. Its tick labels stay evenly spaced and keep telling the truth.
 */
function fitStopsToData(
  baseStops: Stop[],
  values: number[],
  min: number,
  span: number,
): { at: number[]; fitted: boolean } {
  const design = baseStops.map((s) => s.at);
  if (values.length < baseStops.length) return { at: design, fitted: false };

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
    if (at[i] - at[i - 1] < MIN_STOP_GAP) return { at: design, fitted: false };
  }
  return { at, fitted: true };
}

/**
 * Builds the colour scale for one result. `values` are the cells being drawn; `min`/`max` are the
 * bounds the colorbar is labelled with (the backend's colorScaleMin/Max); `colors` are the four
 * user-chosen stop colours at 0/33/67/100% - the same four the backend's PNG/PDF export takes, so
 * the two surfaces produce the identical gradient.
 *
 * canvas and colorbar share these stops, and CSS gradients interpolate in sRGB just like
 * `interpolate` does — so the strip is an exact readout of the map, not an approximation of it.
 */
export function createHeatmapScale(
  values: number[],
  min: number,
  max: number,
  colors: readonly Rgb[],
): HeatmapScale {
  const baseStops = buildStops(colors);
  const span = max - min || 1;
  const { at, fitted } = fitStopsToData(baseStops, values, min, span);
  const stops: Stop[] = baseStops.map((stop, i) => ({ at: at[i], rgb: stop.rgb }));

  return {
    colorAt: (value) => interpolate(stops, (value - min) / span),
    gradientCss: `linear-gradient(to top, ${stops
      .map((s) => `rgb(${s.rgb.join(',')}) ${(s.at * 100).toFixed(2)}%`)
      .join(', ')})`,
    fitted,
  };
}
