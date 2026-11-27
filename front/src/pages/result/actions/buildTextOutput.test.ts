import { describe, expect, it } from 'vitest';
import { buildTextOutput } from './buildTextOutput';
import { EXAMPLE_RESULT } from '../../example/exampleResult';

describe('buildTextOutput', () => {
  const lines = buildTextOutput(EXAMPLE_RESULT).map((line) => ({
    ...line,
    value: line.value.replace(/\s/g, ' '),
  }));

  it('prints every line of the console in order', () => {
    expect(lines.map((line) => [line.label, line.value, line.suffix])).toEqual([
      ['Interval', '580 - 650', 'cm^-1'],
      ['Mean intensity', '64 169', 'a.u.'],
      ['Std deviation', '8 695', 'a.u.'],
      ['Rel. std deviation (Sr)', '13.5 %', undefined],
      ['Uniformity', 'отлично', undefined],
      ['Points processed', '100', undefined],
      ['Files processed', '100', undefined],
    ]);
  });

  it('accents the measured values but not the counters', () => {
    expect(lines.filter((line) => line.highlight)).toHaveLength(5);
    expect(lines.slice(-2).every((line) => !line.highlight)).toBe(true);
  });
});
