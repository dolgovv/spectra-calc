import { describe, expect, it } from 'vitest';
import { formatBytes, formatDay, formatDuration, formatRetention } from './format';
import { niceTicks } from './components/niceTicks';

describe('admin formatting', () => {
  it.each([
    [null, '—'],
    [512, '512 Б'],
    [1536, '1.5 КБ'],
    [9 * 1024 * 1024, '9.0 МБ'],
    [3 * 1024 ** 3, '3.0 ГБ'],
  ])('formatBytes(%j) → %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });

  it.each([
    [null, '—'],
    [0.4, '0 мс'],
    [840, '840 мс'],
    [2400, '2.4 с'],
  ])('formatDuration(%j) → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });

  it('shortens a day to day.month', () => {
    expect(formatDay('2026-11-07')).toBe('07.11');
  });

  it('spells a zero retention as forever', () => {
    expect(formatRetention(30)).toBe('30 дн.');
    expect(formatRetention(0)).toBe('бессрочно');
  });
});

describe('niceTicks', () => {
  it.each([
    [0, [0, 1]],
    [1, [0, 1]],
    [3, [0, 1, 2, 3]],
    [7, [0, 2, 4, 6, 8]],
    [137, [0, 50, 100, 150]],
    [1000, [0, 500, 1000]],
  ])('%i → %j', (max, ticks) => {
    expect(niceTicks(max)).toEqual(ticks);
  });
});
