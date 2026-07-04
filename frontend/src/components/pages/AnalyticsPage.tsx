// ============================================================
// VisionAI Phase 7C — Analytics Page
// ============================================================
import { BarChart2, TrendingUp, Target, Clock, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { useVisionStore } from '../../store/useVisionStore';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { format, startOfHour, eachHourOfInterval, subHours } from 'date-fns';
import type { AlertSeverity } from '../../types';

// Simple bar chart component
function BarChart({ data, maxValue, color }: {
  data: { label: string; value: number }[];
  maxValue: number;
  color: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-xs text-slate-500">
        No data available
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((item, i) => {
        const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] text-slate-500">{item.value > 0 ? item.value : ''}</span>
            <div
              className={`w-full rounded-t transition-all ${color}`}
              style={{ height: `${Math.max(pct, item.value > 0 ? 8 : 2)}%` }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="text-[8px] text-slate-600 truncate max-w-full">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// Donut-style stat
function StatRing({ value, max, label, color }: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} className="fill-none stroke-slate-700" strokeWidth="5" />
          <circle
            cx="32" cy="32" r={radius}
            className={`fill-none ${color} transition-all duration-500`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-200">{value}</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export function AnalyticsPage() {
  const events = useVisionStore((s) => s.events);
  const alertPanel = useVisionStore((s) => s.alertPanel);

  // Last 6 hours timeline
  const hourlyData = useMemo(() => {
    const now = new Date();
    const start = subHours(now, 5);
    const hours = eachHourOfInterval({ start: startOfHour(start), end: startOfHour(now) });

    return hours.map((h) => ({
      label: format(h, 'HH:mm'),
      value: events.filter((e) => {
        const d = new Date(e.timestamp);
        return d >= h && d < new Date(h.getTime() + 3600000);
      }).length,
    }));
  }, [events]);

  // By object label
  const byLabel = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => { map[e.object] = (map[e.object] ?? 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  }, [events]);

  // By severity
  const bySeverity = useMemo(() => {
    const map: Record<AlertSeverity, number> = { info: 0, success: 0, warning: 0, danger: 0 };
    events.forEach((e) => { map[e.severity] = (map[e.severity] ?? 0) + 1; });
    return map;
  }, [events]);

  // By zone
  const byZone = useMemo(() => {
    const map: Record<string, number> = {};
    events.filter((e) => e.zone).forEach((e) => {
      map[e.zone!] = (map[e.zone!] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
  }, [events]);

  const totalEvents = events.length;
  const intrusions = events.filter((e) => e.eventType === 'intrusion').length;
  const avgConfidence = events.length > 0
    ? Math.round((events.reduce((acc, e) => acc + e.confidence, 0) / events.length) * 100)
    : 0;

  const maxHourly = Math.max(...hourlyData.map((d) => d.value), 1);
  const maxLabel = Math.max(...byLabel.map((d) => d.value), 1);
  const maxZone = Math.max(...byZone.map((d) => d.value), 1);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30">
          <BarChart2 className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">Analytics</h1>
          <p className="text-[11px] text-slate-400">Detection statistics and event insights</p>
        </div>
      </div>

      {/* Ring Stats */}
      <Card glass>
        <CardBody>
          <div className="flex items-center justify-around flex-wrap gap-4">
            <StatRing value={totalEvents} max={200} label="Total Events" color="stroke-violet-500" />
            <StatRing value={alertPanel.alertCount} max={200} label="Total Alerts" color="stroke-amber-500" />
            <StatRing value={intrusions} max={50} label="Intrusions" color="stroke-red-500" />
            <StatRing value={avgConfidence} max={100} label="Avg Conf %" color="stroke-emerald-500" />
            <StatRing value={bySeverity.danger} max={totalEvents || 1} label="Danger Events" color="stroke-red-400" />
            <StatRing value={bySeverity.warning} max={totalEvents || 1} label="Warnings" color="stroke-amber-400" />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hourly Activity */}
        <Card glass>
          <CardHeader action={<Badge variant="neutral">6h</Badge>}>
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">Hourly Activity</span>
          </CardHeader>
          <CardBody>
            <BarChart data={hourlyData} maxValue={maxHourly} color="bg-violet-500/70" />
          </CardBody>
        </Card>

        {/* By Object */}
        <Card glass>
          <CardHeader action={<Badge variant="neutral">top 8</Badge>}>
            <Target className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">By Object Type</span>
          </CardHeader>
          <CardBody>
            <BarChart data={byLabel} maxValue={maxLabel} color="bg-blue-500/70" />
          </CardBody>
        </Card>

        {/* By Zone */}
        <Card glass>
          <CardHeader>
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">By Zone</span>
          </CardHeader>
          <CardBody>
            {byZone.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No zone data yet</p>
            ) : (
              <BarChart data={byZone} maxValue={maxZone} color="bg-amber-500/70" />
            )}
          </CardBody>
        </Card>

        {/* Severity Breakdown */}
        <Card glass>
          <CardHeader>
            <AlertTriangle className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">Severity Breakdown</span>
          </CardHeader>
          <CardBody className="space-y-2">
            {([
              { key: 'danger',  label: 'Danger',  color: 'bg-red-500',     text: 'text-red-400' },
              { key: 'warning', label: 'Warning', color: 'bg-amber-500',   text: 'text-amber-400' },
              { key: 'success', label: 'Success', color: 'bg-emerald-500', text: 'text-emerald-400' },
              { key: 'info',    label: 'Info',    color: 'bg-blue-500',    text: 'text-blue-400' },
            ] as const).map((s) => {
              const count = bySeverity[s.key];
              const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
              return (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${s.text}`}>{s.label}</span>
                    <span className="text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
