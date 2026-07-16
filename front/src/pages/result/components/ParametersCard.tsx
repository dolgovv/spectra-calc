import Panel from '../../../common/components/Panel';
import PanelTitle from '../../../common/components/PanelTitle';
import type { SpectrumResult } from '../../../types/spectra';

export interface ParametersCardProps {
  result: SpectrumResult;
}

/** One receipt line: key, dotted leader stretching to fill, value right-aligned. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-2.5 font-mono text-[12.5px]">
      <span className="whitespace-nowrap text-muted-faint">{label}</span>
      <span className="min-w-4 flex-1 -translate-y-1 border-b border-dotted border-muted-faint" />
      <span className="break-all text-right text-foreground">{value}</span>
    </div>
  );
}

export default function ParametersCard({ result }: ParametersCardProps) {
  return (
    <Panel className="p-[26px]">
      <PanelTitle>Параметры расчёта</PanelTitle>
      <Row label="Архив" value={result.sourceFileName} />
      <Row label="Файлов" value={String(result.stats.filesProcessed)} />
      <Row label="Интервал" value={`${result.interval.from}–${result.interval.to} см⁻¹`} />
      <Row label="Время расчёта" value={`${result.stats.calcTimeSeconds} с`} />
    </Panel>
  );
}
