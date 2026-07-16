export type Rgb = [number, number, number];

interface Stop {
  at: number;
  rgb: Rgb;
}

/**
 * Intensity colour ramp, low → high: ink · teal · coral · magenta · pink.
 * Kept in sync with the `colorbar` gradient in tailwind.config.ts — the canvas samples these
 * stops while the colorbar strip renders the CSS gradient, so both must describe one ramp.
 */
export const HEATMAP_STOPS: Stop[] = [
  { at: 0, rgb: [0x1c, 0x1c, 0x21] },
  { at: 0.28, rgb: [0x2e, 0x7b, 0x67] },
  { at: 0.55, rgb: [0xc9, 0x6a, 0x3b] },
  { at: 0.8, rgb: [0xc9, 0x48, 0x7e] },
  { at: 1, rgb: [0xf0, 0x72, 0x9a] },
];

/** Colour at position `t` (0…1) along the ramp; values outside the range clamp to the ends. */
export function sampleHeatmapColor(t: number): Rgb {
  const clamped = Math.min(Math.max(t, 0), 1);
  let lower = HEATMAP_STOPS[0];
  let upper = HEATMAP_STOPS[HEATMAP_STOPS.length - 1];

  for (let i = 0; i < HEATMAP_STOPS.length - 1; i++) {
    if (clamped >= HEATMAP_STOPS[i].at && clamped <= HEATMAP_STOPS[i + 1].at) {
      lower = HEATMAP_STOPS[i];
      upper = HEATMAP_STOPS[i + 1];
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
