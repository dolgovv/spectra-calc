import { ERROR_COLOR, OK_COLOR } from "../palette";
import type { CalculationStatus } from "../types";

const STATUS: Record<CalculationStatus, { glyph: string; label: string; color: string }> = {
  ok: { glyph: "✓", label: "успешно", color: OK_COLOR },
  error: { glyph: "✕", label: "ошибка", color: ERROR_COLOR },
  running: { glyph: "…", label: "в работе", color: "#B0AEA8" },
};

/** Status never rides on colour alone: a glyph and a word, the colour only on the mark. */
export function CalculationStatusChip({ status }: { status: CalculationStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12px] text-foreground">
      <span aria-hidden style={{ color: s.color }}>
        {s.glyph}
      </span>
      {s.label}
    </span>
  );
}

/** The HTTP code itself is the label; the dot says which class it falls in at a glance. */
export function HttpStatusChip({ status }: { status: number }) {
  const color = status >= 500 ? ERROR_COLOR : status >= 400 ? "#F2A600" : status >= 300 ? "#726F6A" : OK_COLOR;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-foreground">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}
