export interface GradientColorsPickerProps {
  colorLow: string;
  colorMidLow: string;
  colorMidHigh: string;
  colorHigh: string;
  onColorLowChange: (hex: string) => void;
  onColorMidLowChange: (hex: string) => void;
  onColorMidHighChange: (hex: string) => void;
  onColorHighChange: (hex: string) => void;
}

function Swatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-border px-3.5 py-3">
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] uppercase tracking-[.06em] text-muted-faint">{label}</span>
        <span className="font-mono text-[12.5px] uppercase text-foreground">{value}</span>
      </span>
    </label>
  );
}

function previewGradientCss(colors: string[]): string {
  const stops = colors.map((hex, i) => `${hex} ${((i / (colors.length - 1)) * 100).toFixed(0)}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/** Lets the user set all four gradient stop colours (0/33/67/100% of intensity). */
export default function GradientColorsPicker({
  colorLow,
  colorMidLow,
  colorMidHigh,
  colorHigh,
  onColorLowChange,
  onColorMidLowChange,
  onColorMidHighChange,
  onColorHighChange,
}: GradientColorsPickerProps) {
  return (
    <div className="mt-[26px]">
      <div className="grid grid-cols-2 gap-3">
        <Swatch label="0%" value={colorLow} onChange={onColorLowChange} />
        <Swatch label="33%" value={colorMidLow} onChange={onColorMidLowChange} />
        <Swatch label="67%" value={colorMidHigh} onChange={onColorMidHighChange} />
        <Swatch label="100%" value={colorHigh} onChange={onColorHighChange} />
      </div>
      <div
        className="mt-3 h-3 w-full rounded-full border border-border"
        style={{ backgroundImage: previewGradientCss([colorLow, colorMidLow, colorMidHigh, colorHigh]) }}
      />
    </div>
  );
}
