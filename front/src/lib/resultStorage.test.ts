import { describe, expect, it, vi } from 'vitest';
import { isSpectrumResult, readResultFromSession, saveResultToSession } from './resultStorage';
import { EXAMPLE_RESULT } from '../pages/example/exampleResult';

const STORAGE_KEY = 'spectracalc:v1:last-result';

describe('isSpectrumResult', () => {
  it('accepts a real result', () => {
    expect(isSpectrumResult(EXAMPLE_RESULT)).toBe(true);
  });

  it.each([null, undefined, 42, 'result', []])('rejects %j', (value) => {
    expect(isSpectrumResult(value)).toBe(false);
  });

  it.each([
    'gridSize',
    'matrix',
    'xTicks',
    'yTicks',
    'colorScaleMin',
    'colorScaleMax',
    'sourceFileName',
    'computedAt',
    'interval',
    'stats',
  ])('rejects a result without %s', (field) => {
    expect(isSpectrumResult({ ...EXAMPLE_RESULT, [field]: undefined })).toBe(false);
  });

  it('rejects a non-numeric interval and stats', () => {
    expect(isSpectrumResult({ ...EXAMPLE_RESULT, interval: { from: '1', to: 2 } })).toBe(false);
    expect(isSpectrumResult({ ...EXAMPLE_RESULT, stats: { meanIntensity: 'high' } })).toBe(false);
  });
});

describe('session storage', () => {
  it('round-trips a result', () => {
    saveResultToSession(EXAMPLE_RESULT);

    expect(readResultFromSession()).toEqual(EXAMPLE_RESULT);
  });

  it('has nothing to read at first', () => {
    expect(readResultFromSession()).toBeNull();
  });

  it('ignores corrupted JSON', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not json');

    expect(readResultFromSession()).toBeNull();
  });

  it('ignores data of the wrong shape', () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'old-format' }));

    expect(readResultFromSession()).toBeNull();
  });

  it('survives a full or disabled storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });

    expect(() => saveResultToSession(EXAMPLE_RESULT)).not.toThrow();
  });
});
