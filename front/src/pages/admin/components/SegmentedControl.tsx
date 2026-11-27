import { cn } from "../../../lib/cn";

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A row of mutually exclusive filter presets ("7 дней · 30 дней · 90 дней"). */
export default function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded px-3 py-1.5 font-mono text-[12px] transition",
            option.value === value
              ? "bg-surface-2 text-foreground"
              : "text-muted-faint hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
