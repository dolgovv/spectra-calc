export type RGB = [number, number, number];

interface ColorStop {
  offset: number;
  color: RGB;
}

/** Dark-navy → white gradient, identical to the frontend intensity scale. */
const STOPS: ColorStop[] = [
  { offset: 0, color: [8, 20, 38] },
  { offset: 0.35, color: [30, 55, 92] },
  { offset: 0.65, color: [104, 132, 168] },
  { offset: 0.85, color: [176, 196, 219] },
  { offset: 1, color: [245, 248, 252] },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sampleStops(t: number): RGB {
  const clamped = Math.min(Math.max(t, 0), 1);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const cur = STOPS[i];
    const next = STOPS[i + 1];
    if (clamped >= cur.offset && clamped <= next.offset) {
      const localT = (clamped - cur.offset) / (next.offset - cur.offset);
      return [
        lerp(cur.color[0], next.color[0], localT),
        lerp(cur.color[1], next.color[1], localT),
        lerp(cur.color[2], next.color[2], localT),
      ];
    }
  }
  return STOPS[STOPS.length - 1].color;
}

/** Single source of truth for the navy→white scale used by both heatmap pixels and colorbar. */
export function createNavyWhiteScale(min: number, max: number): (value: number) => RGB {
  const range = max - min || 1;
  return (value: number) => sampleStops((value - min) / range);
}

export function rgbCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
