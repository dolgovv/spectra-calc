import { useMemo, useState } from "react";
import type { SpectrumInterval } from "../../../types/spectra";

export interface IntervalRulerProps {
  min: number;
  max: number;
  step?: number;
  minGap?: number;
  value: SpectrumInterval;
  onChange: (value: SpectrumInterval) => void;
}

/** Ticks every 50 cm⁻¹; every 400 cm⁻¹ is drawn taller and brighter. */
const TICK_STEP = 50;
const MAJOR_STEP = 400;
/** Ticks are laid out in a fixed 1000-unit viewBox stretched to the element width. */
const VIEWBOX_WIDTH = 1000;

function Flag({ percent }: { percent: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-accent"
      style={{ left: `${percent}%` }}
    >
      <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-surface bg-accent" />
    </div>
  );
}

/** Dual-handle interval picker drawn as a measuring rule with a highlighted band. */
export default function IntervalRuler({
  min,
  max,
  step = 1,
  minGap = 1,
  value,
  onChange,
}: IntervalRulerProps) {
  const [activeThumb, setActiveThumb] = useState<"from" | "to">("to");

  const percent = (v: number) => ((v - min) / (max - min)) * 100;
  const fromPercent = percent(value.from);
  const toPercent = percent(value.to);

  const ticks = useMemo(() => {
    const out: Array<{ v: number; x: number; major: boolean }> = [];
    for (let v = min; v <= max; v += TICK_STEP) {
      out.push({
        v,
        x: ((v - min) / (max - min)) * VIEWBOX_WIDTH,
        major: v % MAJOR_STEP === 0,
      });
    }
    return out;
  }, [min, max]);

  const inputClasses = "ruler-input absolute inset-x-0 bottom-0 h-9 w-full";

  return (
    <div className="relative mb-2 mt-[26px] h-14">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} 36`}
        preserveAspectRatio="none"
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-9 w-full"
      >
        {ticks.map((tick) => (
          <line
            key={tick.v}
            x1={tick.x}
            y1={tick.major ? 8 : 16}
            x2={tick.x}
            y2={30}
            className={tick.major ? "stroke-muted" : "stroke-muted-faint"}
            strokeWidth={tick.major ? 1.2 : 1}
          />
        ))}
        <line
          x1={0}
          y1={30}
          x2={VIEWBOX_WIDTH}
          y2={30}
          className="stroke-border"
          strokeWidth={1}
        />
      </svg>

      <div
        className="pointer-events-none absolute bottom-0 h-9 border-y-2 border-accent bg-accent-dim opacity-85"
        style={{
          left: `${fromPercent}%`,
          width: `${toPercent - fromPercent}%`,
        }}
      />
      <Flag percent={fromPercent} />
      <Flag percent={toPercent} />

      <input
        type="range"
        aria-label="От"
        min={min}
        max={max}
        step={step}
        value={value.from}
        onPointerDown={() => setActiveThumb("from")}
        onChange={(event) =>
          onChange({
            from: Math.min(Number(event.target.value), value.to - minGap),
            to: value.to,
          })
        }
        className={inputClasses}
        style={{ zIndex: activeThumb === "from" ? 4 : 3 }}
      />
      <input
        type="range"
        aria-label="До"
        min={min}
        max={max}
        step={step}
        value={value.to}
        onPointerDown={() => setActiveThumb("to")}
        onChange={(event) =>
          onChange({
            from: value.from,
            to: Math.max(Number(event.target.value), value.from + minGap),
          })
        }
        className={inputClasses}
        style={{ zIndex: activeThumb === "to" ? 4 : 3 }}
      />
    </div>
  );
}
