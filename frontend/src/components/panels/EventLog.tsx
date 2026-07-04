// ============================================================
// VisionAI Phase 7C — Event Log Panel
// ============================================================
import { useState, useMemo } from 'react';
import { List, Search, Trash2, Download, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../utils/cn';
import { useVisionStore } from '../../store/useVisionStore';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AlertSeverity, EventType } from '../../types';

const severityColors: Record<AlertSeverity, string> = {
  info:    'text-blue-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger:  'text-red-400',
};

const eventTypeBadge: Record<EventType, { label: string; variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' }> = {
  detection:  { label: 'DETECT',    variant: 'info' },
  intrusion:  { label: 'INTRUSION', variant: 'danger' },
  tracking:   { label: 'TRACK',     variant: 'purple' },
  screenshot: { label: 'SCREENSHT', variant: 'neutral' },
  voice:      { label: 'VOICE',     variant: 'success' },
  zone_entry: { label: 'ZONE IN',   variant: 'warning' },
  zone_exit:  { label: 'ZONE OUT',  variant: 'neutral' },
};

export function EventLog() {
  const { events, clearEvents, searchQuery, setSearchQuery } = useVisionStore();
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');

  const filtered = useMemo(() => {
    let result = events;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.object.toLowerCase().includes(q) ||
          e.zone?.toLowerCase().includes(q) ||
          e.camera?.toLowerCase().includes(q) ||
          e.ruleMatched?.toLowerCase().includes(q) ||
          String(e.trackId ?? '').includes(q)
      );
    }
    if (filterType !== 'all') {
      result = result.filter((e) => e.eventType === filterType);
    }
    if (filterSeverity !== 'all') {
      result = result.filter((e) => e.severity === filterSeverity);
    }
    return result;
  }, [events, searchQuery, filterType, filterSeverity]);

  function handleExport() {
    const csv = [
      'Timestamp,Object,TrackID,Confidence,Zone,EventType,Camera,Severity,RuleMatched',
      ...filtered.map((e) =>
        [
          format(e.timestamp, 'yyyy-MM-dd HH:mm:ss'),
          e.object,
          e.trackId ?? '',
          Math.round(e.confidence * 100) + '%',
          e.zone ?? '',
          e.eventType,
          e.camera ?? '',
          e.severity,
          e.ruleMatched ?? '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visionai_events_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card glass className="flex flex-col h-full">
      <CardHeader
        action={
          <div className="flex items-center gap-1.5">
            <Badge variant="neutral">{filtered.length} / {events.length}</Badge>
            <Button size="xs" variant="ghost" icon={<Download className="h-3 w-3" />} onClick={handleExport}>
              Export
            </Button>
            <Button size="xs" variant="danger" icon={<Trash2 className="h-3 w-3" />} onClick={clearEvents}>
              Clear
            </Button>
          </div>
        }
      >
        <List className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-200">Event Log</span>
      </CardHeader>

      {/* Search & Filters */}
      <div className="flex flex-col gap-2 border-b border-slate-700/50 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search object, zone, camera, rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700/50 bg-slate-800/60 py-1.5 pl-8 pr-8 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3 w-3 text-slate-500 flex-shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'detection', 'intrusion', 'zone_entry'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition',
                  filterType === t
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
                )}
              >
                {t === 'all' ? 'All Types' : t.replace('_', ' ')}
              </button>
            ))}
            <div className="h-3.5 w-px bg-slate-700 self-center" />
            {(['all', 'danger', 'warning', 'info'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSeverity(s)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition',
                  filterSeverity === s
                    ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
                )}
              >
                {s === 'all' ? 'All Severity' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2">
            <List className="h-8 w-8 opacity-30" />
            <p className="text-xs">No events recorded yet</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-sm">
              <tr className="border-b border-slate-700/50">
                {['Time', 'Object', 'Track', 'Confidence', 'Zone', 'Type', 'Camera'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr
                  key={e.id}
                  className={cn(
                    'border-b border-slate-700/20 transition-colors hover:bg-slate-800/40',
                    i === 0 && 'bg-slate-800/20'
                  )}
                >
                  <td className="px-3 py-1.5 font-mono text-slate-400 whitespace-nowrap">
                    {format(e.timestamp, 'HH:mm:ss')}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={cn('font-semibold capitalize', severityColors[e.severity])}>
                      {e.object}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-400">
                    {e.trackId !== undefined ? `#${e.trackId}` : '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={cn(
                      'font-semibold',
                      e.confidence >= 0.9 ? 'text-emerald-400' :
                      e.confidence >= 0.7 ? 'text-amber-400' : 'text-red-400'
                    )}>
                      {Math.round(e.confidence * 100)}%
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-400 max-w-[80px] truncate">
                    {e.zone ?? '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <Badge variant={eventTypeBadge[e.eventType]?.variant ?? 'neutral'} className="text-[9px]">
                      {eventTypeBadge[e.eventType]?.label ?? e.eventType}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">
                    {e.camera ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
