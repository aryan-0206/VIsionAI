import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  glow?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'none';
}

const glowColors = {
  blue:   'shadow-blue-500/10',
  green:  'shadow-emerald-500/10',
  amber:  'shadow-amber-500/10',
  red:    'shadow-red-500/10',
  purple: 'shadow-violet-500/10',
  none:   '',
};

export function Card({ children, className, glass, glow = 'none' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700/50 bg-slate-800/60 shadow-lg',
        glass && 'backdrop-blur-sm',
        glow !== 'none' && `shadow-xl ${glowColors[glow]}`,
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-slate-700/50 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}
