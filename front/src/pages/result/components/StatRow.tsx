export interface StatRowProps {
  label: string;
  value: string;
  unit?: string;
}

export default function StatRow({ label, value, unit }: StatRowProps) {
  return (
    <div className="flex items-baseline justify-between border-b border-border py-4 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-lg font-semibold">
        {value} {unit && <span className="text-sm font-normal text-muted">{unit}</span>}
      </span>
    </div>
  );
}
