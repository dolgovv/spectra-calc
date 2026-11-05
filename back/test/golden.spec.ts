import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CalcService } from '../src/calc/calc.service';
import { usefulIntensity } from '../src/calc/math/usefulIntensity';
import { extractSpectraFromZip } from '../src/calc/parsers/extractSpectraFromZip';
import { matrixToCsv } from '../src/render/csv/matrixToCsv';
import expectedOutput from './fixtures/expected-output.json';

/**
 * Runs the calculation on the real instrument archives from test_files/.
 *
 * expected-output.json holds the "I ГКР" row of the hand-made workbooks in
 * test_files/expected_output/, one value per spectrum, with the workbooks' duplicated first
 * column dropped. The workbooks read Imax from one fixed wavenumber for the whole map, while the
 * app takes each spectrum's own maximum, so the two only agree on everything else: which file is
 * which spectrum, the parsing, and the baseline.
 */
const REPO_ROOT = join(__dirname, '..', '..');
const INTERVAL = { from: 595, to: 625 };

function readArchive(name: string): Buffer {
  return readFileSync(join(REPO_ROOT, 'test_files', 'input', name));
}

describe('real archives', () => {
  const service = new CalcService();

  describe.each(Object.entries(expectedOutput))('%s against the manual calculation', (_, expected) => {
    const spectra = extractSpectraFromZip(readArchive(expected.archive));

    it('reproduces the manual value at the fixed peak position', () => {
      expected.useful.forEach((manual, i) => {
        const { wavenumbers, intensities } = spectra[i];
        const { baseline } = usefulIntensity(spectra[i], INTERVAL);
        const atPeak = intensities[wavenumbers.indexOf(expected.peakWavenumber)];

        expect(atPeak - baseline).toBeCloseTo(manual, 2);
      });
    });

    it('never falls below the manual value, since it searches the whole interval', () => {
      expected.useful.forEach((manual, i) => {
        expect(usefulIntensity(spectra[i], INTERVAL).useful).toBeGreaterThanOrEqual(manual - 0.01);
      });
    });
  });

  describe('pinned statistics', () => {
    it.each([
      ['substrate1', 68233.17, 0.18447, 'acceptable'],
      ['substrate3', 60631.17, 0.14098, 'excellent'],
    ] as const)('%s over 595–625', (key, mean, sr, category) => {
      const { archive } = expectedOutput[key];

      const { stats } = service.compute(readArchive(archive), INTERVAL, archive);

      expect(stats.meanIntensity).toBeCloseTo(mean, 2);
      expect(stats.sr).toBeCloseTo(sr, 5);
      expect(stats.category).toBe(category);
      expect(stats.pointsProcessed).toBe(100);
    });
  });

  it('fits substrate2, which has 75 spectra, into an 8×8 grid', () => {
    const { archive } = expectedOutput.substrate2;

    const result = service.compute(readArchive(archive), INTERVAL, archive);

    expect(result.gridSize).toBe(8);
    expect(result.spectraFound).toBe(75);
    expect(result.spectraDropped).toBe(11);
    expect(result.stats.pointsProcessed).toBe(64);
  });

  describe('the frozen /example page fixture', () => {
    const exampleDir = join(REPO_ROOT, 'front', 'public', 'example');
    const frozen = JSON.parse(readFileSync(join(exampleDir, 'result.json'), 'utf-8'));
    const result = service.compute(
      readArchive(frozen.sourceFileName),
      frozen.interval,
      frozen.sourceFileName,
    );

    it('still matches a fresh calculation', () => {
      expect(result.matrix).toEqual(frozen.matrix);
      expect(result.peakLabel).toBe(frozen.peakLabel);
      expect(result.colorScaleMin).toBe(frozen.colorScaleMin);
      expect(result.colorScaleMax).toBe(frozen.colorScaleMax);
      expect(result.stats).toEqual({ ...frozen.stats, calcTimeSeconds: result.stats.calcTimeSeconds });
      expect(result.spectraFound).toBe(frozen.spectraFound);
      expect(result.spectraDropped).toBe(frozen.spectraDropped);
    });

    it('uses the default colours, which the frontend duplicates', () => {
      expect(result.colorLow).toBe(frozen.colorLow);
      expect(result.colorMidLow).toBe(frozen.colorMidLow);
      expect(result.colorMidHigh).toBe(frozen.colorMidHigh);
      expect(result.colorHigh).toBe(frozen.colorHigh);
    });

    it('matches the published CSV', () => {
      const csv = readFileSync(join(exampleDir, 'matrix.csv'), 'utf-8');

      expect(matrixToCsv(result.matrix, result.xTicks, result.yTicks)).toBe(csv.trimEnd());
    });
  });
});
