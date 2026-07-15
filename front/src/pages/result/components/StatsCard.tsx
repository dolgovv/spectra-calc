import Card from '../../../common/components/Card';
import Badge from '../../../common/components/Badge';
import StatRow from './StatRow';
import { cn } from '../../../lib/cn';
import type {
  CategoryKey,
  SpectrumInterval,
  SpectrumStats,
} from '../../../types/spectra';
import { formatInteger, formatPercent } from '../../../lib/formatNumber';

export interface StatsCardProps {
  interval: SpectrumInterval;
  stats: SpectrumStats;
}

const CATEGORY_CLASSES: Record<CategoryKey, string> = {
  excellent: 'bg-accent/15 text-accent border-accent/30',
  acceptable: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  satisfactory: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  unacceptable: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function StatsCard({ interval, stats }: StatsCardProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Результаты расчёта</h2>
        <Badge>
          Интервал: {interval.from}-{interval.to} см⁻¹
        </Badge>
      </div>
      <StatRow
        label="Средняя интенсивность"
        value={formatInteger(stats.meanIntensity)}
        unit="отн. ед."
      />
      <StatRow
        label="Стандартное отклонение"
        value={formatInteger(stats.stdDeviation)}
        unit="отн. ед."
      />
      <StatRow
        label="Относительное стандартное отклонение"
        value={formatPercent(stats.relStdDeviationPercent)}
        unit="%"
      />
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted">Равномерность покрытия</span>
        <span
          className={cn(
            'rounded-full border px-3 py-1 text-sm font-semibold capitalize',
            CATEGORY_CLASSES[stats.category],
          )}
        >
          {stats.categoryLabel}
        </span>
      </div>
    </Card>
  );
}
