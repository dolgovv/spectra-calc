export interface StatRowProps {
  label: string;
  value: string;
  unit?: string;
}

export default function StatRow({ label, value, unit }: StatRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-3.5 last:border-b-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="whitespace-nowrap font-mono text-xl font-semibold text-foreground">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-muted-faint">{unit}</span>}
      </span>
    </div>
  );
}
