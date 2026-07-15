import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface BadgeProps {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'accent' | 'muted';
  className?: string;
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border border-border bg-surface-2 text-foreground',
  accent: 'border border-accent/30 bg-accent/10 text-accent',
  muted: 'border border-border bg-transparent text-muted',
};

export default function Badge({ children, icon, tone = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
