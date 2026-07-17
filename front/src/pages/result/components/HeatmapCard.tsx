import { useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import Panel from '../../../common/components/Panel';
import PanelTitle from '../../../common/components/PanelTitle';
import Pill from '../../../common/components/Pill';
import HeatmapCanvas from './HeatmapCanvas';
import { createHeatmapScale } from '../../../lib/heatmapPalette';
import { formatInteger } from '../../../lib/formatNumber';
import type { SpectrumResult } from '../../../types/spectra';

export interface HeatmapCardProps {
  result: SpectrumResult;
}

const COLORBAR_TICK_COUNT = 4;

/** Colorbar labels, high → low, evenly spaced across the scale (e.g. 75 000 … 30 000). */
function colorbarTicks(min: number, max: number): number[] {
  const step = (max - min) / (COLORBAR_TICK_COUNT - 1);
  return Array.from({ length: COLORBAR_TICK_COUNT }, (_, i) => max - i * step);
}

export default function HeatmapCard({ result }: HeatmapCardProps) {
  // xTicks is every 100 µm (10 labels) — too dense under the map, so label every other one.
  const xTicks = result.xTicks.filter((_, i) => i % 2 === 0);

  const scale = useMemo(
    () => createHeatmapScale(result.matrix.flat(), result.colorScaleMin, result.colorScaleMax),
    [result.matrix, result.colorScaleMin, result.colorScaleMax],
  );

  return (
    <Panel className="p-[26px]">
      <PanelTitle
        right={
          <Pill icon={<LayoutGrid className="h-3 w-3" />}>
            {result.gridSize} × {result.gridSize} точек
          </Pill>
        }
      >
        Матрица интенсивности
      </PanelTitle>

      <div className="rounded-lg border border-border bg-surface-2 p-5 pb-2.5">
        <div className="flex gap-[18px]">
          <div className="flex items-center justify-center py-1 font-mono text-[11px] text-muted-faint [transform:rotate(180deg)] [writing-mode:vertical-rl]">
            Y, мкм
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="aspect-square w-full overflow-hidden rounded border border-border">
              <HeatmapCanvas matrix={result.matrix} scale={scale} />
            </div>
            <div className="flex justify-between px-0.5 pt-1 font-mono text-[9.5px] text-muted-faint">
              {xTicks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
            <div className="mt-2 text-center font-mono text-[11px] text-muted-faint">X, мкм</div>
          </div>

          <div className="flex w-16 shrink-0 flex-col items-center">
            <span className="mb-2 text-center font-mono text-[10.5px] leading-tight text-muted">
              I<br />
              {result.peakLabel} см⁻¹
            </span>
            <div className="flex h-[280px] gap-1.5">
              {/* Gradient comes from the scale, not a static class: the stops move with the data. */}
              <div
                className="w-3.5 rounded-sm border border-border"
                style={{ backgroundImage: scale.gradientCss }}
              />
              <div className="flex h-full flex-col items-end justify-between font-mono text-[9.5px] text-muted-faint">
                {colorbarTicks(result.colorScaleMin, result.colorScaleMax).map((tick) => (
                  <span key={tick}>{formatInteger(tick)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
