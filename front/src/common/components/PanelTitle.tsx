import type { ReactNode } from 'react';

export interface PanelTitleProps {
  children: ReactNode;
  /** Right-hand slot: the "01 / архив" step index on Home, a Pill on the result page. */
  right?: ReactNode;
}

export default function PanelTitle({ children, right }: PanelTitleProps) {
  return (
    <div className="mb-[18px] flex items-center justify-between gap-3">
      <h2 className="font-display text-[15px] font-semibold">{children}</h2>
      {right}
    </div>
  );
}

/** Monospace step marker shown at the right of a panel title, e.g. "01 / архив". */
export function PanelIndex({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] font-normal text-muted-faint">{children}</span>;
}
