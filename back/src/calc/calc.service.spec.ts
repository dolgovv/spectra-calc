import { BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { CalcService } from './calc.service';
import { hundredHeights, makeSpectraZip, PEAK_INTERVAL } from '../../test/helpers/spectra-zip';

describe('CalcService', () => {
  const service = new CalcService();

  describe('a valid archive', () => {
    const result = service.compute(makeSpectraZip(hundredHeights()), PEAK_INTERVAL, 'map.zip');

    it('lays the spectra out as a 10×10 matrix in file order', () => {
      expect(result.gridSize).toBe(10);
      expect(result.matrix).toHaveLength(10);
      expect(result.matrix[0][0]).toBe(1000);
      expect(result.matrix[0][9]).toBe(10000);
      expect(result.matrix[1][0]).toBe(11000);
      expect(result.matrix[9][9]).toBe(100000);
    });

    it('computes statistics over all the points', () => {
      expect(result.stats.meanIntensity).toBe(50500);
      expect(result.stats.stdDeviation).toBeCloseTo(28866.07, 2);
      expect(result.stats.category).toBe('unacceptable');
      expect(result.stats.pointsProcessed).toBe(100);
      expect(result.stats.filesProcessed).toBe(100);
    });

    it('labels the axes in micrometres', () => {
      const ticks = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900];

      expect(result.xTicks).toEqual(ticks);
      expect(result.yTicks).toEqual(ticks);
    });

    it('rounds the colour scale bounds outward to a multiple of 5000', () => {
      expect(result.colorScaleMin).toBe(0);
      expect(result.colorScaleMax).toBe(100000);
    });

    it('labels the map with the median peak position', () => {
      expect(result.peakLabel).toBe(610);
    });

    it('echoes the request metadata', () => {
      expect(result.interval).toEqual(PEAK_INTERVAL);
      expect(result.sourceFileName).toBe('map.zip');
      expect(new Date(result.computedAt).toISOString()).toBe(result.computedAt);
    });

    it('reports that nothing was dropped', () => {
      expect(result.spectraFound).toBe(100);
      expect(result.spectraDropped).toBe(0);
    });
  });

  describe('the grid size', () => {
    const heights = (count: number) => Array.from({ length: count }, (_, i) => (i + 1) * 1000);
    const compute = (count: number) =>
      service.compute(makeSpectraZip(heights(count)), PEAK_INTERVAL, 'map.zip');

    it.each([
      [16, 4, 0],
      [65, 8, 1],
      [99, 9, 18],
      [101, 10, 1],
      [145, 12, 1],
    ])('fits %d spectra into the largest square', (count, side, dropped) => {
      const result = compute(count);

      expect(result.gridSize).toBe(side);
      expect(result.matrix).toHaveLength(side);
      expect(result.matrix.every((row) => row.length === side)).toBe(true);
      expect(result.spectraFound).toBe(count);
      expect(result.spectraDropped).toBe(dropped);
      expect(result.xTicks).toHaveLength(side);
    });

    it('computes the statistics over the used spectra only', () => {
      const { stats, matrix } = compute(101);

      expect(matrix[9][9]).toBe(100000);
      expect(stats.meanIntensity).toBe(50500);
      expect(stats.pointsProcessed).toBe(100);
      expect(stats.filesProcessed).toBe(100);
    });

    it('does not look into the dropped spectra', () => {
      const zip = new AdmZip(makeSpectraZip(heights(101)));
      zip.updateFile('specs/101.esp', Buffer.from('no numbers here\n'));

      expect(service.compute(zip.toBuffer(), PEAK_INTERVAL, 'map.zip').gridSize).toBe(10);
    });
  });

  describe('the display options', () => {
    const buffer = makeSpectraZip(hundredHeights());
    const plain = service.compute(buffer, PEAK_INTERVAL, 'map.zip');

    it('defaults to the magma ramp', () => {
      expect([plain.colorLow, plain.colorMidLow, plain.colorMidHigh, plain.colorHigh]).toEqual([
        '#000004',
        '#731e7b',
        '#e46d69',
        '#fcfdbf',
      ]);
    });

    it('changes the axes and the colours, but not the numbers', () => {
      const custom = service.compute(buffer, PEAK_INTERVAL, 'map.zip', {
        spatialStepMicrons: 50,
        colorLow: '#111111',
        colorMidLow: '#222222',
        colorMidHigh: '#333333',
        colorHigh: '#444444',
      });

      expect(custom.xTicks.slice(0, 3)).toEqual([0, 50, 100]);
      expect(custom.yTicks[9]).toBe(450);
      expect(custom.colorLow).toBe('#111111');
      expect(custom.colorMidLow).toBe('#222222');
      expect(custom.colorMidHigh).toBe('#333333');
      expect(custom.colorHigh).toBe('#444444');
      expect(custom.matrix).toEqual(plain.matrix);
      expect(custom.stats.sr).toBe(plain.stats.sr);
    });
  });

  describe('invalid input', () => {
    const valid = makeSpectraZip(hundredHeights());

    function expectRejected(buffer: Buffer, interval: typeof PEAK_INTERVAL, message: string): void {
      const compute = () => service.compute(buffer, interval, 'map.zip');

      expect(compute).toThrow(BadRequestException);
      expect(compute).toThrow(message);
    }

    it.each([
      [{ from: 625, to: 595 }, 'reversed'],
      [{ from: 600, to: 600 }, 'empty'],
    ])('rejects the interval %j (%s)', (interval) => {
      expectRejected(valid, interval, 'Некорректный интервал');
    });

    it.each([0, 1, 15])('rejects an archive of %d spectra, too few for a 4×4 grid', (count) => {
      const buffer = makeSpectraZip(Array.from({ length: count }, () => 1000));

      expectRejected(buffer, PEAK_INTERVAL, `найдено ${count}`);
    });

    it('rejects a spectrum without data and names the file', () => {
      const zip = new AdmZip(makeSpectraZip(hundredHeights()));
      zip.updateFile('specs/42.esp', Buffer.from('no numbers here\n'));

      expectRejected(zip.toBuffer(), PEAK_INTERVAL, 'Файл "42.esp" не содержит данных');
    });

    it('rejects an interval that misses the spectra', () => {
      expectRejected(valid, { from: 5000, to: 6000 }, 'не содержит точек в интервале');
    });

    it('rejects a buffer that is not a zip', () => {
      expectRejected(Buffer.from('not a zip'), PEAK_INTERVAL, 'Не удалось прочитать ZIP-архив');
    });
  });
});
