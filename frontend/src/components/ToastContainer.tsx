// ============================================================
// VisionAI Phase 7C — Toast Notification Container
// ============================================================
import { useEffect, useRef } from 'react';
import {
  AlertTriangle, CheckCircle2, Info, XOctagon, X,
  MapPin, Tag, Activity, Clock,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useVisionStore } from '../store/useVisionStore';
import type { ToastNotification, NotificationStyle } from '../types';
import { format } from 'date-fns';

// -----------------------------------------------------------
// Style config
// -----------------------------------------------------------
const styleConfig: Record<
  NotificationStyle,
  {
    border: string;
    bg: string;
    iconBg: string;
    icon: React.ReactNode;
    bar: string;
    title: string;
  }
> = {
  info: {
    border: 'border-blue-500/40',
    bg: 'bg-slate-800/95',
    iconBg: 'bg-blue-500/20',
    icon: <Info className="h-4 w-4 text-blue-400" />,
    bar: 'bg-blue-500',
    title: 'text-blue-300',
  },
  success: {
    border: 'border-emerald-500/40',
    bg: 'bg-slate-800/95',
    iconBg: 'bg-emerald-500/20',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    bar: 'bg-emerald-500',
    title: 'text-emerald-300',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-slate-800/95',
    iconBg: 'bg-amber-500/20',
    icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    bar: 'bg-amber-500',
    title: 'text-amber-300',
  },
  danger: {
    border: 'border-red-500/40',
    bg: 'bg-slate-800/95',
    iconBg: 'bg-red-500/20',
    icon: <XOctagon className="h-4 w-4 text-red-400" />,
    bar: 'bg-red-500',
    title: 'text-red-300',
  },
};

// -----------------------------------------------------------
// Single Toast Item
// -----------------------------------------------------------
function ToastItem({ toast }: { toast: ToastNotification }) {
  const dismiss = useVisionStore((s) => s.dismissToast);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const duration = toast.duration ?? 5000;
  const cfg = styleConfig[toast.style];
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => dismiss(toast.id), duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, duration, dismiss]);

  const confidence = Math.round(toast.confidence * 100);

  return (
    <div
      className={cn(
        'relative flex w-80 overflow-hidden rounded-xl border backdrop-blur-sm shadow-2xl',
        'animate-in slide-in-from-right-4 fade-in duration-300',
        cfg.border, cfg.bg
      )}
    >
      {/* Progress bar */}
      <div
        className={cn('absolute bottom-0 left-0 h-0.5 animate-shrink', cfg.bar)}
        style={{ animationDuration: `${duration}ms` }}
      />

      <div className="flex w-full gap-3 p-3">
        {/* Icon */}
        <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', cfg.iconBg)}>
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className={cn('text-xs font-semibold uppercase tracking-wide', cfg.title)}>
            {toast.title}
          </p>

          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
            <div className="flex items-center gap-1 text-xs text-slate-300">
              <Tag className="h-3 w-3 text-slate-400" />
              <span className="capitalize font-medium">{toast.object}</span>
            </div>

            {toast.trackId !== undefined && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Activity className="h-3 w-3" />
                <span>ID #{toast.trackId}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className={cn(
                'font-semibold',
                confidence >= 90 ? 'text-emerald-400' :
                confidence >= 70 ? 'text-amber-400' : 'text-red-400'
              )}>
                {confidence}%
              </span>
              <span>conf.</span>
            </div>

            {toast.zone && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{toast.zone}</span>
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500">
            <Clock className="h-2.5 w-2.5" />
            <span>{format(toast.timestamp, 'HH:mm:ss')}</span>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => dismiss(toast.id)}
          className="flex-shrink-0 self-start rounded-lg p-1 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Container
// -----------------------------------------------------------
export function ToastContainer() {
  const toasts = useVisionStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
