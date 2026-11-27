import { matrixToCsv } from './csv/matrixToCsv';
import { createHeatmapScale, hexToRgb, type RGB } from './heatmap/colorScale';
import { buildTextSummary } from './pdf/buildTextSummary';
import { RenderService } from './render.service';
import { CalcService } from '../calc/calc.service';
import { hundredHeights, makeSpectraZip, PEAK_INTERVAL } from '../../test/helpers/spectra-zip';

describe('matrixToCsv', () => {
  it('writes the axes and two-decimal values', () => {
    const csv = matrixToCsv(
      [
        [1, 2.345],
        [3.1, 4],
      ],
      [0, 100],
      [0, 100],
    );

    expect(csv).toBe('Y \\ X,0,100\n0,1.00,2.35\n100,3.10,4.00');
  });
});

describe('hexToRgb', () => {
  it('parses a #rrggbb colour', () => {
    expect(hexToRgb('#000004')).toEqual([0, 0, 4]);
    expect(hexToRgb('#fcfdbf')).toEqual([252, 253, 191]);
  });
});

describe('createHeatmapScale', () => {
  const COLORS: RGB[] = [
    [0, 0, 0],
    [100, 0, 0],
    [0, 100, 0],
    [0, 0, 100],
  ];
  const ONE_TO_HUNDRED = Array.from({ length: 100 }, (_, i) => i + 1);

  it('spans the colours between the labelled bounds', () => {
    const scale = createHeatmapScale(ONE_TO_HUNDRED, 1, 100, COLORS);

    expect(scale(1)).toEqual(COLORS[0]);
    expect(scale(100)).toEqual(COLORS[3]);
  });

  it('clamps values outside the bounds', () => {
    const scale = createHeatmapScale(ONE_TO_HUNDRED, 1, 100, COLORS);

    expect(scale(-1000)).toEqual(COLORS[0]);
    expect(scale(1000)).toEqual(COLORS[3]);
  });

  it('places each colour at its own quantile of the data', () => {
    const skewed = ONE_TO_HUNDRED.map((v) => v ** 2);
    const scale = createHeatmapScale(skewed, skewed[0], skewed[99], COLORS);

    expect(scale(skewed[33])).toEqual(COLORS[1]);
    expect(scale(skewed[66])).toEqual(COLORS[2]);
  });

  it('falls back to the design positions on flat data', () => {
    const scale = createHeatmapScale(Array<number>(100).fill(5), 0, 9, COLORS);

    expect(scale(3)).toEqual(COLORS[1]);
    expect(scale(6)).toEqual(COLORS[2]);
  });

  it('stays finite when the bounds coincide', () => {
    const scale = createHeatmapScale([5, 5], 5, 5, COLORS);

    expect(scale(5).every(Number.isFinite)).toBe(true);
  });
});

describe('RenderService', () => {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const calc = new CalcService();
  const archive = makeSpectraZip(hundredHeights());
  const computation = calc.compute(archive, PEAK_INTERVAL, 'map.zip');
  const service = new RenderService();

  it('renders every artifact', async () => {
    const artifacts = await service.render(computation);

    expect(artifacts.heatmapPng.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(artifacts.reportPdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(artifacts.matrixCsv.split('\n')).toHaveLength(11);
    expect(artifacts.textSummary).toBe(buildTextSummary(computation));
  });

  it('renders a truncated map of another size', async () => {
    const heights = Array.from({ length: 65 }, (_, i) => (i + 1) * 1000);

    const artifacts = await service.render(
      calc.compute(makeSpectraZip(heights), PEAK_INTERVAL, 'map.zip'),
    );

    expect(artifacts.heatmapPng.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    expect(artifacts.reportPdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(artifacts.matrixCsv.split('\n')).toHaveLength(9);
  });

  it('draws the exported map in the chosen colours', async () => {
    const recoloured = calc.compute(archive, PEAK_INTERVAL, 'map.zip', { colorHigh: '#ff0000' });

    const [plain, custom] = await Promise.all([service.render(computation), service.render(recoloured)]);

    expect(custom.heatmapPng.equals(plain.heatmapPng)).toBe(false);
    expect(custom.matrixCsv).toBe(plain.matrixCsv);
  });

  it('summarises the result as text', () => {
    // ru-RU groups digits with a no-break space.
    const summary = buildTextSummary(computation).replace(/\s/g, ' ');

    expect(summary).toContain('Интервал: 595–625 см⁻¹');
    expect(summary).toContain('(μ): 50 500 отн. ед.');
    expect(summary).toContain('(σ): 28 866 отн. ед.');
    expect(summary).toContain('(Sr): 57.2 %');
    expect(summary).toContain('Категория равномерности: неприемлемо');
    expect(summary).toContain('Обработано точек: 100');
    expect(summary).toContain('Обработано файлов: 100');
  });
});
