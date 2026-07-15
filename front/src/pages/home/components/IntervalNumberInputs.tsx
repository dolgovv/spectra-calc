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

export default function IntervalNumberInputs({
  min,
  max,
  minGap = 1,
  value,
  onChange,
}: IntervalNumberInputsProps) {
  function handleFromBlur(raw: string) {
    const parsed = clamp(Number(raw) || min, min, value.to - minGap);
    onChange({ from: parsed, to: value.to });
  }

  function handleToBlur(raw: string) {
    const parsed = clamp(Number(raw) || max, value.from + minGap, max);
    onChange({ from: value.from, to: parsed });
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <label className="block">
        <span className="mb-2 block text-sm text-muted">От</span>
        <div className="flex items-center rounded-xl border border-border bg-surface-2 px-4 py-3">
          <input
            type="number"
            defaultValue={value.from}
            key={value.from}
            onBlur={(event) => handleFromBlur(event.target.value)}
            className="w-full bg-transparent text-foreground outline-none"
          />
          <span className="text-sm text-muted">см⁻¹</span>
        </div>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm text-muted">До</span>
        <div className="flex items-center rounded-xl border border-border bg-surface-2 px-4 py-3">
          <input
            type="number"
            defaultValue={value.to}
            key={value.to}
            onBlur={(event) => handleToBlur(event.target.value)}
            className="w-full bg-transparent text-foreground outline-none"
          />
          <span className="text-sm text-muted">см⁻¹</span>
        </div>
      </label>
    </div>
  );
}
