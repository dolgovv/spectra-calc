import { BadRequestException, Injectable } from '@nestjs/common';
import { extractSpectraFromZip } from './parsers/extractSpectraFromZip';
import { usefulIntensity } from './math/usefulIntensity';
import { buildMatrix } from './math/buildMatrix';
import { computeStats } from './math/computeStats';
import {
  DEFAULT_COLOR_HIGH,
  DEFAULT_COLOR_LOW,
  DEFAULT_COLOR_MID_HIGH,
  DEFAULT_COLOR_MID_LOW,
  DEFAULT_SPATIAL_STEP_MICRONS,
  MIN_GRID_SIZE,
} from '../common/constants';
import type {
  SpectrumComputation,
  SpectrumInterval,
} from '../common/types/spectra.types';

/** Display-only knobs: none of these affect the matrix or stats, only how the map is drawn. */
export interface ComputeDisplayOptions {
  spatialStepMicrons?: number;
  colorLow?: string;
  colorMidLow?: string;
  colorMidHigh?: string;
  colorHigh?: string;
}

@Injectable()
export class CalcService {
  /**
   * Full computational pipeline: ZIP buffer + interval → square useful-intensity matrix,
   * statistics and metadata. The matrix side is the largest square that fits the number of
   * spectra found (e.g. 65 spectra → 8×8, 145 → 12×12), dropping whatever doesn't fit into
   * that square. Throws BadRequestException for invalid input (too few spectra, empty
   * spectra, interval out of range).
   */
  compute(
    buffer: Buffer,
    interval: SpectrumInterval,
    sourceFileName: string,
    displayOptions: ComputeDisplayOptions = {},
  ): SpectrumComputation {
    const {
      spatialStepMicrons = DEFAULT_SPATIAL_STEP_MICRONS,
      colorLow = DEFAULT_COLOR_LOW,
      colorMidLow = DEFAULT_COLOR_MID_LOW,
      colorMidHigh = DEFAULT_COLOR_MID_HIGH,
      colorHigh = DEFAULT_COLOR_HIGH,
    } = displayOptions;
    const start = process.hrtime.bigint();

    if (interval.from >= interval.to) {
      throw new BadRequestException('Некорректный интервал: "От" должно быть меньше "До"');
    }

    const spectra = extractSpectraFromZip(buffer);
    const gridSize = Math.floor(Math.sqrt(spectra.length));
    if (gridSize < MIN_GRID_SIZE) {
      throw new BadRequestException(
        `Недостаточно спектров: найдено ${spectra.length}, нужно минимум ${MIN_GRID_SIZE * MIN_GRID_SIZE} (сетка ${MIN_GRID_SIZE}×${MIN_GRID_SIZE})`,
      );
    }
    const usedCount = gridSize * gridSize;
    const usedSpectra = spectra.slice(0, usedCount);
    const spectraDropped = spectra.length - usedCount;

    const usefulValues: number[] = [];
    const peakWavenumbers: number[] = [];
    for (const spectrum of usedSpectra) {
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

    const matrix = buildMatrix(usefulValues, gridSize);
    const calcTimeSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const stats = computeStats(
      usefulValues,
      usedSpectra.length,
      Math.round(calcTimeSeconds * 10) / 10,
    );

    const ticks = this.buildTicks(gridSize, spatialStepMicrons);
    const [colorScaleMin, colorScaleMax] = this.colorBounds(usefulValues);

    return {
      interval,
      gridSize,
      matrix,
      xTicks: ticks,
      yTicks: ticks,
      colorScaleMin,
      colorScaleMax,
      peakLabel: Math.round(median(peakWavenumbers)),
      stats,
      sourceFileName,
      computedAt: new Date().toISOString(),
      spectraFound: spectra.length,
      spectraDropped,
      colorLow,
      colorMidLow,
      colorMidHigh,
      colorHigh,
    };
  }

  private buildTicks(gridSize: number, stepMicrons: number): number[] {
    return Array.from({ length: gridSize }, (_, i) => i * stepMicrons);
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
