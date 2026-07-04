import { cn } from '../../utils/cn';

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  info:    'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  danger:  'bg-red-500/15 text-red-300 border border-red-500/30',
  neutral: 'bg-slate-500/15 text-slate-300 border border-slate-500/30',
  purple:  'bg-violet-500/15 text-violet-300 border border-violet-500/30',
};

const dotColors: Record<BadgeVariant, string> = {
  info:    'bg-blue-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger:  'bg-red-400',
  neutral: 'bg-slate-400',
  purple:  'bg-violet-400',
};

export function Badge({ variant = 'neutral', children, className, dot, pulse }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                dotColors[variant]
              )}
            />
          )}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
}
