// ============================================================
// VisionAI Phase 7C — Event Log Page
// ============================================================
import { List, Activity } from 'lucide-react';
import { EventLog } from '../panels/EventLog';
import { Timeline } from '../panels/Timeline';

export function EventLogPage() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700/40 border border-slate-600/30">
          <List className="h-4 w-4 text-slate-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">Event Log</h1>
          <p className="text-[11px] text-slate-400">Searchable history of all detection events (latest 200)</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid flex-1 gap-4 lg:grid-cols-3 min-h-0 overflow-hidden">
        <div className="lg:col-span-2 min-h-0 overflow-hidden">
          <EventLog />
        </div>
        <div className="min-h-0 overflow-hidden">
          <Timeline />
        </div>
      </div>
    </div>
  );
}

// Suppress unused import warning
const _Activity = Activity;
void _Activity;
