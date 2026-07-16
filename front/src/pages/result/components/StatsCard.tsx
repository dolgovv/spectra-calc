import Panel from '../../../common/components/Panel';
import PanelTitle from '../../../common/components/PanelTitle';
import Pill from '../../../common/components/Pill';
import StatRow from './StatRow';
import { cn } from '../../../lib/cn';
import type { CategoryKey, SpectrumInterval, SpectrumStats } from '../../../types/spectra';
import { formatInteger, formatPercent } from '../../../lib/formatNumber';

export interface StatsCardProps {
  interval: SpectrumInterval;
  stats: SpectrumStats;
}

/** Rubber-stamp treatment per uniformity grade: colour plus a pass/fail glyph. */
const CATEGORY: Record<CategoryKey, { classes: string; glyph: string }> = {
  excellent: { classes: 'text-green border-green', glyph: '✓' },
  acceptable: { classes: 'text-teal-300 border-teal-300', glyph: '✓' },
  satisfactory: { classes: 'text-amber-400 border-amber-400', glyph: '✓' },
  unacceptable: { classes: 'text-accent border-accent', glyph: '✕' },
};

export default function StatsCard({ interval, stats }: StatsCardProps) {
  const category = CATEGORY[stats.category];

  return (
    <Panel className="p-[26px]">
      <PanelTitle
        right={
          <Pill>
            Интервал: {interval.from}-{interval.to} см⁻¹
          </Pill>
        }
      >
        Результаты расчёта
      </PanelTitle>

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

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[13px] text-muted">Равномерность покрытия</span>
        <span
          className={cn(
            'relative shrink-0 rounded-mark border-2 px-3 py-1.5 font-mono text-[12.5px]',
            'font-bold uppercase tracking-[.08em] [transform:rotate(-3deg)]',
            category.classes,
          )}
        >
          <span className="pointer-events-none absolute inset-[3px] rounded-sm border border-current opacity-50" />
          {category.glyph} {stats.categoryLabel}
        </span>
      </div>
    </Panel>
  );
}
