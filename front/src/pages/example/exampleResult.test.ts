import { describe, expect, it } from 'vitest';
import { EXAMPLE_RESULT } from './exampleResult';
import publishedResult from '../../../public/example/result.json';
import {
  DEFAULT_COLOR_HIGH,
  DEFAULT_COLOR_LOW,
  DEFAULT_COLOR_MID_HIGH,
  DEFAULT_COLOR_MID_LOW,
} from '../../types/spectra';

describe('EXAMPLE_RESULT', () => {
  it('is the same fixture as the published result.json', () => {
    const { files: bundledFiles, ...bundled } = EXAMPLE_RESULT;
    const { files: publishedFiles, ...published } = publishedResult;

    expect(bundled).toEqual(published);
    expect(Object.keys(bundledFiles).sort()).toEqual(Object.keys(publishedFiles).sort());
  });

  it('links only to artifacts served from public/example', () => {
    for (const url of Object.values(EXAMPLE_RESULT.files)) {
      expect(url).toMatch(/^\/example\//);
    }
  });

  it('has a full 10×10 map', () => {
    expect(EXAMPLE_RESULT.matrix).toHaveLength(EXAMPLE_RESULT.gridSize);
    for (const row of EXAMPLE_RESULT.matrix) {
      expect(row).toHaveLength(EXAMPLE_RESULT.gridSize);
    }
    expect(EXAMPLE_RESULT.spectraDropped).toBe(0);
  });

  it('uses the default colours, which the backend duplicates', () => {
    expect(EXAMPLE_RESULT.colorLow).toBe(DEFAULT_COLOR_LOW);
    expect(EXAMPLE_RESULT.colorMidLow).toBe(DEFAULT_COLOR_MID_LOW);
    expect(EXAMPLE_RESULT.colorMidHigh).toBe(DEFAULT_COLOR_MID_HIGH);
    expect(EXAMPLE_RESULT.colorHigh).toBe(DEFAULT_COLOR_HIGH);
  });
});
