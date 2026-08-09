import { AlertTriangle } from 'lucide-react';
import type { SpectrumResult } from '../../../types/spectra';

export interface TruncationNoticeProps {
  result: SpectrumResult;
}

/** Flags that the archive had more spectra than fit the square grid, and some were dropped. */
export default function TruncationNotice({ result }: TruncationNoticeProps) {
  const used = result.gridSize * result.gridSize;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-panel border border-amber-400/40 bg-amber-400/10 p-4">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <p className="font-mono text-[12.5px] leading-relaxed text-muted">
        Матрица построена по короткой стороне: сетка {result.gridSize} × {result.gridSize} (
        {used} точек) из {result.spectraFound} найденных файлов — {result.spectraDropped}{' '}
        лишних спектров отброшено.
      </p>
    </div>
  );
}
