import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CalcService } from '../calc/calc.service';
import { RenderService, type RenderedArtifacts } from '../render/render.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import type {
  CalculationResult,
  SpectrumInterval,
} from '../common/types/spectra.types';

/** Result plus the in-memory artifacts (buffers), so the bot can reply without a self-fetch. */
export interface CalculationOutput {
  result: CalculationResult;
  artifacts: RenderedArtifacts;
}

const FILE_NAMES = {
  heatmapPng: 'heatmap.png',
  reportPdf: 'report.pdf',
  matrixCsv: 'matrix.csv',
  metaJson: 'result.json',
} as const;

export interface CalculateParams {
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

  /** HTTP path: returns just the result JSON (with file URLs). */
  async calculate(params: CalculateParams): Promise<CalculationResult> {
    return (await this.calculateWithArtifacts(params)).result;
  }

  /**
   * End-to-end job: compute → render (PNG/PDF/CSV) → persist → assemble result JSON.
   * Wrapped by the queue guard so the service rejects overload with HTTP 429. Also returns the
   * in-memory artifacts so callers (the bot) can reply without re-fetching over HTTP.
   */
  async calculateWithArtifacts({
    buffer,
    interval,
    sourceFileName,
  }: CalculateParams): Promise<CalculationOutput> {
    return this.queue.run(async () => {
      const id = randomUUID();
      const computation = this.calc.compute(buffer, interval, sourceFileName);
      const artifacts = await this.render.render(computation);

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

      return { result, artifacts };
    });
  }
}
