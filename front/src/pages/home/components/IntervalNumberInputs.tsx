import type { SpectrumInterval } from '../../../types/spectra';

export interface IntervalNumberInputsProps {
  min: number;
  max: number;
  minGap?: number;
  value: SpectrumInterval;
  onChange: (value: SpectrumInterval) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Bordered readout well — caption above, accent value and unit inside. */
function Readout({
  caption,
  value,
  onCommit,
}: {
  caption: string;
  value: number;
  onCommit: (raw: string) => void;
}) {
  return (
    <label className="block rounded-md border border-border px-3.5 py-3">
      <span className="mb-2 block text-[11px] uppercase tracking-[.06em] text-muted-faint">
        {caption}
      </span>
      <span className="flex items-baseline justify-between gap-2 rounded border border-border bg-surface-2 px-2.5 py-2">
        <input
          type="number"
          // Remount on external change (ruler drag) so the uncommitted draft is replaced.
          key={value}
          defaultValue={value}
          onBlur={(event) => onCommit(event.target.value)}
          className="readout-input w-full bg-transparent font-mono text-lg font-semibold text-accent outline-none"
        />
        <span className="font-mono text-[11px] text-muted-faint">см⁻¹</span>
      </span>
    </label>
  );
}

export default function IntervalNumberInputs({
  min,
  max,
  minGap = 1,
  value,
  onChange,
}: IntervalNumberInputsProps) {
  return (
    <div className="mt-[26px] grid grid-cols-1 gap-3.5 sm:grid-cols-2">
      <Readout
        caption="От"
        value={value.from}
        onCommit={(raw) =>
          onChange({ from: clamp(Number(raw) || min, min, value.to - minGap), to: value.to })
        }
      />
      <Readout
        caption="До"
        value={value.to}
        onCommit={(raw) =>
          onChange({ from: value.from, to: clamp(Number(raw) || max, value.from + minGap, max) })
        }
      />
    </div>
  );
}
