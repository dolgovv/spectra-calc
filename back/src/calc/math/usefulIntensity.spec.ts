import { usefulIntensity } from './usefulIntensity';
import type { Spectrum } from '../../common/types/spectra.types';

const spectrum: Spectrum = {
  name: 'test.esp',
  wavenumbers: [590, 600, 610, 620, 630],
  intensities: [50, 100, 500, 200, 80],
};

describe('usefulIntensity', () => {
  it('computes Imax minus the mean of the boundary intensities', () => {
    const result = usefulIntensity(spectrum, { from: 600, to: 620 });

    expect(result.imax).toBe(500);
    expect(result.peakWavenumber).toBe(610);
    expect(result.baseline).toBe(150);
    expect(result.useful).toBe(350);
  });

  it('takes the baseline from the samples nearest to boundaries that fall between samples', () => {
    const result = usefulIntensity(spectrum, { from: 597, to: 623 });

    expect(result.baseline).toBe(150);
  });

  it('only looks for the maximum inside the interval', () => {
    const result = usefulIntensity(spectrum, { from: 615, to: 630 });

    expect(result.imax).toBe(200);
    expect(result.peakWavenumber).toBe(620);
  });

  it('includes both interval boundaries', () => {
    expect(usefulIntensity(spectrum, { from: 610, to: 620 }).imax).toBe(500);
    expect(usefulIntensity(spectrum, { from: 600, to: 610 }).imax).toBe(500);
  });

  it('gives the same answer for a reversed interval', () => {
    expect(usefulIntensity(spectrum, { from: 620, to: 600 })).toEqual(
      usefulIntensity(spectrum, { from: 600, to: 620 }),
    );
  });

  it('throws when no sample falls inside the interval', () => {
    expect(() => usefulIntensity(spectrum, { from: 601, to: 609 })).toThrow(
      'Спектр "test.esp" не содержит точек в интервале 601–609 см⁻¹',
    );
  });
});
