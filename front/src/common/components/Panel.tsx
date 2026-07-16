import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * The surface every block of the UI sits on: flat ink-black, hairline border, film grain on top.
 * Deliberately flat — no gradient wash — so panels read as printed cards rather than glass.
 */
export default function Panel({ children, className }: PanelProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-panel border border-border bg-surface',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-noise opacity-10 mix-blend-overlay"
        style={{ backgroundSize: '140px 140px' }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
