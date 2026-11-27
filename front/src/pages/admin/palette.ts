/**
 * Chart and status colours of the admin, validated against the surface (#131316) with the
 * dataviz palette checker: each passes the lightness band, chroma floor and 3:1 contrast, and the
 * ok/error pair stays apart under colour-vision deficiency (deutan ΔE 12.8). The theme's own green
 * was too light for marks and too close to red for deutan viewers.
 */
export const VIEWS_COLOR = "#E8567F"; // the accent: a single series
export const OK_COLOR = "#00A888";
export const ERROR_COLOR = "#E76624";

/** One step off the surface: hairline gridlines, recessive. */
export const GRID_COLOR = "rgba(255,255,255,0.08)";
export const BASELINE_COLOR = "rgba(255,255,255,0.22)";
