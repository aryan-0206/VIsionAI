// ============================================================
// VisionAI Phase 7C — Timeline Page
// ============================================================
import { Activity } from 'lucide-react';
import { Timeline } from '../panels/Timeline';
import { useVisionStore } from '../../store/useVisionStore';
import { Badge } from '../ui/Badge';
import { Card, CardBody } from '../ui/Card';
import { format } from 'date-fns';

function TimelineSummary() {
  const events = useVisionStore((s) => s.events);
  const last5min = events.filter((e) => Date.now() - e.timestamp < 5 * 60 * 1000);
  const byObject = last5min.reduce<Record<string, number>>((acc, e) => {
    acc[e.object] = (acc[e.object] ?? 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(byObject).sort(([, a], [, b]) => b - a).slice(0, 5);

  return (
    <Card glass>
      <CardBody className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last 5 Minutes</p>
        {sorted.length === 0 ? (
          <p className="text-xs text-slate-500">No recent activity</p>
        ) : (
          <div className="space-y-1.5">
            {sorted.map(([label, count]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs capitalize text-slate-300">{label}</span>
                <Badge variant="neutral">{count}</Badge>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div className="border-t border-slate-700/50 pt-2">
            <p className="text-[10px] text-slate-500">
              First event: {format(events[events.length - 1].timestamp, 'HH:mm:ss')}
            </p>
            <p className="text-[10px] text-slate-500">
              Latest event: {format(events[0].timestamp, 'HH:mm:ss')}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function TimelinePage() {
  const events = useVisionStore((s) => s.events);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/30">
            <Activity className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100">Detection Timeline</h1>
            <p className="text-[11px] text-slate-400">Chronological view — newest first</p>
          </div>
        </div>
        <Badge variant="purple">{events.length} events</Badge>
      </div>

      {/* Content */}
      <div className="grid flex-1 gap-4 lg:grid-cols-4 min-h-0 overflow-hidden">
        {/* Sidebar summary */}
        <div className="space-y-3 lg:col-span-1">
          <TimelineSummary />
        </div>

        {/* Timeline */}
        <div className="lg:col-span-3 min-h-0 overflow-hidden">
          <Timeline />
        </div>
      </div>
    </div>
  );
}
