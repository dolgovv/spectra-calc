import Card from '../../../common/components/Card';
import type { SpectrumResult } from '../../../types/spectra';

export interface ParametersCardProps {
  result: SpectrumResult;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function ParametersCard({ result }: ParametersCardProps) {
  return (
    <Card className="p-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Параметры расчёта
      </p>
      <Row label="Архив" value={result.sourceFileName} />
      <Row label="Файлов" value={String(result.stats.filesProcessed)} />
      <Row label="Интервал" value={`${result.interval.from}-${result.interval.to} см⁻¹`} />
      <Row label="Время расчёта" value={`${result.stats.calcTimeSeconds} с`} />
    </Card>
  );
}
