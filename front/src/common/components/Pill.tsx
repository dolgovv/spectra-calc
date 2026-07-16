import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface PillProps {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Small monospace capsule used for metadata badges ("10 × 10 точек", "Интервал: 580-650 см⁻¹"). */
export default function Pill({ children, icon, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border',
        'bg-surface-2 px-2.5 py-[5px] font-mono text-[11.5px] text-muted',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
