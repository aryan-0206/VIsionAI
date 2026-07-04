import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  color?: 'blue' | 'green' | 'violet' | 'amber';
}

const colorMap = {
  blue:   'bg-blue-500',
  green:  'bg-emerald-500',
  violet: 'bg-violet-500',
  amber:  'bg-amber-500',
};

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = 'md',
  color = 'violet',
}: ToggleProps) {
  const w = size === 'sm' ? 'w-9' : 'w-11';
  const h = size === 'sm' ? 'h-5' : 'h-6';
  const dot = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <label className={cn('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={cn(
            'rounded-full transition-colors duration-200',
            w, h,
            checked ? colorMap[color] : 'bg-slate-600'
          )}
        />
        <div
          className={cn(
            'absolute left-0.5 top-0.5 rounded-full bg-white shadow transition-transform duration-200',
            dot,
            checked ? translate : 'translate-x-0'
          )}
        />
      </div>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-slate-200">{label}</p>}
          {description && <p className="text-xs text-slate-400">{description}</p>}
        </div>
      )}
    </label>
  );
}
