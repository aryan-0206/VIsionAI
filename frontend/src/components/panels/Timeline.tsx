// ============================================================
// VisionAI Phase 7C — Detection Timeline Panel
// ============================================================
import { Activity, AlertTriangle, CheckCircle2, Info, XOctagon, MapPin, Camera } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '../../utils/cn';
import { useVisionStore } from '../../store/useVisionStore';
import { Card, CardHeader, CardBody } from '../ui/Card';
import type { EventLogEntry, AlertSeverity } from '../../types';

const severityConfig: Record<AlertSeverity, {
  icon: React.ReactNode;
  dot: string;
  border: string;
  bg: string;
  label: string;
}> = {
  info: {
    icon: <Info className="h-3.5 w-3.5 text-blue-400" />,
    dot: 'bg-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/8',
    label: 'text-blue-300',
  },
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    dot: 'bg-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/8',
    label: 'text-emerald-300',
  },
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    dot: 'bg-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/8',
    label: 'text-amber-300',
  },
  danger: {
    icon: <XOctagon className="h-3.5 w-3.5 text-red-400" />,
    dot: 'bg-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/8',
    label: 'text-red-300',
  },
};

interface TimelineItemProps {
  entry: EventLogEntry;
  isFirst: boolean;
  isLast: boolean;
}

function TimelineItem({ entry, isFirst, isLast }: TimelineItemProps) {
  const cfg = severityConfig[entry.severity];

  return (
    <div className="relative flex gap-3">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-gradient-to-b from-slate-600/50 to-transparent" />
      )}

      {/* Dot */}
      <div className="relative z-10 mt-1 flex-shrink-0">
        <div className={cn('h-3.5 w-3.5 rounded-full border-2 border-slate-800', cfg.dot)} />
        {isFirst && (
          <div className={cn('absolute inset-0 rounded-full animate-ping opacity-60', cfg.dot)} />
        )}
      </div>

      {/* Card */}
      <div
        className={cn(
          'mb-3 flex-1 rounded-lg border p-3 transition-all',
          cfg.border, cfg.bg,
          isFirst && 'ring-1 ring-offset-0',
          isFirst && cfg.border
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {cfg.icon}
            <span className={cn('text-xs font-bold capitalize', cfg.label)}>
              {entry.eventType === 'intrusion' ? '🚨 ' : ''}
              {entry.object}
            </span>
            {entry.trackId !== undefined && (
              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                #{entry.trackId}
              </span>
            )}
          </div>
          <span
            className={cn(
              'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
              entry.confidence >= 0.9 ? 'bg-emerald-500/20 text-emerald-300' :
              entry.confidence >= 0.7 ? 'bg-amber-500/20 text-amber-300' :
              'bg-red-500/20 text-red-300'
            )}
          >
            {Math.round(entry.confidence * 100)}%
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
          {entry.zone && (
            <span className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 text-amber-400" />
              {entry.zone}
            </span>
          )}
          {entry.camera && (
            <span className="flex items-center gap-1">
              <Camera className="h-2.5 w-2.5 text-slate-500" />
              {entry.camera}
            </span>
          )}
          {entry.ruleMatched && (
            <span className="text-violet-400">⚡ {entry.ruleMatched}</span>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-mono">{format(entry.timestamp, 'HH:mm:ss.SSS')}</span>
          <span title={format(entry.timestamp, 'PPpp')}>
            {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Timeline() {
  const events = useVisionStore((s) => s.events);
  const recent = events.slice(0, 30);

  return (
    <Card glass className="flex flex-col h-full">
      <CardHeader
        action={
          <span className="text-[10px] text-slate-500">{recent.length} recent</span>
        }
      >
        <Activity className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-slate-200">Timeline</span>
      </CardHeader>

      <CardBody className="flex-1 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2">
            <Activity className="h-8 w-8 opacity-30" />
            <p className="text-xs">Waiting for detections…</p>
          </div>
        ) : (
          <div className="space-y-0">
            {recent.map((entry, i) => (
              <TimelineItem
                key={entry.id}
                entry={entry}
                isFirst={i === 0}
                isLast={i === recent.length - 1}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
