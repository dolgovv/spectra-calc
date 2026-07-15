import { useState } from 'react';
import type { SpectrumInterval } from '../../../types/spectra';
import { cn } from '../../../lib/cn';

export interface IntervalSliderProps {
  min: number;
  max: number;
  step?: number;
  minGap?: number;
  value: SpectrumInterval;
  onChange: (value: SpectrumInterval) => void;
}

export default function IntervalSlider({
  min,
  max,
  step = 1,
  minGap = 1,
  value,
  onChange,
}: IntervalSliderProps) {
  const [activeThumb, setActiveThumb] = useState<'from' | 'to'>('to');

  const fromPercent = ((value.from - min) / (max - min)) * 100;
  const toPercent = ((value.to - min) / (max - min)) * 100;

  function handleFromChange(next: number) {
    const clamped = Math.min(next, value.to - minGap);
    onChange({ from: clamped, to: value.to });
  }

  function handleToChange(next: number) {
    const clamped = Math.max(next, value.from + minGap);
    onChange({ from: value.from, to: clamped });
  }

  return (
    <div className="relative h-5 w-full">
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-surface-2" />
      <div
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${fromPercent}%`, width: `${toPercent - fromPercent}%` }}
      />
      <input
        type="range"
        aria-label="От"
        min={min}
        max={max}
        step={step}
        value={value.from}
        onPointerDown={() => setActiveThumb('from')}
        onChange={(event) => handleFromChange(Number(event.target.value))}
        className={cn(
          'range-thumb absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md',
          '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent',
        )}
        style={{ zIndex: activeThumb === 'from' ? 4 : 3 }}
      />
      <input
        type="range"
        aria-label="До"
        min={min}
        max={max}
        step={step}
        value={value.to}
        onPointerDown={() => setActiveThumb('to')}
        onChange={(event) => handleToChange(Number(event.target.value))}
        className={cn(
          'range-thumb absolute inset-0 h-5 w-full cursor-pointer appearance-none bg-transparent',
          '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-md',
          '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent',
        )}
        style={{ zIndex: activeThumb === 'to' ? 4 : 3 }}
      />
    </div>
  );
}
