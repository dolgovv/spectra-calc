import { BadRequestException, Injectable } from '@nestjs/common';
import { extractSpectraFromZip } from './parsers/extractSpectraFromZip';
import { usefulIntensity } from './math/usefulIntensity';
import { buildMatrix } from './math/buildMatrix';
import { computeStats } from './math/computeStats';
import {
  EXPECTED_SPECTRA,
  GRID_SIZE,
  SPATIAL_EXTENT_MICRONS,
} from '../common/constants';
import type {
  SpectrumComputation,
  SpectrumInterval,
} from '../common/types/spectra.types';

@Injectable()
export class CalcService {
  /**
   * Full computational pipeline: ZIP buffer + interval → 10×10 useful-intensity matrix,
   * statistics and metadata. Throws BadRequestException for invalid input (wrong file count,
   * empty spectra, interval out of range).
   */
  compute(
    buffer: Buffer,
    interval: SpectrumInterval,
    sourceFileName: string,
  ): SpectrumComputation {
    const start = process.hrtime.bigint();

    if (interval.from >= interval.to) {
      throw new BadRequestException('Некорректный интервал: "От" должно быть меньше "До"');
    }

    const spectra = extractSpectraFromZip(buffer);
    if (spectra.length !== EXPECTED_SPECTRA) {
      throw new BadRequestException(
        `Ожидалось ровно ${EXPECTED_SPECTRA} файлов спектров (.txt/.esp), найдено ${spectra.length}`,
      );
    }

    const usefulValues: number[] = [];
    const peakWavenumbers: number[] = [];
    for (const spectrum of spectra) {
      if (spectrum.wavenumbers.length === 0) {
        throw new BadRequestException(`Файл "${spectrum.name}" не содержит данных спектра`);
      }
      try {
        const result = usefulIntensity(spectrum, interval);
        usefulValues.push(result.useful);
        peakWavenumbers.push(result.peakWavenumber);
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }

    const matrix = buildMatrix(usefulValues, GRID_SIZE);
    const calcTimeSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const stats = computeStats(
      usefulValues,
      spectra.length,
      Math.round(calcTimeSeconds * 10) / 10,
    );

    const ticks = this.buildTicks(GRID_SIZE);
    const [colorScaleMin, colorScaleMax] = this.colorBounds(usefulValues);

    return {
      interval,
      gridSize: GRID_SIZE,
      matrix,
      xTicks: ticks,
      yTicks: ticks,
      colorScaleMin,
      colorScaleMax,
      peakLabel: Math.round(median(peakWavenumbers)),
      stats,
      sourceFileName,
      computedAt: new Date().toISOString(),
    };
  }

  private buildTicks(gridSize: number): number[] {
    const step = SPATIAL_EXTENT_MICRONS / (gridSize - 1);
    return Array.from({ length: gridSize }, (_, i) => Math.round(i * step));
  }

  /** Nice-rounded color-scale bounds (down/up to nearest 5000), matching the frontend. */
  private colorBounds(values: number[]): [number, number] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return [Math.floor(min / 5000) * 5000, Math.ceil(max / 5000) * 5000];
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
