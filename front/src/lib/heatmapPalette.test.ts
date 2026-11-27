import { describe, expect, it } from 'vitest';
import { createHeatmapScale, hexToRgb } from './heatmapPalette';
import {
  DEFAULT_COLOR_HIGH,
  DEFAULT_COLOR_LOW,
  DEFAULT_COLOR_MID_HIGH,
  DEFAULT_COLOR_MID_LOW,
} from '../types/spectra';

const COLORS = [DEFAULT_COLOR_LOW, DEFAULT_COLOR_MID_LOW, DEFAULT_COLOR_MID_HIGH, DEFAULT_COLOR_HIGH].map(
  hexToRgb,
);
const [BLACK, , , CREAM] = COLORS;
const ONE_TO_HUNDRED = Array.from({ length: 100 }, (_, i) => i + 1);

describe('hexToRgb', () => {
  it('parses a #rrggbb colour', () => {
    expect(hexToRgb('#000004')).toEqual([0, 0, 4]);
    expect(hexToRgb('#fcfdbf')).toEqual([252, 253, 191]);
  });
});

describe('createHeatmapScale', () => {
  it('spans the ramp between the labelled bounds', () => {
    const scale = createHeatmapScale(ONE_TO_HUNDRED, 1, 100, COLORS);

    expect(scale.colorAt(1)).toEqual(BLACK);
    expect(scale.colorAt(100)).toEqual(CREAM);
  });

  it('clamps values outside the bounds', () => {
    const scale = createHeatmapScale(ONE_TO_HUNDRED, 1, 100, COLORS);

    expect(scale.colorAt(-1000)).toEqual(BLACK);
    expect(scale.colorAt(1000)).toEqual(CREAM);
  });

  it('uses the colours it was given', () => {
    const red = hexToRgb('#ff0000');
    const scale = createHeatmapScale(ONE_TO_HUNDRED, 1, 100, [BLACK, COLORS[1], COLORS[2], red]);

    expect(scale.colorAt(100)).toEqual(red);
    expect(scale.gradientCss).toContain('rgb(255,0,0) 100.00%');
  });

  it('places each colour at its own quantile of the data', () => {
    // Skewed: without the fit most of the map would land in the darkest colours.
    const skewed = ONE_TO_HUNDRED.map((v) => v ** 2);
    const scale = createHeatmapScale(skewed, skewed[0], skewed[99], COLORS);

    expect(scale.fitted).toBe(true);
    expect(scale.colorAt(skewed[33])).toEqual(COLORS[1]);
    expect(scale.colorAt(skewed[66])).toEqual(COLORS[2]);
  });

  it('does not depend on the order of the cells', () => {
    const shuffled = [...ONE_TO_HUNDRED].reverse();

    expect(createHeatmapScale(shuffled, 1, 100, COLORS).gradientCss).toBe(
      createHeatmapScale(ONE_TO_HUNDRED, 1, 100, COLORS).gradientCss,
    );
  });

  it('falls back to the design positions on flat data', () => {
    const flat = createHeatmapScale(Array<number>(100).fill(5), 0, 10, COLORS);

    expect(flat.fitted).toBe(false);
    expect(flat.gradientCss).toContain('33.33%');
    expect(flat.gradientCss).toContain('66.67%');
  });

  it('falls back to the design positions when there are too few cells', () => {
    expect(createHeatmapScale([1, 2], 1, 2, COLORS).fitted).toBe(false);
  });

  it('stays finite when the bounds coincide', () => {
    const scale = createHeatmapScale([5, 5], 5, 5, COLORS);

    expect(scale.colorAt(5).every(Number.isFinite)).toBe(true);
  });

  it('builds a low-to-high gradient over the full colorbar', () => {
    const { gradientCss } = createHeatmapScale(ONE_TO_HUNDRED, 1, 100, COLORS);

    expect(gradientCss).toMatch(/^linear-gradient\(to top, rgb\(0,0,4\) 0\.00%, /);
    expect(gradientCss).toMatch(/rgb\(252,253,191\) 100\.00%\)$/);
  });
});
