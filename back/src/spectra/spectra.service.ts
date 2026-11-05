import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CalcService, type ComputeDisplayOptions } from '../calc/calc.service';
import { RenderService } from '../render/render.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import type { CalculationResult, SpectrumInterval } from '../common/types/spectra.types';

const FILE_NAMES = {
  heatmapPng: 'heatmap.png',
  reportPdf: 'report.pdf',
  matrixCsv: 'matrix.csv',
  metaJson: 'result.json',
} as const;

export interface CalculateParams extends ComputeDisplayOptions {
  buffer: Buffer;
  interval: SpectrumInterval;
  sourceFileName: string;
}

@Injectable()
export class SpectraService {
  constructor(
    private readonly calc: CalcService,
    private readonly render: RenderService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
  ) {}

  /**
   * compute → render → persist → result JSON with file URLs, which the web client needs for its
   * download links. The queue guard wraps persistence too, so the in-flight count only drops once
   * the artifacts are actually on disk.
   */
  async calculate({
    buffer,
    interval,
    sourceFileName,
    ...displayOptions
  }: CalculateParams): Promise<CalculationResult> {
    return this.queue.run(async () => {
      const computation = this.calc.compute(buffer, interval, sourceFileName, displayOptions);
      const artifacts = await this.render.render(computation);
      const id = randomUUID();

      const files = {
        heatmapPng: this.storage.publicUrl(id, FILE_NAMES.heatmapPng),
        reportPdf: this.storage.publicUrl(id, FILE_NAMES.reportPdf),
        matrixCsv: this.storage.publicUrl(id, FILE_NAMES.matrixCsv),
        metaJson: this.storage.publicUrl(id, FILE_NAMES.metaJson),
      };

      const result: CalculationResult = { id, ...computation, files };

      await Promise.all([
        this.storage.save(id, FILE_NAMES.heatmapPng, artifacts.heatmapPng),
        this.storage.save(id, FILE_NAMES.reportPdf, artifacts.reportPdf),
        this.storage.save(id, FILE_NAMES.matrixCsv, artifacts.matrixCsv),
        this.storage.save(id, FILE_NAMES.metaJson, JSON.stringify(result, null, 2)),
      ]);

      return result;
    });
  }
}
