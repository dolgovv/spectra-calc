import type { Spectrum, SpectrumInterval } from '../../common/types/spectra.types';

export interface UsefulIntensityResult {
  /** Iполезн = Imax − (Ileft + Iright) / 2 */
  useful: number;
  /** Imax within [from, to]. */
  imax: number;
  /** Wavenumber at which Imax occurs (used to derive the representative peak label). */
  peakWavenumber: number;
  baseline: number;
}

/**
 * Computes the "useful" peak intensity of one spectrum over [from, to]:
 *   Iполезн = Imax − (Ileft + Iright)/2
 * where Imax is the maximum intensity inside the interval, and Ileft/Iright are the
 * intensities at the samples closest to the interval boundaries.
 */
export function usefulIntensity(
  spectrum: Spectrum,
  interval: SpectrumInterval,
): UsefulIntensityResult {
  const { wavenumbers, intensities } = spectrum;
  const from = Math.min(interval.from, interval.to);
  const to = Math.max(interval.from, interval.to);

  let imax = -Infinity;
  let peakWavenumber = from;
  let foundInside = false;

  for (let i = 0; i < wavenumbers.length; i++) {
    const w = wavenumbers[i];
    if (w >= from && w <= to) {
      foundInside = true;
      if (intensities[i] > imax) {
        imax = intensities[i];
        peakWavenumber = w;
      }
    }
  }

  if (!foundInside) {
    throw new Error(
      `Спектр "${spectrum.name}" не содержит точек в интервале ${from}–${to} см⁻¹`,
    );
  }

  const ileft = intensities[nearestIndex(wavenumbers, from)];
  const iright = intensities[nearestIndex(wavenumbers, to)];
  const baseline = (ileft + iright) / 2;

  return { useful: imax - baseline, imax, peakWavenumber, baseline };
}

/** Index of the sample whose wavenumber is closest to `target`. */
function nearestIndex(wavenumbers: number[], target: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < wavenumbers.length; i++) {
    const dist = Math.abs(wavenumbers[i] - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
