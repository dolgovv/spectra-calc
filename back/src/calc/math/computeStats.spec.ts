import { categorize } from './categorize';
import { computeStats } from './computeStats';

describe('computeStats', () => {
  it('computes the mean, population σ and Sr', () => {
    // Textbook set: μ = 5, population σ = 2 (the sample σ would be ≈ 2.138).
    const stats = computeStats([2, 4, 4, 4, 5, 5, 7, 9], 8, 0.1);

    expect(stats.meanIntensity).toBe(5);
    expect(stats.stdDeviation).toBe(2);
    expect(stats.sr).toBeCloseTo(0.4);
    expect(stats.relStdDeviationPercent).toBeCloseTo(40);
  });

  it('assigns the category from Sr', () => {
    const stats = computeStats([100, 100, 100], 3, 0);

    expect(stats.sr).toBe(0);
    expect(stats.category).toBe('excellent');
    expect(stats.categoryLabel).toBe('отлично');
  });

  it('does not divide by a zero mean', () => {
    const stats = computeStats([-1, 1], 2, 0);

    expect(stats.meanIntensity).toBe(0);
    expect(stats.sr).toBe(0);
  });

  it('reports the counters and timing it was given', () => {
    const stats = computeStats([1, 2], 7, 0.3);

    expect(stats.pointsProcessed).toBe(2);
    expect(stats.filesProcessed).toBe(7);
    expect(stats.calcTimeSeconds).toBe(0.3);
  });
});

describe('categorize', () => {
  it.each([
    [0, 'excellent', 'отлично'],
    [0.1499, 'excellent', 'отлично'],
    [0.15, 'acceptable', 'приемлемо'],
    [0.1999, 'acceptable', 'приемлемо'],
    [0.2, 'satisfactory', 'удовлетворительно'],
    [0.2999, 'satisfactory', 'удовлетворительно'],
    [0.3, 'unacceptable', 'неприемлемо'],
    [1.5, 'unacceptable', 'неприемлемо'],
  ])('Sr = %d is %s', (sr, category, categoryLabel) => {
    expect(categorize(sr)).toEqual({ category, categoryLabel });
  });
});
