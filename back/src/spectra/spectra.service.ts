import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CalcService } from '../calc/calc.service';
import { RenderService, type RenderedArtifacts } from '../render/render.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import type {
  CalculationResult,
  SpectrumComputation,
  SpectrumInterval,
} from '../common/types/spectra.types';

/**
 * A finished calculation that was never written to disk: no job id, no file links — by design.
 * Callers that deliver the artifacts inline (the bot) get this, so a URL to a file that does not
 * exist is not representable on that path.
 */
export interface InMemoryCalculation {
  computation: SpectrumComputation;
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

  /**
   * HTTP path: compute → render → persist → result JSON with file URLs, which the web client
   * needs for its download links. The queue guard wraps persistence too, so the in-flight count
   * only drops once the artifacts are actually on disk.
   */
  async calculate(params: CalculateParams): Promise<CalculationResult> {
    return this.queue.run(async () => {
      const { computation, artifacts } = await this.computeAndRender(params);
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

  /**
   * Bot path: same computation, but nothing is written to storage — the bot replies with the
   * buffers themselves and never hands out a link, so persisting would only be disk we can
   * never serve.
   */
  async calculateInMemory(params: CalculateParams): Promise<InMemoryCalculation> {
    return this.queue.run(() => this.computeAndRender(params));
  }

  /** Compute + render only. Deliberately queue- and storage-agnostic: the guard lives at the
   *  public boundary above, so this step can never be double-wrapped or persist by accident. */
  private async computeAndRender({
    buffer,
    interval,
    sourceFileName,
  }: CalculateParams): Promise<InMemoryCalculation> {
    const computation = this.calc.compute(buffer, interval, sourceFileName);
    const artifacts = await this.render.render(computation);
    return { computation, artifacts };
  }
}
