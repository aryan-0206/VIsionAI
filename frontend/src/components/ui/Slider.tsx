import { cn } from '../../utils/cn';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  color?: 'violet' | 'blue' | 'green' | 'amber';
  className?: string;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit,
  color = 'violet',
  className,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  const trackColor = {
    violet: '#7c3aed',
    blue:   '#3b82f6',
    green:  '#10b981',
    amber:  '#f59e0b',
  }[color];

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">{label}</span>
          <span className="text-xs font-semibold text-slate-200">
            {value}{unit}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${pct}%, #334155 ${pct}%, #334155 100%)`,
        }}
      />
    </div>
  );
}
