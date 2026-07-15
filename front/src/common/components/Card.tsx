import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface', className)}>
      {children}
    </div>
  );
}
