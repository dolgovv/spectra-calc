export type Rgb = [number, number, number];

interface Stop {
  at: number;
  rgb: Rgb;
}

/**
 * Intensity colour ramp, low → high: black · violet · magenta · coral · cream (matplotlib's magma).
 *
 * A heat ramp has to be readable, not just on-brand, and lightness is what carries it. The house
 * ink·teal·coral·magenta·pink ramp was not monotone in lightness — coral (L .626) sat *above*
 * magenta (L .593), a dip that reads as a false edge, and those two were only ΔL .033 apart, so the
 * band holding most of the data was perceptually flat. Its whole range spanned L .23–.71.
 *
 * magma is monotone by construction, steps evenly (ΔL .30/.19/.20/.23) and spans L .05–.98 — about
 * twice the perceptual room to show structure — and stays legible with colour-vision deficiency,
 * since order survives in lightness alone. It keeps the dark→hot metaphor and its magenta is a
 * cousin of the brand accent.
 *
 * `at` is each colour's *design* position — the share of the map that should have turned that
 * colour by then. It is deliberately not a position on the value axis: see createHeatmapScale.
 */
export const HEATMAP_STOPS: Stop[] = [
  { at: 0, rgb: [0x00, 0x00, 0x04] },
  { at: 0.25, rgb: [0x51, 0x12, 0x7c] },
  { at: 0.5, rgb: [0xb6, 0x36, 0x79] },
  { at: 0.75, rgb: [0xfb, 0x88, 0x61] },
  { at: 1, rgb: [0xfc, 0xfd, 0xbf] },
];

/** Stops closer than this are treated as collapsed — the data is too flat to spread the ramp over. */
const MIN_STOP_GAP = 0.02;

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
 * and the low half of the ramp goes unused. Placing the teal stop at the 28th percentile (etc.)
 * means ~28% of the cells are below teal by construction, whatever the distribution — so every
 * colour does equal work and the structure stays visible.
 *
 * The value axis itself stays linear: only the colours slide along it, which is what the colorbar
 * gradient then shows. Its tick labels stay evenly spaced and keep telling the truth.
 */
function fitStopsToData(values: number[], min: number, span: number): { at: number[]; fitted: boolean } {
  const design = HEATMAP_STOPS.map((s) => s.at);
  if (values.length < HEATMAP_STOPS.length) return { at: design, fitted: false };

  const sorted = [...values].sort((a, b) => a - b);
  const at = HEATMAP_STOPS.map((stop) => {
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
 * bounds the colorbar is labelled with (the backend's colorScaleMin/Max).
 *
 * canvas and colorbar share these stops, and CSS gradients interpolate in sRGB just like
 * `interpolate` does — so the strip is an exact readout of the map, not an approximation of it.
 */
export function createHeatmapScale(values: number[], min: number, max: number): HeatmapScale {
  const span = max - min || 1;
  const { at, fitted } = fitStopsToData(values, min, span);
  const stops: Stop[] = HEATMAP_STOPS.map((stop, i) => ({ at: at[i], rgb: stop.rgb }));

  return {
    colorAt: (value) => interpolate(stops, (value - min) / span),
    gradientCss: `linear-gradient(to top, ${stops
      .map((s) => `rgb(${s.rgb.join(',')}) ${(s.at * 100).toFixed(2)}%`)
      .join(', ')})`,
    fitted,
  };
}
