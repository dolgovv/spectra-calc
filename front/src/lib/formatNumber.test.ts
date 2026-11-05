import { describe, expect, it } from 'vitest';
import { formatInteger, formatPercent } from './formatNumber';

describe('formatInteger', () => {
  it('rounds and groups digits the Russian way', () => {
    // ru-RU groups with a no-break space.
    expect(formatInteger(58419.6).replace(/\s/g, ' ')).toBe('58 420');
  });

  it('leaves short numbers alone', () => {
    expect(formatInteger(42)).toBe('42');
  });
});

describe('formatPercent', () => {
  it('keeps a period as the decimal separator', () => {
    expect(formatPercent(21.25, 2)).toBe('21.25');
  });

  it('defaults to one digit', () => {
    expect(formatPercent(13.549)).toBe('13.5');
  });
});
