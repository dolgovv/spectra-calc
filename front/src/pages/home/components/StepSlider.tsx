export interface StepSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

/** Single-handle slider for the heatmap's spatial axis step (µm). */
export default function StepSlider({ min, max, step = 10, value, onChange }: StepSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="mt-[26px]">
      <input
        type="range"
        aria-label="Шаг сетки"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="step-slider-input w-full"
        style={{ '--fill': `${percent}%` } as React.CSSProperties}
      />
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-muted-faint">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
