import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * ink     — solid paper-white key button ("Выбрать файл")
   * ghost   — outlined, for secondary navigation ("Пример результата →")
   * primary — accent fill ("Скачать PDF-отчёт")
   * cta     — full-width accent submit; greys out when disabled ("Начать расчёт")
   */
  variant?: 'ink' | 'ghost' | 'primary' | 'cta';
  leftIcon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  ink: 'font-mono text-[13px] font-medium px-5 py-2.5 rounded-md border border-foreground bg-foreground text-background hover:bg-white active:scale-[.98]',
  ghost:
    'font-mono text-[13px] font-medium px-5 py-2.5 rounded-md border border-border bg-transparent text-foreground hover:border-foreground active:scale-[.98]',
  primary:
    'font-display text-sm font-semibold px-5 py-[13px] rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover',
  cta: 'w-full font-display text-[15px] font-semibold p-4 rounded-lg bg-accent text-accent-foreground hover:bg-accent-hover disabled:bg-border disabled:text-muted-faint disabled:cursor-not-allowed disabled:hover:bg-border',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ink', leftIcon, loading, disabled, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition',
          variantClasses[variant],
          className,
        )}
        {...rest}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
