import { Injectable } from '@nestjs/common';
import { renderHeatmapPng } from './heatmap/renderHeatmapPng';
import { renderReportPdf } from './pdf/renderReportPdf';
import { buildTextSummary } from './pdf/buildTextSummary';
import { matrixToCsv } from './csv/matrixToCsv';
import type { SpectrumComputation } from '../common/types/spectra.types';

export interface RenderedArtifacts {
  heatmapPng: Buffer;
  reportPdf: Buffer;
  matrixCsv: string;
  textSummary: string;
}

@Injectable()
export class RenderService {
  /** Produces all output artifacts (PNG, PDF, CSV, text) from a computation. */
  async render(computation: SpectrumComputation): Promise<RenderedArtifacts> {
    const heatmapPng = renderHeatmapPng(computation);
    const reportPdf = await renderReportPdf(computation, heatmapPng);
    return {
      heatmapPng,
      reportPdf,
      matrixCsv: matrixToCsv(computation.matrix, computation.xTicks, computation.yTicks),
      textSummary: buildTextSummary(computation),
    };
  }

  renderHeatmap(computation: SpectrumComputation): Buffer {
    return renderHeatmapPng(computation);
  }

  textSummary(computation: SpectrumComputation): string {
    return buildTextSummary(computation);
  }
}
